namespace PrReviewChat.Api.Models;

/// <summary>Body of POST /api/keys/validate.</summary>
public sealed record ValidateKeyRequest(string? Provider, string? ApiKey);

/// <summary>What the backend asked the provider (safe to show the user — no key).</summary>
public sealed record ProviderRequestInfo(string Url, string Model, string Prompt);

/// <summary>What the provider sent back.</summary>
public sealed record ProviderResponseInfo(int Status, string? ReplyText, string? Body);

/// <summary>One model tried during validation (OpenRouter walks its whole list).</summary>
public sealed record ProviderAttempt(string Model, int Status, bool Ok, string? Error);

/// <summary>Response of POST /api/keys/validate.</summary>
public sealed record ValidateKeyResult(
    bool Ok,
    string Provider,
    ProviderRequestInfo? Request,
    ProviderResponseInfo? Response,
    string? Error,
    IReadOnlyList<ProviderAttempt>? Attempts = null);

/// <summary>Response of GET /api/keys/status.</summary>
public sealed record KeyStatusResult(bool Openai, bool Openrouter);

// ----- configuration (bound from "ApiKeys" in appsettings.json) -----

public sealed class ApiKeysOptions
{
    public const string SectionName = "ApiKeys";

    public string DotEnvPath { get; set; } = "";
    public string CorsOrigin { get; set; } = "http://localhost:5173";
    public string ValidationPrompt { get; set; } = "Reply with the single word: pong";
    public int MaxTokens { get; set; } = 5;
    public Dictionary<string, ProviderOptions> Providers { get; set; } = new();
}

public sealed class ProviderOptions
{
    public string EnvVar { get; set; } = "";
    public string ChatCompletionsUrl { get; set; } = "";

    /// <summary>Single validation model. Used when <see cref="Models"/> is empty.</summary>
    public string Model { get; set; } = "";

    /// <summary>
    /// Candidate validation models, tried in order until one accepts the key.
    /// Lets a good key still validate when some (free) models are unavailable.
    /// </summary>
    public List<string> Models { get; set; } = new();

    public IReadOnlyList<string> EffectiveModels =>
        Models.Count > 0 ? Models : new List<string> { Model };
}
