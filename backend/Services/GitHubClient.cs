using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using PrReviewChat.Api.Models;

namespace PrReviewChat.Api.Services;

/// <summary>
/// Thin GitHub REST client: validates a personal-access token and reads a pull
/// request (metadata + changed files + per-file patch). Never writes anything.
/// </summary>
public sealed partial class GitHubClient
{
    private const int MaxBodySnippet = 2000;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GitHubOptions _options;
    private readonly ILogger<GitHubClient> _logger;

    public GitHubClient(
        IHttpClientFactory httpClientFactory,
        IOptions<GitHubOptions> options,
        ILogger<GitHubClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    [GeneratedRegex(@"github\.com/([^/\s]+)/([^/\s]+)/pull/(\d+)", RegexOptions.IgnoreCase)]
    private static partial Regex PrUrlRegex();

    public static bool TryParsePrUrl(
        string? url, out string owner, out string repo, out int number)
    {
        owner = repo = string.Empty;
        number = 0;
        if (string.IsNullOrWhiteSpace(url)) return false;

        var m = PrUrlRegex().Match(url);
        if (!m.Success) return false;

        owner = m.Groups[1].Value;
        repo = m.Groups[2].Value;
        return int.TryParse(m.Groups[3].Value, out number) && number > 0;
    }

    // ---- token validation ----------------------------------------------------

    public async Task<GitHubValidateResult> ValidateAsync(string token, CancellationToken ct)
    {
        var url = $"{BaseUrl}/user";
        var requestInfo = new GitHubRequestInfo(url);

        using var http = await GetAsync(url, token, ct);

        if (http.Error is not null)
        {
            return new GitHubValidateResult(false, requestInfo,
                new GitHubResponseInfo(0, null), null, null, http.Error);
        }

        var scopes = ReadScopes(http.Response!);

        if (http.Status is < 200 or >= 300)
        {
            return new GitHubValidateResult(false, requestInfo,
                new GitHubResponseInfo(http.Status, Trim(http.Body)), null, scopes,
                $"GitHub rejected the token (HTTP {http.Status}).");
        }

        var login = TryGetString(http.Body, "login");
        if (login is null)
        {
            return new GitHubValidateResult(false, requestInfo,
                new GitHubResponseInfo(http.Status, Trim(http.Body)), null, scopes,
                $"GitHub returned HTTP {http.Status} but no user login could be parsed.");
        }

        return new GitHubValidateResult(true, requestInfo,
            new GitHubResponseInfo(http.Status, null), login, scopes, null);
    }

    // ---- pull request read -------------------------------------------------------

    public async Task<PullRequestResult> GetPullRequestAsync(
        string owner, string repo, int number, string token, CancellationToken ct)
    {
        var prUrl = $"{BaseUrl}/repos/{owner}/{repo}/pulls/{number}";

        using var prHttp = await GetAsync(prUrl, token, ct);
        if (prHttp.Error is not null)
            return new PullRequestResult(false, null, prHttp.Error);
        if (prHttp.Status is < 200 or >= 300)
            return new PullRequestResult(false, null, DescribeError(prHttp.Status, prHttp.Body));

        List<PullRequestFile> files;
        try
        {
            files = await ReadFilesAsync(owner, repo, number, token, ct);
        }
        catch (GitHubApiException gex)
        {
            return new PullRequestResult(false, null, gex.Message);
        }

        try
        {
            using var doc = JsonDocument.Parse(prHttp.Body);
            var root = doc.RootElement;

            var head = root.TryGetProperty("head", out var h) ? h : default;
            var headSha = head.ValueKind == JsonValueKind.Object
                ? GetString(head, "sha")
                : null;

            // Module 4 input: attach full file content at the PR head.
            if (headSha is not null)
                files = await AttachContentsAsync(owner, repo, headSha, files, token, ct);

            var summary = new PullRequestSummary(
                Number: GetInt(root, "number") ?? number,
                Title: GetString(root, "title") ?? $"PR #{number}",
                State: GetString(root, "state") ?? "unknown",
                Merged: root.TryGetProperty("merged", out var mv)
                        && mv.ValueKind == JsonValueKind.True,
                Author: root.TryGetProperty("user", out var u)
                        ? GetString(u, "login") ?? "unknown"
                        : "unknown",
                BaseRef: root.TryGetProperty("base", out var b) ? GetString(b, "ref") ?? "" : "",
                HeadRef: head.ValueKind == JsonValueKind.Object ? GetString(head, "ref") ?? "" : "",
                Body: GetString(root, "body"),
                Additions: GetInt(root, "additions") ?? 0,
                Deletions: GetInt(root, "deletions") ?? 0,
                ChangedFiles: GetInt(root, "changed_files") ?? files.Count,
                HtmlUrl: GetString(root, "html_url") ?? "",
                Files: files);

            return new PullRequestResult(true, summary, null);
        }
        catch (JsonException)
        {
            return new PullRequestResult(false, null,
                "GitHub returned a pull request payload that could not be parsed.");
        }
    }

    /// <summary>
    /// Fetches raw file content at <paramref name="sha"/> for the first
    /// <c>MaxContentFiles</c> non-removed files (≤ <c>MaxFileBytes</c>). A per-file
    /// failure just leaves that file's content null — the PR result still succeeds.
    /// </summary>
    private async Task<List<PullRequestFile>> AttachContentsAsync(
        string owner, string repo, string sha,
        List<PullRequestFile> files, string token, CancellationToken ct)
    {
        var enriched = new List<PullRequestFile>(files.Count);
        var fetched = 0;

        foreach (var file in files)
        {
            if (fetched >= _options.MaxContentFiles
                || file.Status == "removed"
                || string.IsNullOrEmpty(file.Filename))
            {
                enriched.Add(file);
                continue;
            }

            fetched++;
            string? content = null;
            try
            {
                var path = Uri.EscapeDataString(file.Filename).Replace("%2F", "/");
                var url = $"{BaseUrl}/repos/{owner}/{repo}/contents/{path}?ref={sha}";
                using var http = await GetAsync(url, token, ct, "application/vnd.github.raw");
                if (http.Error is null
                    && http.Status is >= 200 and < 300
                    && http.Body.Length <= _options.MaxFileBytes)
                {
                    content = http.Body;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not fetch content for {File}", file.Filename);
            }

            enriched.Add(file with { Content = content });
        }

        return enriched;
    }

    private async Task<List<PullRequestFile>> ReadFilesAsync(
        string owner, string repo, int number, string token, CancellationToken ct)
    {
        var files = new List<PullRequestFile>();
        var next = $"{BaseUrl}/repos/{owner}/{repo}/pulls/{number}/files?per_page=100";

        while (next is not null && files.Count < _options.MaxFiles)
        {
            using var http = await GetAsync(next, token, ct);
            if (http.Error is not null) throw new GitHubApiException(http.Error);
            if (http.Status is < 200 or >= 300)
                throw new GitHubApiException(DescribeError(http.Status, http.Body));

            using (var doc = JsonDocument.Parse(http.Body))
            {
                if (doc.RootElement.ValueKind != JsonValueKind.Array) break;
                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    files.Add(new PullRequestFile(
                        Filename: GetString(el, "filename") ?? "(unknown)",
                        Status: GetString(el, "status") ?? "modified",
                        Additions: GetInt(el, "additions") ?? 0,
                        Deletions: GetInt(el, "deletions") ?? 0,
                        Changes: GetInt(el, "changes") ?? 0,
                        Patch: GetString(el, "patch")));
                    if (files.Count >= _options.MaxFiles) break;
                }
            }

            next = NextLink(http.Response);
        }

        return files;
    }

    // ---- http helpers ------------------------------------------------------------

    private string BaseUrl => _options.ApiBaseUrl.TrimEnd('/');

    private HttpRequestMessage BuildRequest(
        HttpMethod method, string url, string token,
        string accept = "application/vnd.github+json")
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.UserAgent.ParseAdd(_options.UserAgent);
        request.Headers.Accept.ParseAdd(accept);
        request.Headers.TryAddWithoutValidation("X-GitHub-Api-Version", "2022-11-28");
        return request;
    }

