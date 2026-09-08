using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PrReviewChat.Api.Models;

namespace PrReviewChat.Api.Services;

/// <summary>
/// Backs the panel's "Make changes to the code" button. Given a local file and
/// the findings/suggestions from an earlier review of that same file, asks the
/// selected provider to fold the fixes in and return the WHOLE new file
/// (<see cref="PreviewAsync"/>, writes nothing), then writes the user-confirmed
/// version to disk with a <c>.bak</c> copy (<see cref="ApplyAsync"/>).
///
/// The edit prompt is authored here in C#, per the repo's architecture rules.
/// </summary>
public sealed class CodeChangeService
{
    private const string SystemPrompt = """
        You are a precise code-editing assistant. You are given the FULL current
        contents of a single source file, followed by review findings and
        before/after suggestions produced by an earlier review of that same file.

        Apply the suggested changes to the file and return the COMPLETE updated
        file. Rules:
        - Return the ENTIRE file, not a diff and not a fragment.
        - Make only the changes implied by the findings and suggestions. Do not
          refactor unrelated code, re-order members, or reformat lines you are
          not otherwise touching.
        - Preserve the file's existing indentation style, line-ending style,
          trailing newline, and language conventions.
        - Keep the file syntactically valid for its language.
        - If a suggestion cannot be applied safely or no longer matches the
          file, leave that part unchanged and say so in "summary".

        Reply with a SINGLE JSON object, no prose around it, of exactly this
        shape:
        {
          "summary": "1-4 sentence plain-text description of what you changed. NO code.",
          "updatedFile": "the complete new file contents as one string",
          "changed": true
        }

        If you end up making no changes at all, set "changed" to false and put
        the original contents back in "updatedFile" unchanged.
        """;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ApiKeysOptions _apiKeys;
    private readonly CodeChangeOptions _options;
    private readonly ILogger<CodeChangeService> _logger;

    public CodeChangeService(
        IHttpClientFactory httpClientFactory,
        IOptions<ApiKeysOptions> apiKeys,
        IOptions<CodeChangeOptions> options,
        ILogger<CodeChangeService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _apiKeys = apiKeys.Value;
        _options = options.Value;
        _logger = logger;
    }

    // ---- step 1: preview -----------------------------------------------------

    public async Task<CodeChangePreviewResult> PreviewAsync(
        CodeChangePreviewRequest req, string provider, string model, string apiKey,
        CancellationToken ct)
    {
        if (!_apiKeys.Providers.TryGetValue(provider, out var cfg))
            return PreviewErr("no-key", null, $"Unknown provider '{provider}'.");

        var path = (req.Path ?? string.Empty).Trim().Trim('"');
        if (path.Length == 0)
            return PreviewErr("path-missing", null, "No path was supplied.");

        var isFile = File.Exists(path);
        if (!isFile && !Directory.Exists(path))
            return PreviewErr("path-missing", path, "This path doesn't exist.");
        if (!isFile)
            return PreviewErr("not-a-file", path, "No file found at this path — it points to a folder.");

        var suggestions = (req.Suggestions ?? Array.Empty<CodeChangeSuggestion>())
            .Where(s => !string.IsNullOrWhiteSpace(s.Before) || !string.IsNullOrWhiteSpace(s.After))
            .ToList();
        if (suggestions.Count == 0)
        {
            return PreviewErr("no-suggestions", path,
                "This review produced no before/after code suggestions to apply. " +
                "Run a review that returns suggestions first.");
        }

        string original;
        try
        {
            if (new FileInfo(path).Length > _options.MaxFileBytes)
                return PreviewErr("too-large", path,
                    $"This file is larger than the {Mb(_options.MaxFileBytes)} edit limit.");
            original = await File.ReadAllTextAsync(path, ct);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(ex, "Could not read {Path} for editing", path);
            return PreviewErr("changes-failed", path, $"Could not read the file: {ex.Message}");
        }

        var effectiveModel = string.IsNullOrWhiteSpace(model) ? cfg.Model : model.Trim();
        var lang = GuessLanguage(path);
        var userContent = BuildEditPrompt(path, lang, original, req.Findings, suggestions);

        var body = new
        {
            model = effectiveModel,
            messages = new object[]
            {
                new { role = "system", content = SystemPrompt },
                new { role = "user", content = userContent },
            },
            max_tokens = _options.MaxTokens,
            temperature = _options.Temperature,
            response_format = new { type = "json_object" },
        };

        string responseBody;
        int status;
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, cfg.ChatCompletionsUrl)
            {
                Content = new StringContent(
                    JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Headers.TryAddWithoutValidation("HTTP-Referer", _apiKeys.CorsOrigin);
            request.Headers.TryAddWithoutValidation("X-Title", "PR Review Chat");

            var client = _httpClientFactory.CreateClient("provider");
            using var response = await client.SendAsync(request, ct);
            status = (int)response.StatusCode;
            responseBody = await response.Content.ReadAsStringAsync(ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "Edit call to {Provider} failed", provider);
            return PreviewErr("changes-failed", path, $"Could not reach {provider}: {ex.Message}");
        }

        if (status is < 200 or >= 300)
        {
            return PreviewErr("changes-failed", path,
                $"{provider} returned HTTP {status} for the edit request. {Trim(responseBody, 400)}");
        }

        var content = ExtractMessageContent(responseBody);
        if (content is null)
            return PreviewErr("changes-failed", path, $"{provider} returned no edit content.");

        if (!TryParseEdit(content, out var summary, out var updated, out var changed))
        {
            return PreviewErr("changes-failed", path,
                $"{provider} did not return a usable rewrite of the file.");
        }

        // A no-op reply, or one that just echoes the file, is still a valid preview.
        var actuallyChanged = changed && !string.Equals(updated, original, StringComparison.Ordinal);

        return new CodeChangePreviewResult(
            Ok: true,
            Kind: "ok",
            Path: path,
            Language: lang,
            Original: original,
            Proposed: updated,
            Summary: string.IsNullOrWhiteSpace(summary)
                ? (actuallyChanged ? "Applied the review's suggestions." : "No changes were needed.")
                : summary.Trim(),
            Changed: actuallyChanged,
            OriginalHash: Sha256(original),
            Error: null);
    }

