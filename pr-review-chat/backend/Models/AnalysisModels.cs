namespace PrReviewChat.Api.Models;

/// <summary>One file handed to the analyzer (already fetched elsewhere).</summary>
public sealed record AnalyzeFile(string Path, string? Content, string? Patch, string? Language);

/// <summary>An image handed to the analyzer as a base64 data URL (vision call).</summary>
public sealed record AnalyzeImage(string Path, string DataUrl);

/// <summary>A prior chat turn, for follow-up questions.</summary>
public sealed record AnalyzeMessage(string Role, string Text);

/// <summary>Body of POST /api/analyze.</summary>
public sealed record AnalyzeRequest(
    string? Provider,
    string? Model,
    string? Instruction,
    IReadOnlyList<AnalyzeFile>? Files,
    string? Diff,
    IReadOnlyList<AnalyzeMessage>? History,
    IReadOnlyList<AnalyzeImage>? Images = null);

/// <summary>One issue the LLM found. No code here — that lives in suggestions.</summary>
public sealed record AnalysisFinding(
    string Title,
    string WhatIsWrong,
    string WhyItIsWrong,
    string File,
    int? Line,
    int? EndLine,
    string Severity,   // Low | Medium | High
    string Category,   // syntax|type|logic|test|lint|readability|dry|solid|
                       // error-handling|security|performance|idioms|consistency
    bool Warning);

/// <summary>A corrected snippet, shown as before/after in the right panel.</summary>
public sealed record AnalysisSuggestion(
    string File,
    string Language,
    string Before,
    string After,
    string? Note);

public sealed record AnalysisMeta(
    string Provider,
    string Model,
    int PromptChars,
    int TruncatedFiles);

/// <summary>Response of POST /api/analyze.</summary>
public sealed record AnalysisResult(
    bool Ok,
    string? Summary,
    IReadOnlyList<AnalysisFinding>? Findings,
    IReadOnlyList<AnalysisSuggestion>? Suggestions,
    AnalysisMeta? Meta,
    string? Error);

// ----- configuration (bound from "Analysis" in appsettings.json) -----

public sealed class AnalysisOptions
{
    public const string SectionName = "Analysis";

    public int MaxInputChars { get; set; } = 120_000;
    public int MaxFiles { get; set; } = 40;
    public int MaxTokens { get; set; } = 2000;
    public double Temperature { get; set; } = 0.1;
}
