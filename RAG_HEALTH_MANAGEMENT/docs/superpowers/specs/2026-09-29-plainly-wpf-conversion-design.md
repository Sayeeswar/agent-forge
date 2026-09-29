# Plainly — HTML Prototype to WPF Conversion

Date: 2026-09-29
Status: Approved

## Source

`Plainly App.html` is a self-extracting "bundler" export from a design-canvas
tool (not hand-authored HTML). It contains three fully static screens with
hardcoded mock data and simulated interactivity — a click-through prototype
for a desktop app called **Plainly**, which lets a user upload their own
health documents (lab reports) and ask questions answered by citing those
documents plus a small fixed library of health-topic reference documents.

Decoded screens (see wireframes below):
1. **Chat Screen** — Q&A thread with numbered inline citations, a source
   panel showing the cited document excerpt, and chat history in the sidebar.
2. **Upload Report** — drop zone + a table of reports in different upload
   states (uploading / reading / ready).
3. **Document Library** — tabbed view of the user's own reports (with
   delete) and the fixed reference documents, grouped by health topic.

All three share a persistent left sidebar (brand, nav, "N documents ready"
footer) and a bottom disclaimer footer.

## Wireframes

```
CHAT (264px sidebar | flex chat | 456px source panel)
┌─────────────┬──────────────────────────────────────┬────────────────────┐
│ Plainly      │ <session title>            <time>    │ Source  [1][2]  X  │
│──────────────│───────────────────────────────────────│ <doc title>         │
│▸ Chat        │ You asked: <question>                  │ <meta>              │
│  Prev chats ▾│                                         │ <page label>        │
│   session…   │ Answer: <paragraphs with [n] citations>│ <heading>           │
│  Upload      │  [HbA1c range bar — main session only] │ ...before...        │
│  Report      │  Where this answer came from: [1][2]   │ ▓highlighted▓       │
│  Document    │  You could also ask: <chips>           │ ...after...         │
│  Library     │                                         │ [Open full document]│
│──────────────│─────────────────────────────────────────│                     │
│ N documents  │ [📎 Attach] [Type your question…] [Send]│                     │
├──────────────┴──────────────────────────────────────┴────────────────────┤
│ ⓘ disclaimer                                                               │
└──────────────────────────────────────────────────────────────────────────┘

UPLOAD REPORT (264px sidebar | flex)
┌─────────────┬──────────────────────────────────────────────────────────┐
│ (same nav)   │ Upload a report                                          │
│              │ [drop zone: Choose file]      [privacy blurb]            │
│              │ Your recent reports:                                     │
│              │  <name>  <added>  [progress bar | reading spinner | Ready+CTA] │
├──────────────┴──────────────────────────────────────────────────────────┤
│ ⓘ disclaimer                                                              │
└──────────────────────────────────────────────────────────────────────────┘

DOCUMENT LIBRARY (264px sidebar | flex)
┌─────────────┬──────────────────────────────────────────────────────────┐
│ (same nav)   │ Document Library      [My Reports][Health Documents] 🔍  │
│              │ My Reports: table with Ask-about + Delete (confirm modal)│
│              │ Health Documents: grouped by topic                       │
├──────────────┴──────────────────────────────────────────────────────────┤
│ ⓘ disclaimer                                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

## Decisions

- **Runtime**: .NET SDK 10.0.400, `net10.0-windows`, WPF, C#, XAML.
- **MVVM**: `CommunityToolkit.Mvvm` (`ObservableObject`, `[ObservableProperty]`,
  `[RelayCommand]`) — source-generated, minimal boilerplate.
- **Interactivity scope**: full click-through prototype fidelity — same mock
  data as the HTML, real navigation/tabs/dialogs/highlighting/simulated
  upload progress. No real backend, OCR, or file persistence.
- **Fonts**: embed Archivo (Regular/SemiBold/ExtraBold TTF, SIL Open Font
  License, from Google Fonts) under `Resources/Fonts/`, referenced with a
  `Segoe UI` fallback so the app still renders correctly if the TTF files are
  not present. The font binaries are not fetched as part of this change —
  see CLAUDE.md for the one-time manual step to add them.
- **Location**: new `Plainly.Wpf/` solution inside
  `C:\Users\sayee\rag_chatbot_health`.

## Architecture

Single `MainWindow`-equivalent shell (`ShellWindow`) hosting a persistent
`SidebarView` and a `ContentControl` bound to `ShellViewModel.CurrentViewModel`.
Screens are `UserControl` + `ObservableObject` pairs resolved via
`DataTemplate`s keyed by view-model type (view-model-first navigation — no
`Frame`/`Page`, unnecessary for 3 flat screens). `INavigationService` lets a
view model request a screen switch with an optional parameter (e.g.
"Ask about this report" carries the report name into `ChatViewModel`,
mirroring the HTML's `?report=` query parameter).

```
Plainly.Wpf/
  App.xaml(.cs)
  Views/          ShellWindow, SidebarView, ChatView, UploadReportView,
                  DocumentLibraryView, DeleteConfirmDialog
  ViewModels/     ShellViewModel, ChatViewModel, UploadReportViewModel,
                  DocumentLibraryViewModel, UploadRowViewModel,
                  LibraryReportRowViewModel
  Models/         HealthDocumentSource, ChatSessionSummary, UploadDemoRow,
                  LibraryReport, DocumentTopicGroup, DocumentEntry
  Services/       IMockDataService/MockDataService, INavigationService/
                  NavigationService
  Converters/     EqualityToBrushConverter, InverseBooleanToVisibilityConverter
  Resources/      Theme.xaml, Styles.xaml, Fonts/
