using Plainly.Wpf.Services;
using Plainly.Wpf.ViewModels;
using Xunit;

namespace Plainly.Wpf.Tests;

public class ChatViewModelTests
{
    private static ChatViewModel CreateSut(out NavigationServiceStub nav)
    {
        nav = new NavigationServiceStub();
        return new ChatViewModel(new MockDataService(), nav);
    }

    [Fact]
    public void StartsOnMainSessionWithCitationOneActive()
    {
        var sut = CreateSut(out _);

        Assert.True(sut.IsMainSession);
        Assert.True(sut.IsCitation1Active);
        Assert.False(sut.IsCitation2Active);
        Assert.Equal(1, sut.CurrentSourceDoc?.Id);
    }

    [Fact]
    public void OpenCitation_WithStringParameter_UpdatesActiveCitationAndSourcePanel()
    {
        var sut = CreateSut(out _);

        sut.OpenCitationCommand.Execute("2");

        Assert.True(sut.IsCitation2Active);
        Assert.False(sut.IsCitation1Active);
        Assert.Equal(2, sut.CurrentSourceDoc?.Id);
    }

    [Fact]
    public void CloseSource_ClearsActiveCitation()
    {
        var sut = CreateSut(out _);

        sut.CloseSourceCommand.Execute(null);

        Assert.True(sut.NoSource);
        Assert.Null(sut.CurrentSourceDoc);
    }

    [Fact]
    public void SelectSession_OnOtherSession_ActivatesItsOwnCitation()
    {
        var sut = CreateSut(out _);
        var thyroidSession = sut.Sessions[1]; // seeded session citing doc 3

        sut.SelectSessionCommand.Execute(thyroidSession);

        Assert.False(sut.IsMainSession);
        Assert.True(sut.IsCurrentCitationActive);
        Assert.Equal(3, sut.CurrentSourceDoc?.Id);
    }

    [Fact]
    public void NewConversation_ResetsToMainSessionAndClearsAttachment()
    {
        var sut = CreateSut(out _);
        sut.AttachReport("Some Report.pdf");
        sut.SelectSessionCommand.Execute(sut.Sessions[2]);

        sut.NewConversationCommand.Execute(null);

        Assert.True(sut.IsMainSession);
        Assert.Null(sut.AttachedReportName);
        Assert.True(sut.IsCitation1Active);
    }

    [Fact]
    public void GoToUpload_DelegatesToNavigationService()
    {
        var sut = CreateSut(out var nav);

        sut.GoToUploadCommand.Execute(null);

        Assert.Equal(AppScreen.UploadReport, nav.LastScreen);
    }
}
