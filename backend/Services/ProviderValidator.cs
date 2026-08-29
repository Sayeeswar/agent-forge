using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PrReviewChat.Api.Models;

namespace PrReviewChat.Api.Services;

/// <summary>
/// Validates a provider API key by making a real (tiny) chat-completion call.
/// For providers with several candidate models it walks the list and accepts the
/// key as soon as one model answers. Never writes anything — the caller decides
/// what to do with a successful result.
/// </summary>
public sealed class ProviderValidator
{
    private const int MaxBodySnippet = 2000;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ApiKeysOptions _options;
    private readonly ILogger<ProviderValidator> _logger;

    public ProviderValidator(
        IHttpClientFactory httpClientFactory,
        IOptions<ApiKeysOptions> options,
        ILogger<ProviderValidator> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public bool TryGetProvider(string provider, out ProviderOptions config) =>
        _options.Providers.TryGetValue(provider, out config!);

    public async Task<ValidateKeyResult> ValidateAsync(
        string provider, string apiKey, CancellationToken ct)
    {
        if (!TryGetProvider(provider, out var config))
        {
            return new ValidateKeyResult(false, provider, null, null,
                $"Unknown provider '{provider}'.");
        }

        var prompt = _options.ValidationPrompt;
        var attempts = new List<ProviderAttempt>();

        ProviderRequestInfo? lastRequest = null;
        ProviderResponseInfo? lastResponse = null;
        string? lastError = null;

        foreach (var model in config.EffectiveModels)
        {
            ct.ThrowIfCancellationRequested();

            var requestInfo = new ProviderRequestInfo(config.ChatCompletionsUrl, model, prompt);
            lastRequest = requestInfo;

            var (status, body, transportError) =
                await SendAsync(config, model, prompt, apiKey, ct);

            if (transportError is not null)
            {
                lastResponse = new ProviderResponseInfo(0, null, null);
                lastError = transportError;
                attempts.Add(new ProviderAttempt(model, 0, false, transportError));
                continue;
            }

            var snippet = Trim(body);

            // A rejected key fails the same way for every model — stop early.
            if (status is 401 or 403)
            {
                attempts.Add(new ProviderAttempt(model, status, false, "key rejected"));
                return new ValidateKeyResult(false, provider, requestInfo,
                    new ProviderResponseInfo(status, null, snippet),
                    $"{provider} rejected the key (HTTP {status}).",
                    attempts);
            }

            if (status is >= 200 and < 300)
            {
                var replyText = ExtractReplyText(body);
                if (replyText is not null)
                {
                    attempts.Add(new ProviderAttempt(model, status, true, null));
                    return new ValidateKeyResult(true, provider, requestInfo,
                        new ProviderResponseInfo(status, replyText, null), null, attempts);
                }

                lastResponse = new ProviderResponseInfo(status, null, snippet);
                lastError = $"{provider} returned HTTP {status} for {model} " +
                            "but no assistant message could be parsed.";
                attempts.Add(new ProviderAttempt(model, status, false, "unparseable response"));
                continue;
            }

            // 404 (model retired), 429 (rate limited), 5xx, ... — try the next model.
            lastResponse = new ProviderResponseInfo(status, null, snippet);
            lastError = $"{model} → HTTP {status}";
            attempts.Add(new ProviderAttempt(model, status, false, $"HTTP {status}"));
        }

        return new ValidateKeyResult(false, provider, lastRequest, lastResponse,
            lastError ?? $"No {provider} model accepted the request.", attempts);
    }

    private async Task<(int Status, string Body, string? TransportError)> SendAsync(
        ProviderOptions config, string model, string prompt, string apiKey, CancellationToken ct)
    {
        var payload = new
        {
            model,
            messages = new[] { new { role = "user", content = prompt } },
            max_tokens = _options.MaxTokens,
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, config.ChatCompletionsUrl)
        {
            Content = new StringContent(
                JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        // OpenRouter asks for these; harmless for OpenAI.
        request.Headers.TryAddWithoutValidation("HTTP-Referer", _options.CorsOrigin);
        request.Headers.TryAddWithoutValidation("X-Title", "PR Review Chat");

        var client = _httpClientFactory.CreateClient("provider");

        try
        {
            var response = await client.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            return ((int)response.StatusCode, body, null);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "Validation call for model {Model} failed to complete", model);
            return (0, "", $"Could not reach the provider for {model}: {ex.Message}");
        }
    }

    private static string Trim(string body) =>
        body.Length <= MaxBodySnippet ? body : body[..MaxBodySnippet] + "…";

    private static string? ExtractReplyText(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("choices", out var choices)
                || choices.ValueKind != JsonValueKind.Array
                || choices.GetArrayLength() == 0)
            {
                return null;
            }

            var first = choices[0];
            if (first.TryGetProperty("message", out var message)
                && message.TryGetProperty("content", out var content)
                && content.ValueKind == JsonValueKind.String)
            {
                return content.GetString()?.Trim() is { Length: > 0 } s ? s : "(empty reply)";
            }

            return null;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
