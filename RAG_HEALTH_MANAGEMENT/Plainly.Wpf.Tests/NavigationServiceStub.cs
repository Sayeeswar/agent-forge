using Plainly.Wpf.Services;

namespace Plainly.Wpf.Tests;

public sealed class NavigationServiceStub : INavigationService
{
    public AppScreen? LastScreen { get; private set; }
    public string? LastParameter { get; private set; }

    public void NavigateTo(AppScreen screen, string? parameter = null)
    {
        LastScreen = screen;
        LastParameter = parameter;
    }
}
