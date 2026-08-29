using Microsoft.Extensions.Options;
using PrReviewChat.Api.Models;

namespace PrReviewChat.Api.Services;

/// <summary>
/// Module 5 — validates a single local file path and routes it to the LLM
/// (via the Module 4 analyzer). All single-file logic lives in
/// <see cref="ProcessSingleFileAsync"/> so a future folder loop can call it
/// once per file. Reads files; writes nothing.
/// </summary>
public sealed class FileReviewService
{
    private static readonly HashSet<string> ImageExts = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
    };

    private static readonly HashSet<string> BinaryExts = new(StringComparer.OrdinalIgnoreCase)
    {
        ".xlsx", ".xls", ".xlsm", ".ods", ".pdf", ".zip", ".tar", ".gz", ".tgz",
        ".7z", ".rar", ".docx", ".doc", ".pptx", ".ppt", ".bin", ".exe", ".dll",
        ".so", ".dylib", ".o", ".a", ".class", ".jar", ".parquet", ".db",
        ".sqlite", ".sqlite3", ".mp3", ".mp4", ".mov", ".avi", ".wav", ".ico",
        ".ttf", ".otf", ".woff", ".woff2",
    };

    private const string IpynbMessage =
        "This is a Jupyter notebook (.ipynb). Export it as a Python script first " +
        "— e.g. `jupyter nbconvert --to script \"{0}\"`, or File → Export in " +
        "Jupyter/VS Code — then supply that .py file instead.";

    private const string UnsupportedMessage =
        "This looks like a binary or non-text file (spreadsheet, PDF, archive, " +
        "and so on). Right now only text/code files and images are supported. " +
        "Convert it to text or CSV and supply that instead.";

    private readonly CodeAnalyzer _analyzer;
    private readonly FileReviewOptions _options;
    private readonly ILogger<FileReviewService> _logger;

    public FileReviewService(
        CodeAnalyzer analyzer,
        IOptions<FileReviewOptions> options,
        ILogger<FileReviewService> logger)
    {
        _analyzer = analyzer;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<FileReviewResult> ProcessSingleFileAsync(
        string path, string provider, string model, string apiKey, CancellationToken ct)
    {
        path = path.Trim().Trim('"');

        // 1 — does the path exist at all?
        var isFile = File.Exists(path);
        if (!isFile && !Directory.Exists(path))
            return Err("path-missing", "This path doesn't exist.");

        // 2 — is there a file (not a folder) there?
        if (!isFile)
            return Err("not-a-file", "No file found at this path — it points to a folder.");

        var ext = Path.GetExtension(path);

        // 3 — .ipynb: redirect, never sent to the LLM.
        if (string.Equals(ext, ".ipynb", StringComparison.OrdinalIgnoreCase))
        {
            return new FileReviewResult(true, "ipynb-redirect",
                string.Format(IpynbMessage, Path.GetFileName(path)), null, null);
        }

        // 4 — classify and build the analyzer request.
        AnalyzeRequest request;
        try
        {
            if (ImageExts.Contains(ext))
            {
                var bytes = await File.ReadAllBytesAsync(path, ct);
                if (bytes.Length > _options.ImageMaxBytes)
                    return Err("too-large",
                        $"This image is larger than the {Mb(_options.ImageMaxBytes)} review limit.");

                var dataUrl = $"data:{MimeFor(ext)};base64,{Convert.ToBase64String(bytes)}";
                request = new AnalyzeRequest(
                    provider, model, null, null, null, null,
                    new[] { new AnalyzeImage(path, dataUrl) });
            }
            else if (BinaryExts.Contains(ext) || await LooksBinaryAsync(path, ct))
            {
                return new FileReviewResult(true, "unsupported", UnsupportedMessage, null, null);
            }
            else
            {
                var info = new FileInfo(path);
                if (info.Length > _options.MaxFileBytes)
                    return Err("too-large",
                        $"This file is larger than the {Mb(_options.MaxFileBytes)} review limit.");

                var content = await File.ReadAllTextAsync(path, ct);
                request = new AnalyzeRequest(
                    provider, model, null,
                    new[] { new AnalyzeFile(path, content, null, null) },
                    null, null, null);
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(ex, "Could not read {Path}", path);
            return Err("review-failed", $"Could not read the file: {ex.Message}");
        }

        // 5 — real round trip through the Module 4 analyzer.
        var analysis = await _analyzer.AnalyzeAsync(provider, apiKey, request, ct);
        return analysis.Ok
            ? new FileReviewResult(true, "review", null, analysis, null)
            : new FileReviewResult(false, "review-failed", null, analysis, analysis.Error);
    }

    private static FileReviewResult Err(string kind, string error) =>
        new(false, kind, null, null, error);

    private static string Mb(int bytes) => $"{bytes / 1_000_000.0:0.#} MB";

    private static string MimeFor(string ext) => ext.ToLowerInvariant() switch
    {
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".bmp" => "image/bmp",
        _ => "application/octet-stream",
    };

    private static async Task<bool> LooksBinaryAsync(string path, CancellationToken ct)
    {
        try
        {
            await using var fs = File.OpenRead(path);
            var buf = new byte[Math.Min(8192, (int)Math.Min(fs.Length, int.MaxValue))];
            var read = await fs.ReadAsync(buf, ct);
            for (var i = 0; i < read; i++)
                if (buf[i] == 0) return true;
            return false;
        }
        catch
        {
            return false;
        }
    }
}
