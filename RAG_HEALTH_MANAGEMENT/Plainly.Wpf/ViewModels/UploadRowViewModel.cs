using System.Windows.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Plainly.Wpf.Models;
using Plainly.Wpf.Services;

namespace Plainly.Wpf.ViewModels;

/// <summary>
/// One row in the Upload Report table. The four seeded rows reproduce the
/// HTML prototype's fixed demo states; rows added via "Choose file"/drag-drop
/// run a simple Uploading → Reading → Ready simulation, matching the
/// prototype's cosmetic (non-functional) progress animation.
/// </summary>
public sealed partial class UploadRowViewModel : ObservableObject
{
    private readonly INavigationService _navigation;
    private DispatcherTimer? _timer;

    [ObservableProperty]
    private string _name;

    [ObservableProperty]
    private string _added;

    [ObservableProperty]
    private UploadStatus _status;

    [ObservableProperty]
    private int _progressPercent;

    public UploadRowViewModel(INavigationService navigation, string name, string added, UploadStatus status, int progressPercent = 0)
    {
        _navigation = navigation;
        _name = name;
        _added = added;
        _status = status;
        _progressPercent = progressPercent;
    }

    public bool IsUploading => Status == UploadStatus.Uploading;
    public bool IsReading => Status == UploadStatus.Reading;
    public bool IsReady => Status == UploadStatus.Ready;

    partial void OnStatusChanged(UploadStatus value)
    {
        OnPropertyChanged(nameof(IsUploading));
        OnPropertyChanged(nameof(IsReading));
        OnPropertyChanged(nameof(IsReady));
    }

    /// <summary>Loops the upload progress bar forever, matching the prototype's demo animation.</summary>
    public void StartLoopingDemoProgress()
    {
        _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(400) };
        _timer.Tick += (_, _) => ProgressPercent = ProgressPercent >= 94 ? 18 : ProgressPercent + 2;
        _timer.Start();
    }

    /// <summary>Runs a one-shot Uploading → Reading → Ready simulation for a newly added file.</summary>
    public void StartOneShotSimulation()
    {
        _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(120) };
        _timer.Tick += (_, _) =>
        {
            if (Status == UploadStatus.Uploading)
            {
                ProgressPercent += 5;
                if (ProgressPercent >= 100)
                {
                    Status = UploadStatus.Reading;
                }
            }
            else if (Status == UploadStatus.Reading)
            {
                _timer!.Stop();
                Status = UploadStatus.Ready;
            }
        };
        _timer.Start();
    }

    [RelayCommand]
    private void AskAboutThisReport() => _navigation.NavigateTo(AppScreen.Chat, Name);
}
