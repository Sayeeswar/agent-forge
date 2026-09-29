using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Plainly.Wpf.Models;
using Plainly.Wpf.Services;

namespace Plainly.Wpf.ViewModels;

public sealed partial class ChatViewModel : ObservableObject
{
    private readonly IMockDataService _mockData;
    private readonly INavigationService _navigation;

    public ObservableCollection<ChatSessionSummary> Sessions { get; }

    [ObservableProperty]
    private ChatSessionSummary _currentSession;

    [ObservableProperty]
    private int? _activeCitationId = 1;

    [ObservableProperty]
    private bool _historyOpen = true;

    [ObservableProperty]
    private string? _attachedReportName;

    [ObservableProperty]
    private string _questionInput = string.Empty;

    public ChatViewModel(IMockDataService mockData, INavigationService navigation)
    {
        _mockData = mockData;
        _navigation = navigation;
        Sessions = new ObservableCollection<ChatSessionSummary>(mockData.ChatSessions);
        _currentSession = Sessions[0];
    }

    public bool IsMainSession => CurrentSession.IsMain;
    public bool IsOtherSession => !CurrentSession.IsMain;

    public HealthDocumentSource? CurrentSourceDoc =>
        ActiveCitationId is int id && _mockData.DocumentSources.TryGetValue(id, out var doc) ? doc : null;

    public bool HasSource => CurrentSourceDoc is not null;
    public bool NoSource => !HasSource;

    public bool IsCitation1Active => ActiveCitationId == 1;
    public bool IsCitation2Active => ActiveCitationId == 2;
    public bool IsCurrentCitationActive => ActiveCitationId is not null && ActiveCitationId == CurrentSession.SourceDocId;

    partial void OnCurrentSessionChanged(ChatSessionSummary value)
    {
        OnPropertyChanged(nameof(IsMainSession));
        OnPropertyChanged(nameof(IsOtherSession));
        OnPropertyChanged(nameof(IsCurrentCitationActive));
    }

    partial void OnActiveCitationIdChanged(int? value)
    {
        OnPropertyChanged(nameof(CurrentSourceDoc));
        OnPropertyChanged(nameof(HasSource));
        OnPropertyChanged(nameof(NoSource));
        OnPropertyChanged(nameof(IsCitation1Active));
        OnPropertyChanged(nameof(IsCitation2Active));
        OnPropertyChanged(nameof(IsCurrentCitationActive));
    }

    public void AttachReport(string reportName) => AttachedReportName = reportName;

    [RelayCommand]
    private void SelectSession(ChatSessionSummary session)
    {
        CurrentSession = session;
        ActiveCitationId = session.IsMain ? 1 : session.SourceDocId;
    }

    [RelayCommand]
    private void ToggleHistory() => HistoryOpen = !HistoryOpen;

    // Accepts object because XAML literal CommandParameter values ("1", "2") arrive as
    // strings, while parameter bindings (e.g. CurrentSession.SourceDocId) arrive as boxed int?.
    [RelayCommand]
    private void OpenCitation(object? docId)
    {
        if (docId is int id)
        {
            ActiveCitationId = id;
        }
        else if (docId is not null && int.TryParse(docId.ToString(), out var parsed))
        {
            ActiveCitationId = parsed;
        }
    }

    [RelayCommand]
    private void CloseSource() => ActiveCitationId = null;

    [RelayCommand]
    private void DetachReport() => AttachedReportName = null;

    [RelayCommand]
    private void SendQuestion() => QuestionInput = string.Empty;

    [RelayCommand]
    private void NewConversation()
    {
        CurrentSession = Sessions[0];
        ActiveCitationId = 1;
        AttachedReportName = null;
        QuestionInput = string.Empty;
    }

    [RelayCommand]
    private void GoToUpload() => _navigation.NavigateTo(AppScreen.UploadReport);

    [RelayCommand]
    private void GoToLibrary() => _navigation.NavigateTo(AppScreen.DocumentLibrary);
}
