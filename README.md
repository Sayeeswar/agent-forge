# agent-forge

A collection of assistant / agent experiments.

- **`pr-review-chat`** — a React + C# chat app that reviews code with an LLM.
  Connect your own OpenAI/OpenRouter key and a GitHub token, point it at a GitHub
  pull request or a local file, and it returns findings (what's wrong, why,
  `file:line`, severity) in the chat plus suggested before/after fixes in a side
  panel. Follow-up questions continue the review. All provider/LLM calls run on
  the C# backend. See [`pr-review-chat/README.md`](pr-review-chat/README.md).

- **`image and excel rag`** — a RAG **Python script** that reads an image and
  explains its contents. The **.ipynb** file **isn't working**.
