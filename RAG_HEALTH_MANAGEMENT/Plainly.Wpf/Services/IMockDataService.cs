using Plainly.Wpf.Models;

namespace Plainly.Wpf.Services;

/// <summary>
/// Seeds the same hardcoded demo data the HTML prototype used, so the WPF
/// port is a faithful click-through rather than a redesign.
/// </summary>
public interface IMockDataService
{
    IReadOnlyDictionary<int, HealthDocumentSource> DocumentSources { get; }
    IReadOnlyList<ChatSessionSummary> ChatSessions { get; }
    IReadOnlyList<LibraryReport> LibraryReports { get; }
    IReadOnlyList<DocumentTopicGroup> DocumentGroups { get; }
}
