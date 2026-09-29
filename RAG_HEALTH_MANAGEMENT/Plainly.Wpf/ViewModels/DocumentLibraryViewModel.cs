using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Plainly.Wpf.Models;
using Plainly.Wpf.Services;

namespace Plainly.Wpf.ViewModels;

public enum LibraryTab
{
    Reports,
    Documents
}

public sealed partial class DocumentLibraryViewModel : ObservableObject
{
    private readonly INavigationService _navigation;
    private readonly ObservableCollection<LibraryReport> _reports;
    private readonly IReadOnlyList<DocumentTopicGroup> _allGroups;

    [ObservableProperty]
    private LibraryTab _selectedTab = LibraryTab.Reports;

    [ObservableProperty]
    private string _searchQuery = string.Empty;

    [ObservableProperty]
    private LibraryReport? _pendingDelete;

    public ObservableCollection<LibraryReportRowViewModel> FilteredReports { get; } = new();
    public ObservableCollection<DocumentTopicGroup> FilteredGroups { get; } = new();

    private readonly IRelayCommand<LibraryReport> _askCommand;
    private readonly IRelayCommand<LibraryReport> _deleteCommand;

    public DocumentLibraryViewModel(IMockDataService mockData, INavigationService navigation)
    {
        _navigation = navigation;
        _reports = new ObservableCollection<LibraryReport>(mockData.LibraryReports);
        _allGroups = mockData.DocumentGroups;

        _askCommand = new RelayCommand<LibraryReport>(r => _navigation.NavigateTo(AppScreen.Chat, r!.Name));
        _deleteCommand = new RelayCommand<LibraryReport>(r => PendingDelete = r);

        Refresh();
    }

    public bool IsReportsTabActive => SelectedTab == LibraryTab.Reports;
    public bool IsDocsTabActive => SelectedTab == LibraryTab.Documents;
    public bool NoReportsMatch => IsReportsTabActive && FilteredReports.Count == 0;
    public bool NoDocsMatch => IsDocsTabActive && FilteredGroups.Count == 0;
    public bool ConfirmingDelete => PendingDelete is not null;

    partial void OnSelectedTabChanged(LibraryTab value)
    {
        OnPropertyChanged(nameof(IsReportsTabActive));
        OnPropertyChanged(nameof(IsDocsTabActive));
        OnPropertyChanged(nameof(NoReportsMatch));
        OnPropertyChanged(nameof(NoDocsMatch));
    }

    partial void OnSearchQueryChanged(string value) => Refresh();

    partial void OnPendingDeleteChanged(LibraryReport? value) => OnPropertyChanged(nameof(ConfirmingDelete));

    private void Refresh()
    {
        var q = SearchQuery.Trim();
        bool Matches(string haystack) => q.Length == 0 || haystack.Contains(q, StringComparison.OrdinalIgnoreCase);

        FilteredReports.Clear();
        foreach (var report in _reports.Where(r => Matches(r.Name + " " + r.Tags)))
        {
            FilteredReports.Add(new LibraryReportRowViewModel(report, _askCommand, _deleteCommand));
        }

        FilteredGroups.Clear();
        foreach (var group in _allGroups)
        {
            var docs = Matches(group.Topic)
                ? group.Documents
                : group.Documents.Where(d => Matches(d.Title + " " + d.Description)).ToList();

            if (docs.Count > 0)
            {
                FilteredGroups.Add(group with { Documents = docs.ToList() });
            }
        }

        OnPropertyChanged(nameof(NoReportsMatch));
        OnPropertyChanged(nameof(NoDocsMatch));
    }

    [RelayCommand]
    private void ShowReportsTab() => SelectedTab = LibraryTab.Reports;

    [RelayCommand]
    private void ShowDocsTab() => SelectedTab = LibraryTab.Documents;

    [RelayCommand]
    private void GoToChat() => _navigation.NavigateTo(AppScreen.Chat);

    [RelayCommand]
    private void GoToUpload() => _navigation.NavigateTo(AppScreen.UploadReport);

    [RelayCommand]
    private void ConfirmDelete()
    {
        if (PendingDelete is { } report)
        {
            _reports.Remove(report);
            PendingDelete = null;
            Refresh();
        }
    }

    [RelayCommand]
    private void CancelDelete() => PendingDelete = null;
}
