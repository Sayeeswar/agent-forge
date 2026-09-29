using Plainly.Wpf.Services;
using Plainly.Wpf.ViewModels;
using Xunit;

namespace Plainly.Wpf.Tests;

public class DocumentLibraryViewModelTests
{
    private static DocumentLibraryViewModel CreateSut(out NavigationServiceStub nav)
    {
        nav = new NavigationServiceStub();
        return new DocumentLibraryViewModel(new MockDataService(), nav);
    }

    [Fact]
    public void StartsOnReportsTabWithAllSeededReports()
    {
        var sut = CreateSut(out _);

        Assert.True(sut.IsReportsTabActive);
        Assert.Equal(4, sut.FilteredReports.Count);
    }

    [Fact]
    public void SearchQuery_FiltersReportsByNameOrTag()
    {
        var sut = CreateSut(out _);

        sut.SearchQuery = "thyroid";

        Assert.Single(sut.FilteredReports);
        Assert.Contains("Thyroid", sut.FilteredReports[0].Report.Name);
    }

    [Fact]
    public void SearchQuery_WithNoMatches_SetsNoReportsMatch()
    {
        var sut = CreateSut(out _);

        sut.SearchQuery = "nonexistent-topic-xyz";

        Assert.True(sut.NoReportsMatch);
        Assert.Empty(sut.FilteredReports);
    }

    [Fact]
    public void ShowDocsTab_FiltersGroupsInstead()
    {
        var sut = CreateSut(out _);

        sut.ShowDocsTabCommand.Execute(null);
        sut.SearchQuery = "thyroid";

        Assert.True(sut.IsDocsTabActive);
        Assert.Single(sut.FilteredGroups);
        Assert.Equal("Thyroid", sut.FilteredGroups[0].Topic);
    }

    [Fact]
    public void Delete_RequestThenConfirm_RemovesReport()
    {
        var sut = CreateSut(out _);
        var target = sut.FilteredReports[0].Report;

        sut.FilteredReports[0].DeleteCommand.Execute(target);
        Assert.True(sut.ConfirmingDelete);

        sut.ConfirmDeleteCommand.Execute(null);

        Assert.False(sut.ConfirmingDelete);
        Assert.DoesNotContain(sut.FilteredReports, r => r.Report == target);
        Assert.Equal(3, sut.FilteredReports.Count);
    }

    [Fact]
    public void Delete_RequestThenCancel_KeepsReport()
    {
        var sut = CreateSut(out _);
        var target = sut.FilteredReports[0].Report;

        sut.FilteredReports[0].DeleteCommand.Execute(target);
        sut.CancelDeleteCommand.Execute(null);

        Assert.False(sut.ConfirmingDelete);
        Assert.Equal(4, sut.FilteredReports.Count);
    }

    [Fact]
    public void AskAboutReport_NavigatesToChatWithReportName()
    {
        var sut = CreateSut(out var nav);
        var target = sut.FilteredReports[0].Report;

        sut.FilteredReports[0].AskCommand.Execute(target);

        Assert.Equal(AppScreen.Chat, nav.LastScreen);
        Assert.Equal(target.Name, nav.LastParameter);
    }
}
