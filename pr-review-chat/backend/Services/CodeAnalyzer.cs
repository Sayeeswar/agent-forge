using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PrReviewChat.Api.Models;

namespace PrReviewChat.Api.Services;

/// <summary>
/// Sends already-fetched code to the selected chat-completions provider and asks
/// for a structured review (errors + clean-code issues). Static analysis only —
/// runs nothing, writes nothing.
/// </summary>
public sealed class CodeAnalyzer
{
    private static readonly HashSet<string> Severities =
        new(StringComparer.OrdinalIgnoreCase) { "Low", "Medium", "High" };

    private const string SystemPrompt = """
        You are a meticulous senior code reviewer. You are given source files
        (full file content and/or a unified diff), or a single file, or an image
        (e.g. a screenshot of code, a diagram, or a chart). Statically review
        what you are given — you cannot run it. Review an image against the same
        standards below wherever they apply.

        Detect and report:
        - Syntax errors
        - Type errors
        - Logic bugs (including edge cases)
        - Failing tests, when test files are included in the input
        - Lint / style violations

        Also evaluate against clean-code standards, and report violations as
        findings (use "warning": true for informational, non-blocking ones):
        - Readability & naming: clear, descriptive names; casing consistent with
          the file's language.
        - DRY: flag meaningfully duplicated logic.
        - SOLID, where it applies to the language/file.
        - Error handling: no silent failures; messages should be meaningful.
        - Security basics: no hardcoded secrets/credentials, no obvious injection.
        - Performance red flags: obviously wasteful patterns (needless loops,
          repeated expensive calls).
        - Language idioms: follow the language's conventions (e.g. PEP 8 for
          Python).
        - Consistency: flag new code that clashes with the style already used in
          the same file/PR.
        - Compiler/linter-level warnings, even when not outright bugs.

        Severity — use exactly one of Low, Medium, High:
        - Low: code is logically correct but fails to execute (terminal or
          .ipynb) — an environment/execution issue, not a logic problem.
        - Medium: edge-case bugs — logic issues that only surface in less common
          scenarios.
        - High: important/core logic is wrong — bugs affecting the main
          functionality.

        Reply with a SINGLE JSON object, no prose around it, of exactly this
        shape:
        {
          "summary": "1-4 sentence plain-text overview. NO code.",
          "findings": [
            {
              "title": "short label",
              "description": "clear, human-readable explanation of the issue",
              "whatIsWrong": "the symptom",
              "whyItIsWrong": "the root cause, not just the symptom",
              "file": "path exactly as given in the input",
              "line": 42,
              "endLine": 45,
              "severity": "Low | Medium | High",
              "category": "syntax | type | logic | test | lint | readability | dry | solid | error-handling | security | performance | idioms | consistency",
              "warning": false
            }
          ],
          "suggestions": [
            {
              "file": "path as given",
              "language": "python",
              "before": "the current code being changed",
              "after": "the corrected code",
              "note": "optional one-liner"
            }
          ]
        }

        Rules:
        - "summary" and "findings" contain NO code blocks or snippets — only
          explanation, root cause, file + line, severity.
        - ALL code goes in "suggestions" as before/after pairs.
        - "line" is 1-based and refers to the given file content; omit it (or use
          null) if you cannot pin it down. "endLine" is optional.
        - If you find nothing wrong, return an empty "findings" array and say so
          in "summary".
        - Do not invent issues to fill space.
        """;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ApiKeysOptions _apiKeys;
    private readonly AnalysisOptions _options;
    private readonly ILogger<CodeAnalyzer> _logger;

