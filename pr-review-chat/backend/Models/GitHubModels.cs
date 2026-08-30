namespace PrReviewChat.Api.Models;

/// <summary>Body of POST /api/github/validate.</summary>
public sealed record ValidateTokenRequest(string? Token);

/// <summary>What the backend asked GitHub (safe to show — no token).</summary>
public sealed record GitHubRequestInfo(string Url);

/// <summary>What GitHub sent back.</summary>
public sealed record GitHubResponseInfo(int Status, string? Body);

/// <summary>Response of POST /api/github/validate.</summary>
public sealed record GitHubValidateResult(
    bool Ok,
    GitHubRequestInfo? Request,
    GitHubResponseInfo? Response,
    string? Login,
    IReadOnlyList<string>? Scopes,
    string? Error);

/// <summary>Response of GET /api/github/status.</summary>
public sealed record GitHubStatusResult(bool Connected, string? Login);

/// <summary>One file changed by a pull request.</summary>
public sealed record PullRequestFile(
    string Filename,
    string Status,
    int Additions,
    int Deletions,
    int Changes,
    string? Patch,
    string? Content = null);

/// <summary>Normalized view of a pull request.</summary>
public sealed record PullRequestSummary(
    int Number,
    string Title,
    string State,
    bool Merged,
    string Author,
    string BaseRef,
    string HeadRef,
    string? Body,
    int Additions,
    int Deletions,
    int ChangedFiles,
    string HtmlUrl,
    IReadOnlyList<PullRequestFile> Files);

/// <summary>Response of GET /api/github/pr.</summary>
public sealed record PullRequestResult(bool Ok, PullRequestSummary? Pr, string? Error);

// ----- configuration (bound from "GitHub" in appsettings.json) -----

public sealed class GitHubOptions
{
    public const string SectionName = "GitHub";

    public string ApiBaseUrl { get; set; } = "https://api.github.com";
    public string UserAgent { get; set; } = "pr-review-chat";
    public int MaxFiles { get; set; } = 300;

    /// <summary>How many changed files to fetch full content for (Module 4 input).</summary>
    public int MaxContentFiles { get; set; } = 40;

    /// <summary>Skip storing content for files larger than this many bytes.</summary>
    public int MaxFileBytes { get; set; } = 100_000;
}
