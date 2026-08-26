using System.Text.Json;
using System.Text.RegularExpressions;

namespace TutorServer;

public static class QuizParser
{
    public static QuizResult? TryParse(string text)
    {
        var match = Regex.Match(text, @"\{[\s\S]*\}");
        if (!match.Success) return null;

        try
        {
            using var doc = JsonDocument.Parse(match.Value);
            var root = doc.RootElement;
            var question = root.GetProperty("question").GetString();
            var options = root.GetProperty("options").EnumerateArray().Select(o => o.GetString() ?? "").ToList();
            var correctIndex = root.GetProperty("correctIndex").GetInt32();

            if (string.IsNullOrEmpty(question)) return null;
            if (options.Count < 3 || options.Count > 4) return null;
            if (correctIndex < 0 || correctIndex >= options.Count) return null;

            return new QuizResult(question, options, correctIndex);
        }
        catch
        {
            return null;
        }
    }

    public static List<string>? TryParseStringArray(string text)
    {
        var match = Regex.Match(text, @"\[[\s\S]*\]");
        if (!match.Success) return null;

        try
        {
            using var doc = JsonDocument.Parse(match.Value);
            return doc.RootElement.EnumerateArray()
                .Select(e => e.GetString())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s!)
                .ToList();
        }
        catch
        {
            return null;
        }
    }
}
