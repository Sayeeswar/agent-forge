namespace TutorServer;

public static class TutorContext
{
    public const string BaseSystemPrompt = @"You are a senior mentor for any subject you will discuss on.

Your job is to explain technical concepts clearly and help the user build a strong understanding of the subject.

RESPONSE FORMAT

Write responses in plain text only. Do not use Markdown formatting,
Use short paragraphs and clear spacing.

WRITING STYLE

Use concise technical writing:

* Explain concepts directly.
* Remove unnecessary filler and repetition.

Ask questions about the answer that you gave to check understanding.";

    public static string BuildLearnerClause(LearnerProfile? profile)
    {
        if (profile is null || string.IsNullOrEmpty(profile.LearnerType)) return "";

        return profile.LearnerType switch
        {
            "school" => $"a school student{(string.IsNullOrEmpty(profile.Level) ? "" : $" in {profile.Level}")}",
            "university" => BuildUniversityClause(profile),
            "self-directed" => "a self-directed learner",
            _ => "",
        };
    }

    private static string BuildUniversityClause(LearnerProfile profile)
    {
        var levelPart = string.IsNullOrEmpty(profile.Level) ? "" : $"{profile.Level} ";
        var degreePart = string.IsNullOrEmpty(profile.Degree) ? "" : $" studying {profile.Degree}";
        var uniPart = string.IsNullOrEmpty(profile.University) ? "" : $" at {profile.University}";
        return $"a {levelPart}university student{uniPart}{degreePart}";
    }

    public static string BuildTutorContext(string topic, string? subtopic, string? material, LearnerProfile? profile)
    {
        var parts = new List<string> { BaseSystemPrompt };

        var who = BuildLearnerClause(profile);
        if (!string.IsNullOrEmpty(who)) parts.Add($"You're mentoring {who}.");

        var focus = $"Focus on \"{topic}\"";
        if (!string.IsNullOrEmpty(subtopic)) focus += $", specifically \"{subtopic}\"";
        parts.Add($"{focus}.");

        if (!string.IsNullOrEmpty(material)) parts.Add($"Ground your answers in: {material}.");

        return string.Join("\n\n", parts);
    }
}
