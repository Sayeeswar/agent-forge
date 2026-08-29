namespace PrReviewChat.Api.Models;

/// <summary>Body of POST /api/file/review.</summary>
public sealed record FileReviewRequest(string? Path, string? Provider, string? Model);

/// <summary>
/// Response of POST /api/file/review.
/// Ok:false  -> Kind ∈ { path-missing, not-a-file, too-large, no-key,
///                       review-failed }, Error set.
/// Ok:true   -> Kind ∈ { ipynb-redirect, unsupported } with Message,
///              or Kind "review" with Analysis.
/// </summary>
public sealed record FileReviewResult(
    bool Ok,
    string Kind,
    string? Message,
    AnalysisResult? Analysis,
    string? Error);

// ----- configuration (bound from "FileReview" in appsettings.json) -----

public sealed class FileReviewOptions
{
    public const string SectionName = "FileReview";

    public int MaxFileBytes { get; set; } = 1_000_000;
    public int ImageMaxBytes { get; set; } = 4_000_000;
}
