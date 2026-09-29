using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Plainly.Wpf.Services;

namespace Plainly.Wpf.ViewModels;

public sealed partial class ShellViewModel : ObservableObject
{
    private readonly ChatViewModel _chat;
    private readonly UploadReportViewModel _upload;
    private readonly DocumentLibraryViewModel _library;

    [ObservableProperty]
    private ObservableObject _currentViewModel;

    [ObservableProperty]
    private AppScreen _activeScreen = AppScreen.Chat;

    public ShellViewModel(INavigationService navigation, IMockDataService mockData)
    {
        _chat = new ChatViewModel(mockData, navigation);
        _upload = new UploadReportViewModel(navigation);
        _library = new DocumentLibraryViewModel(mockData, navigation);
        _currentViewModel = _chat;
    }

    /// <summary>Exposed so the persistent sidebar can show/drive the "Previous chats" section, which the source prototype nests inside the shared nav.</summary>
    public ChatViewModel Chat => _chat;

    public void NavigateTo(AppScreen screen, string? parameter)
    {
        ActiveScreen = screen;
        CurrentViewModel = screen switch
        {
            AppScreen.Chat => _chat,
            AppScreen.UploadReport => _upload,
            AppScreen.DocumentLibrary => _library,
            _ => CurrentViewModel,
        };

        if (screen == AppScreen.Chat && !string.IsNullOrEmpty(parameter))
        {
            _chat.AttachReport(parameter);
        }
    }

    public bool IsChatActive => ActiveScreen == AppScreen.Chat;
    public bool IsUploadActive => ActiveScreen == AppScreen.UploadReport;
    public bool IsLibraryActive => ActiveScreen == AppScreen.DocumentLibrary;

    partial void OnActiveScreenChanged(AppScreen value)
    {
        OnPropertyChanged(nameof(IsChatActive));
        OnPropertyChanged(nameof(IsUploadActive));
        OnPropertyChanged(nameof(IsLibraryActive));
    }

    [RelayCommand]
    private void GoToChat() => NavigateTo(AppScreen.Chat, null);

    [RelayCommand]
    private void GoToUpload() => NavigateTo(AppScreen.UploadReport, null);

    [RelayCommand]
    private void GoToLibrary() => NavigateTo(AppScreen.DocumentLibrary, null);

    [RelayCommand]
    private void NewConversation()
    {
        _chat.NewConversationCommand.Execute(null);
        NavigateTo(AppScreen.Chat, null);
    }
}
