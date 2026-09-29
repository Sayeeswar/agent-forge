namespace Plainly.Wpf.Models;

public sealed record DocumentEntry(string Title, string Description, string Pages);

public sealed record DocumentTopicGroup(string Topic, IReadOnlyList<DocumentEntry> Documents)
{
    public string CountLabel => Documents.Count == 1 ? "1 document" : $"{Documents.Count} documents";
}
