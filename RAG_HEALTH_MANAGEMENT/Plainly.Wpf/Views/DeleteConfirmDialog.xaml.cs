using System.ComponentModel;
using System.Windows;
using Plainly.Wpf.ViewModels;

namespace Plainly.Wpf.Views;

public partial class DeleteConfirmDialog : Window
{
    public DeleteConfirmDialog(DocumentLibraryViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;
        viewModel.PropertyChanged += OnViewModelPropertyChanged;
        Closed += (_, _) => viewModel.PropertyChanged -= OnViewModelPropertyChanged;
    }

    private void OnViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(DocumentLibraryViewModel.PendingDelete) &&
            ((DocumentLibraryViewModel)sender!).PendingDelete is null)
        {
            Close();
        }
    }
}
