// Placeholder / sample data for Module 1. No network, no backend.

// Models shown in the top-bar dropdown, per provider. The list swaps when the
// active provider changes (see AppStateContext SET_PROVIDER). Validation of the
// key itself uses a fixed model per provider on the backend, not these.
export const providerModels = {
  openrouter: [
    'liquid/lfm-2.5-2.6b:free',
    'nvidia/nemotron-3.5-lightning:free',
    'z-ai/glm-5.2:free',
    'poolside/laguna-s-2.1:free',
  ],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
};

// Shown one-by-one under the spinner while a reply is "loading".
// Placeholder copy for this module — real status wiring comes later.
export const statusMessages = [
  'API is loaded',
  'Reading the file',
  'Sending to the LLM',
];

// Sample code surfaced in the right-side panel when a reply proposes a change.
export const sampleCode = {
  filename: 'src/utils/parsePr.js',
  language: 'javascript',
  content: `// Parse a GitHub PR URL into { owner, repo, number }.
export function parsePrUrl(url) {
  const match = String(url).match(
    /github\\.com\\/([^/]+)\\/([^/]+)\\/pull\\/(\\d+)/
  );

  if (!match) {
    throw new Error('Not a recognizable GitHub PR URL: ' + url);
  }

  const [, owner, repo, number] = match;

  return { owner, repo, number: Number(number) };
}
`,
};

// Canned assistant replies, consumed in order; the last one repeats.
// Explanations live here (chat only). Code lives in `code` (panel only) —
// the two never duplicate.
export const cannedReplies = [
  {
    text:
      "Thanks — I've taken a look. The PR link parsing is the weak spot: it " +
      'assumes a fixed URL shape and throws an unhelpful error on anything ' +
      'else. I drafted a small helper that validates the URL and returns the ' +
      'owner, repo, and PR number as a structured object. The proposed code ' +
      'is in the panel on the right.',
    code: sampleCode,
  },
  {
    text:
      'A few smaller notes: the function name could be clearer, and the ' +
      'regex should be anchored so it does not match mid-string. Nothing ' +
      'blocking — happy to fold these in if you want a revised version.',
  },
  {
    text:
      'No further issues stand out on this pass. Let me know if you want me ' +
      'to look at a specific file or widen the review.',
  },
];