    public CodeAnalyzer(
        IHttpClientFactory httpClientFactory,
        IOptions<ApiKeysOptions> apiKeys,
        IOptions<AnalysisOptions> options,
        ILogger<CodeAnalyzer> logger)
    {
        _httpClientFactory = httpClientFactory;
        _apiKeys = apiKeys.Value;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AnalysisResult> AnalyzeAsync(
        string provider, string apiKey, AnalyzeRequest req, CancellationToken ct)
    {
        if (!_apiKeys.Providers.TryGetValue(provider, out var cfg))
            return Fail(null, $"Unknown provider '{provider}'.");

        var model = string.IsNullOrWhiteSpace(req.Model) ? cfg.Model : req.Model!.Trim();
        var meta = new AnalysisMeta(provider, model, 0, 0);

        var (codePayload, promptChars, truncated) = BuildCodePayload(req);
        meta = meta with { PromptChars = promptChars, TruncatedFiles = truncated };

        var images = req.Images ?? Array.Empty<AnalyzeImage>();
        var hasHistory = (req.History?.Count ?? 0) > 0;

        if (promptChars == 0 && images.Count == 0 && !hasHistory)
            return Fail(meta, "No file content, diff, or image was supplied to analyze.");

        var instruction = string.IsNullOrWhiteSpace(req.Instruction)
            ? "Review the supplied code for errors and issues per the standards."
            : req.Instruction!.Trim();

        var messages = new List<object> { new { role = "system", content = SystemPrompt } };
        foreach (var h in req.History ?? Array.Empty<AnalyzeMessage>())
        {
            var role = h.Role?.Trim().ToLowerInvariant() is "assistant" ? "assistant" : "user";
            if (!string.IsNullOrWhiteSpace(h.Text))
                messages.Add(new { role, content = h.Text });
        }

        if (images.Count > 0)
        {
            var text = codePayload.Length > 0
                ? $"{codePayload}\n\n{instruction}"
                : instruction;
            var parts = new List<object> { new { type = "text", text } };
            foreach (var img in images)
                parts.Add(new { type = "image_url", image_url = new { url = img.DataUrl } });
            messages.Add(new { role = "user", content = parts });
        }
        else
        {
            if (codePayload.Length > 0)
                messages.Add(new { role = "user", content = codePayload });
            messages.Add(new { role = "user", content = instruction });
        }

        var body = new
        {
            model,
            messages,
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
            _logger.LogWarning(ex, "Analysis call to {Provider} failed", provider);
            return Fail(meta, $"Could not reach {provider}: {ex.Message}");
        }

        if (status is < 200 or >= 300)
        {
            return Fail(meta,
                $"{provider} returned HTTP {status} for the analysis request. {Trim(responseBody, 400)}");
        }

        var content = ExtractMessageContent(responseBody);
        if (content is null)
            return Fail(meta, $"{provider} returned no analysis content.");

        return ParseResult(content, meta);
    }

    // ---- payload assembly -----------------------------------------------------

    private (string Payload, int Chars, int Truncated) BuildCodePayload(AnalyzeRequest req)
    {
        var sb = new StringBuilder();
        var truncated = 0;
        var files = req.Files ?? Array.Empty<AnalyzeFile>();
        var used = 0;

        for (var i = 0; i < files.Count; i++)
        {
            if (i >= _options.MaxFiles || used >= _options.MaxInputChars)
            {
                truncated = files.Count - i;
                break;
            }

            var f = files[i];
            var lang = string.IsNullOrWhiteSpace(f.Language)
                ? GuessLanguage(f.Path)
                : f.Language!;
            var block = new StringBuilder();
            block.Append($"=== {f.Path} ({lang}) ===\n");
            if (!string.IsNullOrEmpty(f.Content))
                block.Append(f.Content).Append('\n');
            if (!string.IsNullOrEmpty(f.Patch))
                block.Append("--- patch ---\n").Append(f.Patch).Append('\n');
            block.Append('\n');

            if (used + block.Length > _options.MaxInputChars)
            {
                truncated = files.Count - i;
                break;
            }

            sb.Append(block);
            used += block.Length;
        }

        if (!string.IsNullOrWhiteSpace(req.Diff) && used < _options.MaxInputChars)
        {
            var diff = req.Diff!;
            if (used + diff.Length > _options.MaxInputChars)
                diff = diff[..(_options.MaxInputChars - used)];
            sb.Append("=== combined diff ===\n").Append(diff).Append('\n');
            used += diff.Length;
        }

        return (sb.ToString(), used, truncated);
    }

    // ---- response parsing ---------------------------------------------------------

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

    private AnalysisResult ParseResult(string content, AnalysisMeta meta)
    {
        var json = StripFences(content).Trim();

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json);
        }
        catch (JsonException)
        {
            // Model ignored JSON mode — still show its prose in the chat.
            return new AnalysisResult(true, content.Trim(), Array.Empty<AnalysisFinding>(),
                Array.Empty<AnalysisSuggestion>(), meta, null);
        }

