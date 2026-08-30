using Microsoft.Extensions.Options;
using PrReviewChat.Api.Models;

namespace PrReviewChat.Api.Services;

/// <summary>
/// Minimal reader/writer for a flat <c>.env</c> file: one <c>KEY=value</c> per line.
/// Upsert replaces only the target line and leaves everything else (comments,
/// blank lines, other keys) byte-for-byte intact.
/// </summary>
public sealed class DotEnvFile
{
    private readonly string _path;

    public DotEnvFile(IOptions<ApiKeysOptions> options, IHostEnvironment env)
    {
        var configured = options.Value.DotEnvPath;
        _path = !string.IsNullOrWhiteSpace(configured)
            ? System.IO.Path.GetFullPath(configured)
            : System.IO.Path.GetFullPath(
                System.IO.Path.Combine(env.ContentRootPath, "..", ".env"));
    }

    public string Path => _path;

    /// <summary>Returns the non-empty value for <paramref name="key"/>, or null.</summary>
    public string? Get(string key)
    {
        if (!File.Exists(_path)) return null;

        foreach (var raw in File.ReadAllLines(_path))
        {
            var line = raw.TrimStart();
            if (line.Length == 0 || line[0] == '#') continue;

            var eq = line.IndexOf('=');
            if (eq <= 0) continue;

            if (line[..eq].Trim() == key)
            {
                var value = line[(eq + 1)..].Trim();
                return value.Length == 0 ? null : value;
            }
        }

        return null;
    }

    /// <summary>Creates the file if needed and sets <c>key=value</c>, replacing any existing line.</summary>
    public void Upsert(string key, string value)
    {
        var dir = System.IO.Path.GetDirectoryName(_path);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        var lines = File.Exists(_path)
            ? new List<string>(File.ReadAllLines(_path))
            : new List<string>();

        var newLine = $"{key}={value}";
        var replaced = false;

        for (var i = 0; i < lines.Count; i++)
        {
            var trimmed = lines[i].TrimStart();
            if (trimmed.Length == 0 || trimmed[0] == '#') continue;

            var eq = trimmed.IndexOf('=');
            if (eq > 0 && trimmed[..eq].Trim() == key)
            {
                lines[i] = newLine;
                replaced = true;
                break;
            }
        }

        if (!replaced) lines.Add(newLine);

        File.WriteAllText(_path, string.Join(Environment.NewLine, lines) + Environment.NewLine);
    }
}
