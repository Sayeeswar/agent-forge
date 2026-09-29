using Plainly.Wpf.ViewModels;

namespace Plainly.Wpf.Services;

public sealed class NavigationService : INavigationService
{
    private ShellViewModel? _shell;

    /// <summary>Wires the shell after construction to break the ShellViewModel/NavigationService cycle.</summary>
    public void Initialize(ShellViewModel shell) => _shell = shell;

    public void NavigateTo(AppScreen screen, string? parameter = null)
    {
        if (_shell is null)
        {
            throw new InvalidOperationException($"{nameof(NavigationService)} was not initialized with a shell.");
        }

        _shell.NavigateTo(screen, parameter);
    }
}
