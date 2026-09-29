using System.Windows;
using Plainly.Wpf.Services;
using Plainly.Wpf.ViewModels;
using Plainly.Wpf.Views;

namespace Plainly.Wpf;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        var mockData = new MockDataService();
        var navigation = new NavigationService();
        var shellViewModel = new ShellViewModel(navigation, mockData);
        navigation.Initialize(shellViewModel);

        var shellWindow = new ShellWindow { DataContext = shellViewModel };
        shellWindow.Show();
    }
}
