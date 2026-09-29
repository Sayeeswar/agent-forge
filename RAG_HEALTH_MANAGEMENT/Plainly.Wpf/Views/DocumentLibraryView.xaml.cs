using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using Plainly.Wpf.ViewModels;

namespace Plainly.Wpf.Views;

public partial class DocumentLibraryView : UserControl
{
    public DocumentLibraryView()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object sender, DependencyPropertyChangedEventArgs e)
    {
        if (e.OldValue is DocumentLibraryViewModel oldVm)
        {
            oldVm.PropertyChanged -= OnViewModelPropertyChanged;
        }

        if (e.NewValue is DocumentLibraryViewModel newVm)
        {
            newVm.PropertyChanged += OnViewModelPropertyChanged;
        }
    }

    private void OnViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName != nameof(DocumentLibraryViewModel.PendingDelete))
        {
            return;
        }

        var vm = (DocumentLibraryViewModel)sender!;
        if (vm.PendingDelete is null)
        {
            return;
        }

        var owner = Window.GetWindow(this);
        var dialog = new DeleteConfirmDialog(vm) { Owner = owner };
        dialog.ShowDialog();
    }
}