    private async Task<GitHubHttp> GetAsync(
        string url, string token, CancellationToken ct,
        string accept = "application/vnd.github+json")
    {
        try
        {
            using var request = BuildRequest(HttpMethod.Get, url, token, accept);
            var resp = await _httpClientFactory.CreateClient("github").SendAsync(request, ct);
            var body = await resp.Content.ReadAsStringAsync(ct);
            return new GitHubHttp((int)resp.StatusCode, body, resp, null);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "GitHub request to {Url} failed", url);
            return new GitHubHttp(0, string.Empty, null, $"Could not reach GitHub: {ex.Message}");
        }
    }

    private sealed record GitHubHttp(
        int Status, string Body, HttpResponseMessage? Response, string? Error) : IDisposable
    {
        public void Dispose() => Response?.Dispose();
    }

    private static string? NextLink(HttpResponseMessage? response)
    {
        if (response is null) return null;
        if (!response.Headers.TryGetValues("Link", out var values)) return null;

        foreach (var header in values)
        {
            foreach (var part in header.Split(','))
            {
                var seg = part.Trim();
                if (!seg.Contains("rel=\"next\"", StringComparison.OrdinalIgnoreCase)) continue;
                var start = seg.IndexOf('<');
                var end = seg.IndexOf('>');
                if (start >= 0 && end > start) return seg[(start + 1)..end];
            }
        }
        return null;
    }

    private static IReadOnlyList<string>? ReadScopes(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("x-oauth-scopes", out var values)) return null;
        var list = string.Join(',', values)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return list.Length == 0 ? null : list;
    }

    private static string DescribeError(int status, string body)
    {
        var message = TryGetString(body, "message");
        return message is null ? $"HTTP {status}" : $"HTTP {status} — {message}";
    }

    private static string Trim(string body) =>
        body.Length <= MaxBodySnippet ? body : body[..MaxBodySnippet] + "…";

    // ---- json helpers ----------------------------------------------------------

    private static string? TryGetString(string json, string prop)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return GetString(doc.RootElement, prop);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? GetString(JsonElement el, string prop) =>
        el.ValueKind == JsonValueKind.Object
        && el.TryGetProperty(prop, out var v)
        && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static int? GetInt(JsonElement el, string prop) =>
        el.ValueKind == JsonValueKind.Object
        && el.TryGetProperty(prop, out var v)
        && v.ValueKind == JsonValueKind.Number
        && v.TryGetInt32(out var n)
            ? n
            : null;

    private sealed class GitHubApiException(string message) : Exception(message);
}
