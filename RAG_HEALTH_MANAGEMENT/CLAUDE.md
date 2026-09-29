# Plainly — WPF conversion

WPF/C# port of `Plainly App.html` (a static click-through design prototype
for a health-document Q&A app). See
`docs/superpowers/specs/2026-09-29-plainly-wpf-conversion-design.md` for the
full design.

## Toolchain

- .NET SDK: **10.0.400**
- Target framework: `net10.0-windows`
- UI: WPF + XAML
- MVVM: CommunityToolkit.Mvvm

## Solution layout

- `Plainly.Wpf/` — the app (`Views/`, `ViewModels/`, `Models/`, `Services/`,
  `Converters/`, `Resources/`)
- `Plainly.Wpf.Tests/` — xUnit tests for view models

## One-time setup: Archivo font

The prototype uses the Archivo typeface (Google Fonts, SIL Open Font
License) at weights 400/600/800. The app references it from
`Plainly.Wpf/Resources/Fonts/` with a `Segoe UI` fallback, so it builds and
runs without the font files — but to match the prototype exactly, download
these three files from https://fonts.google.com/specimen/Archivo and place
them in `Plainly.Wpf/Resources/Fonts/`:

- `Archivo-Regular.ttf`
- `Archivo-SemiBold.ttf`
- `Archivo-ExtraBold.ttf`

## Build / run / test

Run these yourself from the repo root:

```
dotnet build Plainly.Wpf.sln
dotnet run --project Plainly.Wpf
dotnet test Plainly.Wpf.Tests
```
