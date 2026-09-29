namespace Plainly.Wpf.Models;

/// <summary>A cited source document, shown in the chat source panel.</summary>
public sealed record HealthDocumentSource(
    int Id,
    string Title,
    string Meta,
    string PageLabel,
    string Heading,
    string TextBefore,
    string HighlightedPassage,
    string TextAfter);
