namespace Plainly.Wpf.Models;

/// <summary>A deletable report in the Document Library's "My Reports" tab.</summary>
public sealed record LibraryReport(
    int Id,
    string Name,
    string Date,
    string Type,
    string Tags);
