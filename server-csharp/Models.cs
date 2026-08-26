namespace TutorServer;

public record ChatMessage(string Role, string Content);

public record LearnerProfile(string? LearnerType, string? Level, string? University, string? Degree);

public record ChatRequest(
    string? Topic,
    List<ChatMessage>? History,
    string? Message,
    string? Model,
    LearnerProfile? Profile,
    string? Subtopic,
    string? Material
);

public record ChatResponse(string Reply);

public record QuizRequest(
    string? Topic,
    string? Model,
    LearnerProfile? Profile,
    string? Subtopic,
    string? Material
);

public record QuizResult(string Question, List<string> Options, int CorrectIndex);

public record DegreesRequest(string? University, string? Level);

public record DegreesResponse(List<string> Degrees);

public record ErrorResponse(string Error);
