using DotNetEnv;
using TutorServer;

Env.Load();

var port = Environment.GetEnvironmentVariable("PORT") ?? "3001";

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls($"http://localhost:{port}");

builder.Services.AddHttpClient<OpenAiClient>();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();
app.UseCors();

if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("OPENAI_API_KEY")))
{
    Console.WriteLine("Warning: OPENAI_API_KEY not set — OpenAI-model requests will error until you add one to server-csharp/.env");
}
if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("OPENROUTER_API_KEY")))
{
    Console.WriteLine("Warning: OPENROUTER_API_KEY not set — OpenRouter-model requests will error until you add one to server-csharp/.env");
}

app.MapGet("/api/health", () => Results.Ok(new { ok = true }));

app.MapPost("/api/chat", async (ChatRequest req, OpenAiClient client) =>
{
    if (string.IsNullOrEmpty(req.Topic) || string.IsNullOrEmpty(req.Message))
    {
        return Results.BadRequest(new ErrorResponse("topic and message are required"));
    }

    var systemPrompt = new
    {
        role = "system",
        content = TutorContext.BuildTutorContext(req.Topic, req.Subtopic, req.Material, req.Profile),
    };

    var messages = new List<object> { systemPrompt };
    if (req.History is not null)
    {
        foreach (var m in req.History)
        {
            messages.Add(new { role = m.Role, content = m.Content });
        }
    }
    messages.Add(new { role = "user", content = req.Message });

    try
    {
        var reply = await client.CreateChatCompletionAsync(messages, req.Model);
        return Results.Ok(new ChatResponse(reply));
    }
    catch
    {
        return Results.Json(new ErrorResponse("Hmm, couldn't reach the tutor. Try again."), statusCode: 502);
    }
});

app.MapPost("/api/quiz", async (QuizRequest req, OpenAiClient client) =>
{
    if (string.IsNullOrEmpty(req.Topic))
    {
        return Results.BadRequest(new ErrorResponse("topic is required"));
    }

    var who = TutorContext.BuildLearnerClause(req.Profile);
    var userPrompt = $"Give me one quiz question about \"{req.Topic}\"{(string.IsNullOrEmpty(req.Subtopic) ? "" : $", specifically \"{req.Subtopic}\"")}.";
    if (!string.IsNullOrEmpty(who)) userPrompt += $" The student is {who}.";
    if (!string.IsNullOrEmpty(req.Material)) userPrompt += $" Base it on: {req.Material}.";

    var quizSystemPrompt = $"{TutorContext.BaseSystemPrompt}\n\nFor this task, ignore the plain-text response format above and instead output a single multiple-choice quiz question as strict JSON only, no prose, no markdown fences. Shape: {{\"question\": string, \"options\": string[3-4], \"correctIndex\": number}}.";

    var messages = new List<object>
    {
        new { role = "system", content = quizSystemPrompt },
        new { role = "user", content = userPrompt },
    };

    for (var attempt = 0; attempt < 2; attempt++)
    {
        try
        {
            var raw = await client.CreateChatCompletionAsync(messages, req.Model);
            var parsed = QuizParser.TryParse(raw);
            if (parsed is not null) return Results.Ok(parsed);
        }
        catch
        {
            // fall through to retry
        }
    }

    return Results.Json(new ErrorResponse("Hmm, couldn't generate a quiz question. Try again."), statusCode: 502);
});

var fallbackDegrees = new List<string> { "B.Sc", "B.Tech", "B.A.", "M.Sc", "M.Tech", "M.A.", "PhD" };

app.MapPost("/api/degrees", async (DegreesRequest req, OpenAiClient client) =>
{
    if (string.IsNullOrEmpty(req.University))
    {
        return Results.BadRequest(new ErrorResponse("university is required"));
    }

    var degreesSystemPrompt = $"{TutorContext.BaseSystemPrompt}\n\nFor this task, ignore the plain-text response format above and instead output a strict JSON array of 6-10 short degree/program name strings commonly offered at the given university, no prose, no markdown fences. Example: [\"B.Tech\", \"M.Tech\", \"PhD\"]";

    var messages = new List<object>
    {
        new { role = "system", content = degreesSystemPrompt },
        new { role = "user", content = $"List degree programs offered at \"{req.University}\"{(string.IsNullOrEmpty(req.Level) ? "" : $" for a {req.Level} student")}." },
    };

    try
    {
        var raw = await client.CreateChatCompletionAsync(messages, null);
        var degrees = QuizParser.TryParseStringArray(raw);
        return Results.Ok(new DegreesResponse(degrees is { Count: > 0 } ? degrees : fallbackDegrees));
    }
    catch
    {
        return Results.Ok(new DegreesResponse(fallbackDegrees));
    }
});

app.Run();
