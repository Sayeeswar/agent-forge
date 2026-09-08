namespace PrReviewChat.Api.Models;

// ---- "Make changes to the code" (apply a review's suggestions to a file) -----
// Two-step, preview-then-confirm flow:
//   POST /api/code/changes/preview  -> reads the file, asks the LLM to fold the
//                                      review's suggestions in, returns the FULL
//                                      proposed file. Writes nothing.
//   POST /api/code/changes/apply    -> writes the confirmed file to disk after a
//                                      staleness check, keeping a .bak copy.

/// <summary>One review finding forwarded from the frontend (explanation only, no code).</summary>
public sealed record CodeChangeFinding(
    string? Title,
    string? WhatIsWrong,
    string? WhyItIsWrong,
    int? Line,
    int? EndLine,
    string? Severity,
    string? Category);

/// <summary>One before/after fix forwarded from the frontend — this is what gets applied.</summary>
public sealed record CodeChangeSuggestion(
    string? File,
    string? Language,
    string? Before,
    string? After,
    string? Note);

/// <summary>Body of POST /api/code/changes/preview.</summary>
public sealed record CodeChangePreviewRequest(
    string? Path,
    string? Provider,
    string? Model,
    IReadOnlyList<CodeChangeFinding>? Findings,
    IReadOnlyList<CodeChangeSuggestion>? Suggestions);

/// <summary>
/// Response of POST /api/code/changes/preview.
/// Ok:false -> Kind ∈ { path-missing, not-a-file, too-large, no-key,
///                      no-suggestions, changes-failed }, Error set.
/// Ok:true  -> Kind "ok", with Original + Proposed + Summary + OriginalHash.
/// </summary>
public sealed record CodeChangePreviewResult(
    bool Ok,
    string Kind,
    string? Path,
    string? Language,
    string? Original,
    string? Proposed,
    string? Summary,
    bool Changed,
    string? OriginalHash,
    string? Error);

/// <summary>Body of POST /api/code/changes/apply.</summary>
public sealed record CodeChangeApplyRequest(
    string? Path,
    string? Proposed,
    string? OriginalHash);

/// <summary>
/// Response of POST /api/code/changes/apply.
/// Ok:false -> Kind ∈ { path-missing, not-a-file, empty, too-large, stale,
///                      write-failed }, Error set.
/// Ok:true  -> Kind "ok", with BackupPath + BytesWritten.
/// </summary>
public sealed record CodeChangeApplyResult(
    bool Ok,
    string Kind,
    string? Path,
    string? BackupPath,
    int BytesWritten,
    string? Error);

// ----- configuration (bound from "CodeChange" in appsettings.json) -----

public sealed class CodeChangeOptions
{
    public const string SectionName = "CodeChange";

    /// <summary>Files above this size are neither previewed nor written.</summary>
    public int MaxFileBytes { get; set; } = 1_000_000;

    /// <summary>Token ceiling for the rewrite reply — must fit the whole file.</summary>
    public int MaxTokens { get; set; } = 8_000;

    public double Temperature { get; set; } = 0.0;
}
