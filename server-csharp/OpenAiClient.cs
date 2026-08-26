using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace TutorServer;

public class OpenAiClient
{
    private static readonly Uri OpenAiUrl = new("https://api.openai.com/v1/chat/completions");
    private static readonly Uri OpenRouterUrl = new("https://openrouter.ai/api/v1/chat/completions");
    private readonly HttpClient _http;

    public OpenAiClient(HttpClient http)
    {
        _http = http;
    }

    // OpenRouter model IDs are always "vendor/model[:variant]" (e.g. "z-ai/glm-5.2:free");
    // OpenAI's own model IDs never contain a slash.
    private static bool IsOpenRouterModel(string? model) => model is not null && model.Contains('/');

    public async Task<string> CreateChatCompletionAsync(List<object> messages, string? model)
    {
        var useOpenRouter = IsOpenRouterModel(model);
        var envKeyName = useOpenRouter ? "OPENROUTER_API_KEY" : "OPENAI_API_KEY";
        var apiKey = Environment.GetEnvironmentVariable(envKeyName) ?? "";

        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException($"{envKeyName} is not set on the server");
        }

        var resolvedModel = model ?? Environment.GetEnvironmentVariable("OPENAI_MODEL") ?? "gpt-4o-mini";
        var url = useOpenRouter ? OpenRouterUrl : OpenAiUrl;
        var body = new { model = resolvedModel, messages };

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        if (useOpenRouter)
        {
            request.Headers.Add("HTTP-Referer", "http://localhost:5173");
            request.Headers.Add("X-Title", "Self-Learning Tutor");
        }

        var response = await _http.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var text = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Chat request failed: {(int)response.StatusCode} {text}");
        }

        using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
        return content ?? "";
    }
}