Plainly.Wpf.Tests/
  ChatViewModelTests.cs, DocumentLibraryViewModelTests.cs
```

### Design system → WPF resources

Modernist tokens become `Theme.xaml`: `SolidColorBrush` for bg `#f3f2f2`,
ink `#201e1d`, accent `#ec3013`, accent-2 `#e15b47`, and the neutral
100–900 / accent 100–900 ramps; `Thickness`/`CornerRadius` set to the
2px-divider, 0-radius, 4/8/12/16/24/32 spacing scale. `Styles.xaml`
translates `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-ghost`, `.input`,
`.card`, `.tag-*`, `.table` into `Style` resources with `Trigger`s for
hover/focus/disabled, applied via `BasedOn` + `TargetType` so each XAML
view just sets `Style="{StaticResource BtnPrimary}"` etc.

### Screen behavior

- **Chat**: main session (index 0) is the hardcoded HbA1c conversation
  (2 citations, range bar, follow-up chips) — not data-driven, matching the
  source HTML where this content is literally inline markup. Sessions 1–5
  are data-driven from `MockDataService` (question, paragraphs, one shared
  citation each). `ActiveCitationId` (nullable int) drives citation-button
  highlighting and the right-hand source panel; `null` shows the
  "select a source" empty state. Previous-chats list is collapsible
  (`HistoryOpen` bool). Selecting a session resets `ActiveCitationId` to
  that session's citation (or `1` for main).
- **Upload Report**: drop zone uses WPF native `AllowDrop`/`Drop` for real
  drag-and-drop, plus `OpenFileDialog` for "Choose file" — dropped/chosen
  files are cosmetic (added to the table as a new "Uploading" row that
  animates to "Ready" via `DispatcherTimer`, same as the HTML's simulated
  progress); no OCR or persistence. The four seeded demo rows reproduce the
  HTML's fixed uploading/reading/ready/ready states exactly.
- **Document Library**: `My Reports` / `Health Documents` tab toggle, a
  search box filtering both collections client-side (matches the HTML's
  substring match over name/tags and topic/title/desc), delete opens
  `DeleteConfirmDialog` (a small owned `Window`, not a full dialog-service
  framework — appropriate given there's exactly one modal in the app).

### Data

`MockDataService` seeds, once per app instance:
- 7 `HealthDocumentSource` entries (the citation targets, ids 1–7)
- 6 `ChatSessionSummary` entries (main + 5 prior sessions)
- 4 `UploadDemoRow` entries (Upload screen's fixed demo states)
- 4 `LibraryReport` entries (Document Library's deletable "My Reports")
- 3 `DocumentTopicGroup` entries (Diabetes / Thyroid / Heart Health)

All copied verbatim (names, dates, body text) from the decoded HTML so the
WPF app is a faithful port, not a redesign. Composition root
(`App.xaml.cs`) hand-wires services and view models — no DI container,
given the small object graph.

### Testing

`Plainly.Wpf.Tests` (xUnit): view-model-level tests only — citation
switching updates the source panel, session switching resets state, tab
switching and search filtering narrow the right collections, delete opens
the confirm dialog and removes the row on confirm. No UI automation.

## Out of scope

Real file upload/OCR/persistence, backend integration, accessibility pass
beyond what WPF gives by default, packaging/installer, light/dark theme
toggle (source HTML is light-only).
