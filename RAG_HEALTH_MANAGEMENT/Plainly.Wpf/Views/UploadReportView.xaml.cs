using System.Windows;
using System.Windows.Controls;
using Plainly.Wpf.ViewModels;

namespace Plainly.Wpf.Views;

public partial class UploadReportView : UserControl
{
    public UploadReportView()
    {
        InitializeComponent();
    }

    private void OnDragOver(object sender, DragEventArgs e)
    {
        e.Effects = e.Data.GetDataPresent(DataFormats.FileDrop) ? DragDropEffects.Copy : DragDropEffects.None;
        e.Handled = true;
    }

    private void OnDrop(object sender, DragEventArgs e)
    {
        if (DataContext is not UploadReportViewModel vm || !e.Data.GetDataPresent(DataFormats.FileDrop))
        {
            return;
        }

        if (e.Data.GetData(DataFormats.FileDrop) is string[] paths)
        {
            foreach (var path in paths)
            {
                vm.AddFile(System.IO.Path.GetFileName(path));
            }
        }
    }
}
