using System.Collections.ObjectModel;
using System.IO;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Win32;
using Plainly.Wpf.Models;
using Plainly.Wpf.Services;

namespace Plainly.Wpf.ViewModels;

public sealed partial class UploadReportViewModel : ObservableObject
{
    private readonly INavigationService _navigation;

    public ObservableCollection<UploadRowViewModel> Rows { get; } = new();

    public UploadReportViewModel(INavigationService navigation)
    {
        _navigation = navigation;

        var uploading = new UploadRowViewModel(navigation, "Kidney Function Test.pdf", "Today, 10:31", UploadStatus.Uploading, 42);
        uploading.StartLoopingDemoProgress();
        Rows.Add(uploading);

        Rows.Add(new UploadRowViewModel(navigation, "Thyroid Report.jpg", "Today, 10:28", UploadStatus.Reading));
        Rows.Add(new UploadRowViewModel(navigation, "Blood Test – Sept 2026.pdf", "Today, 10:12", UploadStatus.Ready));
        Rows.Add(new UploadRowViewModel(navigation, "Cholesterol Results – Aug 2026.pdf", "14 August", UploadStatus.Ready));
    }

    [RelayCommand]
    private void ChooseFile()
    {
        var dialog = new OpenFileDialog
        {
            Filter = "Reports (*.pdf;*.jpg;*.jpeg;*.png)|*.pdf;*.jpg;*.jpeg;*.png",
            Multiselect = false,
        };

        if (dialog.ShowDialog() == true)
        {
            AddFile(Path.GetFileName(dialog.FileName));
        }
    }

    public void AddFile(string fileName)
    {
        var row = new UploadRowViewModel(_navigation, fileName, "Just now", UploadStatus.Uploading);
        Rows.Insert(0, row);
        row.StartOneShotSimulation();
    }
}