        using (doc)
        {
            var root = doc.RootElement;
            var summary = Str(root, "summary") ?? "Analysis complete.";

            var findings = new List<AnalysisFinding>();
            if (root.TryGetProperty("findings", out var fs) && fs.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in fs.EnumerateArray())
                {
                    if (el.ValueKind != JsonValueKind.Object) continue;
                    var file = Str(el, "file") ?? "";
                    var what = Str(el, "description")
                        ?? Str(el, "whatIsWrong")
                        ?? Str(el, "what")
                        ?? "";
                    if (file.Length == 0 && what.Length == 0) continue;

                    findings.Add(new AnalysisFinding(
                        Title: Str(el, "title") ?? "Issue",
                        WhatIsWrong: what,
                        WhyItIsWrong: Str(el, "whyItIsWrong") ?? Str(el, "why") ?? Str(el, "reason") ?? "",
                        File: file,
                        Line: Int(el, "line"),
                        EndLine: Int(el, "endLine"),
                        Severity: NormalizeSeverity(Str(el, "severity")),
                        Category: (Str(el, "category") ?? "other").Trim().ToLowerInvariant(),
                        Warning: Bool(el, "warning")));
                }
            }

            var suggestions = new List<AnalysisSuggestion>();
            if (root.TryGetProperty("suggestions", out var ss) && ss.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in ss.EnumerateArray())
                {
                    if (el.ValueKind != JsonValueKind.Object) continue;
                    var before = Str(el, "before") ?? "";
                    var after = Str(el, "after") ?? "";
                    if (before.Length == 0 && after.Length == 0) continue;

                    var file = Str(el, "file") ?? "";
                    suggestions.Add(new AnalysisSuggestion(
                        File: file,
                        Language: Str(el, "language") ?? GuessLanguage(file),
                        Before: before,
                        After: after,
                        Note: Str(el, "note")));
                }
            }

            return new AnalysisResult(true, summary, findings, suggestions, meta, null);
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

    private static string NormalizeSeverity(string? raw)
    {
        if (raw is null) return "Medium";
        raw = raw.Trim();
        if (Severities.Contains(raw))
            return char.ToUpperInvariant(raw[0]) + raw[1..].ToLowerInvariant();
        return "Medium";
    }

    private static string GuessLanguage(string path)
    {
        var ext = System.IO.Path.GetExtension(path).ToLowerInvariant();
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
            ".ipynb" => "jupyter",
            _ => "text",
        };
    }

    private AnalysisResult Fail(AnalysisMeta? meta, string error) =>
        new(false, null, null, null, meta, error);

    private static string Trim(string s, int max) =>
        s.Length <= max ? s : s[..max] + "…";

    private static string? Str(JsonElement el, string prop) =>
        el.ValueKind == JsonValueKind.Object
        && el.TryGetProperty(prop, out var v)
        && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static int? Int(JsonElement el, string prop)
    {
        if (el.ValueKind != JsonValueKind.Object || !el.TryGetProperty(prop, out var v))
            return null;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n)) return n;
        if (v.ValueKind == JsonValueKind.String && int.TryParse(v.GetString(), out var m)) return m;
        return null;
    }

    private static bool Bool(JsonElement el, string prop) =>
        el.ValueKind == JsonValueKind.Object
        && el.TryGetProperty(prop, out var v)
        && v.ValueKind == JsonValueKind.True;
}
