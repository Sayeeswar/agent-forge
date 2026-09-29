# Plainly

A WPF desktop port of the **Plainly** prototype — a health-document Q&A app
that lets you upload your own lab reports and ask questions, with answers
citing the exact document and passage they came from.

This is a click-through prototype: the mock data (reports, chat history,
citations) is seeded in code, not read from real files, and there's no OCR
or backend behind it. See
[`docs/superpowers/specs/2026-09-29-plainly-wpf-conversion-design.md`](docs/superpowers/specs/2026-09-29-plainly-wpf-conversion-design.md)
for the full design.

## Prerequisites

- **.NET SDK 10.0.400** — [download here](https://dotnet.microsoft.com/download)
- Windows (the app is WPF, Windows-only)

## Running the app

```
git clone https://github.com/Sayeeswar/agent-forge.git
cd agent-forge/RAG_HEALTH_MANAGEMENT
dotnet run --project Plainly.Wpf
```

That restores dependencies, builds, and launches the app in one step.

## Other useful commands

```
dotnet build Plainly.Wpf.sln      # build only
dotnet test Plainly.Wpf.Tests     # run the view-model test suite
```

## Project layout

- `Plainly.Wpf/` — the app (`Views/`, `ViewModels/`, `Models/`, `Services/`,
  `Converters/`, `Resources/`)
- `Plainly.Wpf.Tests/` — xUnit tests for the view models
- `Plainly App.html` — the original click-through design prototype this app
  was converted from
- `docs/` — the design spec this conversion was built from

## Optional: matching the original typeface

The prototype uses the **Archivo** typeface (Google Fonts, SIL Open Font
License). The app falls back to Segoe UI and looks/works fine without it,
but to match the original exactly, download these three files from
[fonts.google.com/specimen/Archivo](https://fonts.google.com/specimen/Archivo)
and place them in `Plainly.Wpf/Resources/Fonts/`:

- `Archivo-Regular.ttf`
- `Archivo-SemiBold.ttf`
- `Archivo-ExtraBold.ttf`
