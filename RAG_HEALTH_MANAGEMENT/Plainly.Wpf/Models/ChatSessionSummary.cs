namespace Plainly.Wpf.Models;

/// <summary>
/// One entry in the "Previous chats" list. Session 0 is the hardcoded main
/// HbA1c conversation (IsMain); sessions 1-5 are data-driven, each citing a
/// single <see cref="HealthDocumentSource"/> (SourceDocId).
/// </summary>
public sealed record ChatSessionSummary(
    int Index,
    string Title,
    string ShortTitle,
    string When,
    string Time,
    bool IsMain,
    int? SourceDocId,
    string? Question,
    IReadOnlyList<string>? Paragraphs);