    // ---- step 2: apply ----------------------------------------------------------

    public async Task<CodeChangeApplyResult> ApplyAsync(
        CodeChangeApplyRequest req, CancellationToken ct)
    {
        var path = (req.Path ?? string.Empty).Trim().Trim('"');
        if (path.Length == 0)
            return ApplyErr("path-missing", null, "No path was supplied.");

        var isFile = File.Exists(path);
        if (!isFile && !Directory.Exists(path))
            return ApplyErr("path-missing", path, "This path no longer exists.");
        if (!isFile)
            return ApplyErr("not-a-file", path, "No file found at this path — it points to a folder.");

        var proposed = req.Proposed;
        if (string.IsNullOrEmpty(proposed))
            return ApplyErr("empty", path, "There is no proposed file content to write.");

        if (Encoding.UTF8.GetByteCount(proposed) > _options.MaxFileBytes)
            return ApplyErr("too-large", path,
                $"The proposed file is larger than the {Mb(_options.MaxFileBytes)} write limit.");

        string current;
        try
        {
            current = await File.ReadAllTextAsync(path, ct);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(ex, "Could not re-read {Path} before writing", path);
            return ApplyErr("write-failed", path, $"Could not read the file: {ex.Message}");
        }

        // Staleness guard: the file must be byte-identical to what the preview
        // was generated from, so we never silently clobber an outside edit.
        if (!string.IsNullOrEmpty(req.OriginalHash)
            && !string.Equals(req.OriginalHash, Sha256(current), StringComparison.OrdinalIgnoreCase))
        {
            return ApplyErr("stale", path,
                "The file changed on disk since the preview was generated. " +
                "Re-run \"Make changes to the code\" to review a fresh version.");
        }

        var backupPath = path + ".bak";
        try
        {
            File.Copy(path, backupPath, overwrite: true);
            await File.WriteAllTextAsync(path, proposed, new UTF8Encoding(false), ct);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(ex, "Could not write {Path}", path);
            return ApplyErr("write-failed", path, $"Could not write the file: {ex.Message}");
        }

        _logger.LogInformation("Applied code changes to {Path} (backup {Backup})", path, backupPath);
        return new CodeChangeApplyResult(
            Ok: true,
            Kind: "ok",
            Path: path,
            BackupPath: backupPath,
            BytesWritten: Encoding.UTF8.GetByteCount(proposed),
            Error: null);
    }

    // ---- prompt assembly --------------------------------------------------------

