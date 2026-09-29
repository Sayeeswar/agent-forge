using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Plainly.Wpf.Models;

namespace Plainly.Wpf.ViewModels;

public sealed partial class LibraryReportRowViewModel : ObservableObject
{
    public LibraryReport Report { get; }

    public LibraryReportRowViewModel(LibraryReport report, IRelayCommand<LibraryReport> askCommand, IRelayCommand<LibraryReport> deleteCommand)
    {
        Report = report;
        AskCommand = askCommand;
        DeleteCommand = deleteCommand;
    }

    public IRelayCommand<LibraryReport> AskCommand { get; }
    public IRelayCommand<LibraryReport> DeleteCommand { get; }
}
