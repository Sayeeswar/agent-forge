using PrReviewChat.Api.Models;
using PrReviewChat.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ApiKeysOptions>(
    builder.Configuration.GetSection(ApiKeysOptions.SectionName));

builder.Services.AddHttpClient("provider", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

builder.Services.AddSingleton<DotEnvFile>();
builder.Services.AddSingleton<ProviderValidator>();

var corsOrigin = builder.Configuration
    .GetSection(ApiKeysOptions.SectionName)["CorsOrigin"] ?? "http://localhost:5173";

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins(corsOrigin)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();

// ---- GET /api/keys/status -------------------------------------------------
// Re-derives connection state from the .env file on disk so a validated key
// still shows as connected after a restart.
app.MapGet("/api/keys/status", (DotEnvFile dotEnv, ProviderValidator validator) =>
{
    bool Connected(string provider) =>
        validator.TryGetProvider(provider, out var cfg)
        && !string.IsNullOrWhiteSpace(dotEnv.Get(cfg.EnvVar));

    return Results.Ok(new KeyStatusResult(Connected("openai"), Connected("openrouter")));
});

// ---- POST /api/keys/validate -------------------------------------------------
// Runs a real chat-completion call against the provider. Writes the key to
// .env ONLY when that call succeeds.
app.MapPost("/api/keys/validate", async (
    ValidateKeyRequest req,
    ProviderValidator validator,
    DotEnvFile dotEnv,
    ILogger<Program> logger,
    CancellationToken ct) =>
{
    var provider = req.Provider?.Trim().ToLowerInvariant();
    var apiKey = req.ApiKey?.Trim();

    if (string.IsNullOrEmpty(provider) || (provider != "openai" && provider != "openrouter"))
    {
        return Results.BadRequest(new ValidateKeyResult(
            false, provider ?? "", null, null,
            "Provider must be 'openai' or 'openrouter'."));
    }

    if (string.IsNullOrEmpty(apiKey))
    {
        return Results.BadRequest(new ValidateKeyResult(
            false, provider, null, null, "No API key was supplied."));
    }

    var result = await validator.ValidateAsync(provider, apiKey, ct);

    if (result.Ok && validator.TryGetProvider(provider, out var cfg))
    {
        dotEnv.Upsert(cfg.EnvVar, apiKey);
        logger.LogInformation(
            "Validated {Provider} key and wrote {EnvVar} to {Path}",
            provider, cfg.EnvVar, dotEnv.Path);
    }

    // Always 200 — the body's `ok` flag carries pass/fail so the popup can
    // render the transcript either way.
    return Results.Ok(result);
});

app.Run();