    private static string BuildEditPrompt(
        string path, string lang, string content,
        IReadOnlyList<CodeChangeFinding>? findings,
        IReadOnlyList<CodeChangeSuggestion> suggestions)
    {
        var sb = new StringBuilder();
        sb.Append($"=== FILE: {path} ({lang}) ===\n");
        sb.Append(content);
        if (!content.EndsWith('\n')) sb.Append('\n');
        sb.Append("=== END FILE ===\n\n");

        var real = (findings ?? Array.Empty<CodeChangeFinding>())
            .Where(f => !string.IsNullOrWhiteSpace(f.WhatIsWrong) || !string.IsNullOrWhiteSpace(f.Title))
            .ToList();
        if (real.Count > 0)
        {
            sb.Append("REVIEW FINDINGS (context — explanation only):\n");
            foreach (var f in real)
            {
                var where = f.Line is int ln ? $" (line {ln}{(f.EndLine is int en ? $"–{en}" : "")})" : "";
                sb.Append($"- {f.Title ?? "Issue"}{where}: {f.WhatIsWrong}");
                if (!string.IsNullOrWhiteSpace(f.WhyItIsWrong))
                    sb.Append($" — {f.WhyItIsWrong}");
                sb.Append('\n');
            }
            sb.Append('\n');
        }

        sb.Append("SUGGESTIONS TO APPLY (before/after):\n");
        var n = 0;
        foreach (var s in suggestions)
        {
            n++;
            sb.Append($"--- suggestion {n}");
            if (!string.IsNullOrWhiteSpace(s.Note)) sb.Append($": {s.Note}");
            sb.Append(" ---\n");
            sb.Append("BEFORE:\n").Append(s.Before ?? "(new code — nothing to replace)").Append('\n');
            sb.Append("AFTER:\n").Append(s.After ?? "(remove this code)").Append('\n');
        }
        sb.Append("\nReturn the complete updated file as instructed.");

        return sb.ToString();
    }

    // ---- response parsing -----------------------------------------------------

    private static string? ExtractMessageContent(string responseBody)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            if (doc.RootElement.TryGetProperty("choices", out var choices)
                && choices.ValueKind == JsonValueKind.Array
                && choices.GetArrayLength() > 0
                && choices[0].TryGetProperty("message", out var msg)
                && msg.TryGetProperty("content", out var c)
                && c.ValueKind == JsonValueKind.String)
            {
                return c.GetString();
            }
        }
        catch (JsonException)
        {
            // fall through
        }
        return null;
    }

    private static bool TryParseEdit(
        string content, out string? summary, out string updatedFile, out bool changed)
    {
        summary = null;
        updatedFile = string.Empty;
        changed = false;

        var json = StripFences(content).Trim();
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return false;

            if (root.TryGetProperty("updatedFile", out var uf) && uf.ValueKind == JsonValueKind.String)
                updatedFile = uf.GetString() ?? string.Empty;
            else
                return false;

            if (root.TryGetProperty("summary", out var s) && s.ValueKind == JsonValueKind.String)
                summary = s.GetString();

            changed = !root.TryGetProperty("changed", out var ch)
                      || ch.ValueKind != JsonValueKind.False;

            return updatedFile.Length > 0;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string StripFences(string s)
    {
        var t = s.Trim();
        if (!t.StartsWith("```")) return t;
        var firstNl = t.IndexOf('\n');
        if (firstNl < 0) return t;
        t = t[(firstNl + 1)..];
        var lastFence = t.LastIndexOf("```", StringComparison.Ordinal);
        return lastFence >= 0 ? t[..lastFence] : t;
    }

    // ---- small helpers -------------------------------------------------------

    private static CodeChangePreviewResult PreviewErr(string kind, string? path, string error) =>
        new(false, kind, path, null, null, null, null, false, null, error);

    private static CodeChangeApplyResult ApplyErr(string kind, string? path, string error) =>
        new(false, kind, path, null, 0, error);

    private static string Sha256(string text) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)));

    private static string Mb(int bytes) => $"{bytes / 1_000_000.0:0.#} MB";

    private static string Trim(string s, int max) => s.Length <= max ? s : s[..max] + "…";

    private static string GuessLanguage(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".py" => "python",
            ".js" or ".jsx" or ".mjs" or ".cjs" => "javascript",
            ".ts" or ".tsx" => "typescript",
            ".cs" => "csharp",
            ".java" => "java",
            ".go" => "go",
            ".rb" => "ruby",
            ".rs" => "rust",
            ".cpp" or ".cc" or ".cxx" or ".hpp" or ".h" => "cpp",
            ".c" => "c",
            ".php" => "php",
            ".sh" => "bash",
            ".sql" => "sql",
            ".css" => "css",
            ".html" or ".htm" => "html",
            ".json" => "json",
            ".yml" or ".yaml" => "yaml",
            ".md" => "markdown",
            _ => "text",
        };
    }
}
