using PrReviewChat.Api.Models;
using PrReviewChat.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ApiKeysOptions>(
    builder.Configuration.GetSection(ApiKeysOptions.SectionName));
builder.Services.Configure<GitHubOptions>(
    builder.Configuration.GetSection(GitHubOptions.SectionName));
builder.Services.Configure<AnalysisOptions>(
    builder.Configuration.GetSection(AnalysisOptions.SectionName));
builder.Services.Configure<FileReviewOptions>(
    builder.Configuration.GetSection(FileReviewOptions.SectionName));

builder.Services.AddHttpClient("provider", client =>
{
    client.Timeout = TimeSpan.FromSeconds(300);
});
builder.Services.AddHttpClient("github", client =>
{
    client.Timeout = TimeSpan.FromSeconds(300);
});

builder.Services.AddSingleton<DotEnvFile>();
builder.Services.AddSingleton<ProviderValidator>();
builder.Services.AddSingleton<GitHubClient>();
builder.Services.AddSingleton<CodeAnalyzer>();
builder.Services.AddSingleton<FileReviewService>();

const string GitHubTokenEnvVar = "GITHUB_TOKEN";

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

// ---- GET /api/github/status ------------------------------------------------
// File-only, like /api/keys/status: a saved token still reads as connected
// after a restart.
app.MapGet("/api/github/status", (DotEnvFile dotEnv) =>
    Results.Ok(new GitHubStatusResult(
        !string.IsNullOrWhiteSpace(dotEnv.Get(GitHubTokenEnvVar)), null)));

// ---- POST /api/github/validate ------------------------------------------------
// Calls GET https://api.github.com/user. Writes GITHUB_TOKEN to .env ONLY on
// success.
app.MapPost("/api/github/validate", async (
    ValidateTokenRequest req,
    GitHubClient github,
    DotEnvFile dotEnv,
    ILogger<Program> logger,
    CancellationToken ct) =>
{
    var token = req.Token?.Trim();
    if (string.IsNullOrEmpty(token))
    {
        return Results.BadRequest(new GitHubValidateResult(
            false, null, null, null, null, "No token was supplied."));
    }

    var result = await github.ValidateAsync(token, ct);

    if (result.Ok)
    {
        dotEnv.Upsert(GitHubTokenEnvVar, token);
        logger.LogInformation(
            "Validated GitHub token for {Login} and wrote {EnvVar} to {Path}",
            result.Login, GitHubTokenEnvVar, dotEnv.Path);
    }

    return Results.Ok(result);
});

// ---- GET /api/github/pr?url=... ---------------------------------------------
// Reads the saved token and returns the PR (metadata + files + per-file patch).
app.MapGet("/api/github/pr", async (
    string? url,
    GitHubClient github,
    DotEnvFile dotEnv,
    CancellationToken ct) =>
{
    var token = dotEnv.Get(GitHubTokenEnvVar);
    if (string.IsNullOrWhiteSpace(token))
    {
        return Results.Ok(new PullRequestResult(
            false, null, "GitHub is not connected. Add a token in Connect API first."));
    }

    if (!GitHubClient.TryParsePrUrl(url, out var owner, out var repo, out var number))
    {
        return Results.Ok(new PullRequestResult(
            false, null,
            "That does not look like a GitHub pull request URL " +
            "(expected https://github.com/owner/repo/pull/123)."));
    }

    var result = await github.GetPullRequestAsync(owner, repo, number, token, ct);
    return Results.Ok(result);
});

// ---- POST /api/analyze ----------------------------------------------------------
// Static LLM review of code already fetched from a PR. Runs nothing, writes
// nothing. Uses the provider/model the frontend picked (the dropdown selection);
// the key comes from .env.
app.MapPost("/api/analyze", async (
    AnalyzeRequest req,
    CodeAnalyzer analyzer,
    ProviderValidator validator,
    DotEnvFile dotEnv,
    CancellationToken ct) =>
{
    var provider = req.Provider?.Trim().ToLowerInvariant();
    if (string.IsNullOrEmpty(provider)
        || (provider != "openai" && provider != "openrouter"))
    {
        return Results.Ok(new AnalysisResult(
            false, null, null, null, null,
            "Provider must be 'openai' or 'openrouter'."));
    }

    if (!validator.TryGetProvider(provider, out var cfg))
    {
        return Results.Ok(new AnalysisResult(
            false, null, null, null, null, $"Unknown provider '{provider}'."));
    }

    var apiKey = dotEnv.Get(cfg.EnvVar);
    if (string.IsNullOrWhiteSpace(apiKey))
    {
        return Results.Ok(new AnalysisResult(
            false, null, null, null, null,
            $"{provider} is not connected. Add a key in Connect API first."));
    }

    var result = await analyzer.AnalyzeAsync(provider, apiKey, req, ct);
    return Results.Ok(result);
});

// ---- POST /api/file/review ----------------------------------------------------
// Module 5: validate a single local file path, redirect .ipynb, otherwise hand
// the file to the analyzer. Reads the file; writes nothing.
app.MapPost("/api/file/review", async (
    FileReviewRequest req,
    FileReviewService fileReview,
    ProviderValidator validator,
    DotEnvFile dotEnv,
    CancellationToken ct) =>
{
    var provider = req.Provider?.Trim().ToLowerInvariant();
    if (string.IsNullOrEmpty(provider)
        || (provider != "openai" && provider != "openrouter"))
    {
        return Results.Ok(new FileReviewResult(
            false, "no-key", null, null, "Provider must be 'openai' or 'openrouter'."));
    }

    if (!validator.TryGetProvider(provider, out var cfg))
        return Results.Ok(new FileReviewResult(
            false, "no-key", null, null, $"Unknown provider '{provider}'."));

    var apiKey = dotEnv.Get(cfg.EnvVar);
    if (string.IsNullOrWhiteSpace(apiKey))
    {
        return Results.Ok(new FileReviewResult(
            false, "no-key", null, null,
            $"{provider} is not connected. Add a key in Connect API first."));
    }

    var path = req.Path?.Trim();
    if (string.IsNullOrEmpty(path))
    {
        return Results.Ok(new FileReviewResult(
            false, "path-missing", null, null, "No path was supplied."));
    }

    var result = await fileReview.ProcessSingleFileAsync(path, provider, req.Model ?? cfg.Model, apiKey, ct);
    return Results.Ok(result);
});

app.Run();
