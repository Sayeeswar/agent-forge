namespace Plainly.Wpf.Services;

public enum AppScreen
{
    Chat,
    UploadReport,
    DocumentLibrary
}

/// <summary>
/// Lets a screen view model request the shell switch to another screen,
/// optionally carrying a parameter (mirrors the HTML prototype's
/// "Ask about this report" links, which passed a report name via query string).
/// </summary>
public interface INavigationService
{
    void NavigateTo(AppScreen screen, string? parameter = null);
}
