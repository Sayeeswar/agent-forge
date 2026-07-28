# Sarthi Catering App — Design Spec

**Date:** 2026-07-15
**Status:** Approved (design); open questions resolved 2026-07-16 (see *Resolved decisions*); pending implementation plan
**Framework:** Reflex 0.9.6 (Python), Tailwind V4 plugin enabled

## Goal

Componentized, fully interactive mock of Sarthi catering ordering flow — mobile-first single-page app matching 7 provided design screenshots
(`assets/01`–`07`). Menu → date → profile → cart → container packing → payment →
success. All state and events real; payment mocked but shaped so real
Razorpay drops in later.

## Locked-in decisions

| Topic | Decision |
| --- | --- |
| Scope | Full working flow, all screens |
| Layout | Hybrid: `state/` package (3 states) + `components/` (atoms) + `pages/` (screens) |
| Behavior | Fully interactive — real state & event handlers |
| Data | Hardcoded: real Rotis & Breads items + invented veg items for other categories |
| Payment | Mocked; `pay` handler shaped so real Razorpay drops in cleanly later |
| Phone frame | **No bezel.** Mobile-first: ~430px column on phone; two-pane fills viewport on tablet/desktop |
| Auth | Hardcoded mock user "Priya S." |
| Container packing | **Medium fidelity**: tap-to-pack, per-container capacity + progress bar, packing fee, Auto-pack. **No** wet/dry rule (DRY tag cosmetic or omitted) |

## Resolved decisions (grilling, 2026-07-16)

Eleven gaps below now settled. Where row **overrides** earlier prose, relevant section also edited to match.

| # | Gap | Decision |
| --- | --- | --- |
| 1 | Empty-cart Pay | `is_fully_packed` also requires `total_portions > 0`, so Pay stays disabled on empty order. |
| 2 | Cart edited after packing | **Any cart change (`add_item`/`inc`/`dec`) resets packing** — all containers cleared. |
| 3 | Font sourcing | **Self-host** Playfair Display + Inter as `@font-face` under **new `assets/fonts/` subfolder** — deliberate one-time exception to CLAUDE.md "don't touch `assets/`" guard rail (existing screenshots + favicon untouched). Font `.woff2` files downloaded once at build time; running app makes no external/CDN font fetch. |
| 4 | Verification depth | Compile + run + one click-through smoke test per screen. **Not** full Playwright screenshot-diff pass. |
| 5 | Calendar fidelity | **Real functional calendar**: real current month, real weekday grid, real `today` outlined, real past dates disabled, working month nav. |
| 6 | Portion unit | **1 cart unit = 1 portion.** `total_portions = sum(cart.values())`. No per-item portion size. |
| 7 | Pack-per-tap | **One unit per tap.** Tapping container packs single unit of `selected_item_to_pack` (until capacity). |
| 8 | Order number | **Random `SAR-####`** (random 4-digit suffix) generated in `pay`. |
| 9 | Default date | **Computed = real today**, formatted `"Thu, 16 Jul"`; not hardcoded literal (keeps consistent with real calendar). |
| 10 | Auto-pack scope | **Augment existing** — keep manually-added containers + their packs; only place currently-unpacked units, opening new containers as needed. (Overrides from-scratch implication.) |
| 11 | Auto-pack goal | **Fewest containers** — prefer larger sizes to minimize container count. (Overrides "cheapest-fitting" wording in *Packing math*.) |

Second grilling round (softer gaps), 2026-07-16:

| # | Gap | Decision |
| --- | --- | --- |
| 12 | Tablet profile drawer vs cart pane | Since right edge = persistent cart pane, profile drawer slides in from **LEFT on tablet/desktop** (still right-side on phone). Avoids collision. |
| 13 | Emptied / mistaken containers | Emptying container **keeps it in place** (ready to re-pack); separate **delete (×) control** removes container + **refunds its fee**. |
| 14 | Overlay dismissal | **Explicit buttons only** (Done / X / primary action). Backdrop taps do **not** dismiss — avoids losing half-filled cart/selection. |
| 15 | Pack selection after item fully packed | **Auto-advance** `selected_item_to_pack` to next item with unpacked units; clears to `None` only when nothing left. |
| 16 | Stepper at qty 1, tap − | **Removes the line** (item deleted from cart); food card reverts to "Add" button. |
| 17 | Delivery date after "Back to menu" | **Reset to today** — `back_to_menu` resets all three states, `selected_date` returns to computed real today (#9). |
| 18 | Auto-pack button availability | **Always enabled**; simply no-op when nothing to pack. |
| 19 | Menu scroll on category switch | **Reset to top** — switching category chips scrolls item list back to section header. |

## Architecture

Single page at `/`. **Menu = always-mounted base layer**.

- **Overlays** (menu stays underneath, dimmed) toggled by boolean flags:
  `show_cart`, `show_date_picker`, `show_profile`. Overlays dismissed by their
  **explicit buttons only** — tapping dimmed backdrop does nothing (#14).
- **Full-screen stages** swap out menu via `stage` var:
  `"menu" | "containers" | "success"`.

Single page means no cross-route state passing; shared state lives on three
purpose-scoped states (see State model), read across states via var operations in
UI and `get_state` in handlers.

### Responsive shell (`components/background.py`)

Cream full-bleed page, mobile-first. Breakpoint switching uses Reflex's display
helper components (confirmed in installed Reflex 0.9.6): **`rx.mobile_only()`** wraps
single-column phone layout, **`rx.tablet_and_desktop()`** (= `tablet_only` +
`desktop_only`) wraps two-pane layout. `rx.tablet_only()` / `rx.desktop_only()`
used where piece must differ between tablet and desktop. Default breakpoints:
mobile ≤ 48em, tablet 48–62em, desktop ≥ 62em.

**Phone (< 768px):** single column, `width: 100%`, `max_width ≈ 430px`, centered —
matches screenshots exactly. Cart / date picker = bottom sheets; profile = right
drawer; containers + success = full-screen stages.

**Tablet / desktop (≥ 768px): two-pane layout filling viewport.**

```
┌──────────────────────────────┬────────────────────────┐
│ LEFT PANE (flex, scrolls)    │ RIGHT PANE (~420px)    │
│ header + category chips +    │ persistent "order rail"│
│ menu list                    │ = cart / "Your order"  │
└──────────────────────────────┴────────────────────────┘
```

Cross-breakpoint mapping (same components, placed differently by breakpoint — not
second UI):

| Element | Phone (< 768px) | Tablet (≥ 768px) |
| --- | --- | --- |
| Cart ("Your order") | Bottom-sheet overlay | **Persistent right pane**, always visible |
| Header "Cart" button | Shown (opens sheet) | Hidden (cart already visible) |
| Empty cart | Sheet not opened | Right pane shows empty state ("Add dishes…") |
| Containers ("Pack your order") | Full-screen stage | **Full-screen stage** (takes over both panes) |
| Success ("Payment received") | Full-screen stage | **Full-screen takeover** (centered card) |
| Date picker | Bottom sheet | Centered **modal dialog** |
| Profile | Right drawer | **Left drawer** (right edge = cart pane — #12) |

`containers` and `success` stages swap out entire two-pane shell at all
breakpoints. `show_cart` still gates phone bottom sheet; on tablet right
pane renders cart directly regardless of `show_cart`.

## Folder structure

Follows repo's Reflex architecture rules (`pages/`, `state/` package) and
**300-line-per-file / 40-line-per-function** caps.

```
cateringv3/
  theme.py                 # color tokens, fonts, shared style dicts
  data.py                  # hardcoded menu: categories + items; container specs
  state/
    __init__.py                  # exports the three states
    customerorderstate.py        # CustomerOrderSelectionState (cart + menu + date)
    customerpackingstate.py      # CustomerPackingState (containers, packing)
    stageoverlaystate.py         # StageOverlaysState (stage, overlays, user, order #)
    packing.py                   # pure helper fns for auto-pack / capacity math
                                 #   (keeps handlers <=40 lines, files <=300)
  components/
    background.py          # responsive shell: mobile_only column + two-pane
    header.py              # "Sarthi" logo, delivery pill, profile + Cart buttons
    category_chips.py      # horizontal scrolling category pills
    food_card.py           # one food item row: veg dot, name, desc, price, Add/stepper
    quantity_stepper.py    # the − qty + control
    bottom_sheet.py        # reusable bottom sheet (cart, date picker)
    buttons.py             # primary terracotta button + outline pill button
  pages/
    menu.py                # screen 1
    delivery_date.py       # screen 2 (calendar bottom sheet / tablet modal)
    profile_drawer.py      # screen 3 (right-side drawer)
    cart.py                # screen 4 ("Your order") — sheet on phone, right pane on tablet
    containers.py          # screens 5 & 6 ("Pack your order")
    success.py             # screen 7 ("Payment received")
  cateringv3.py            # assembles the page + drives overlay/stage switching
```

## State model — three states (`state/` package)

State split into three `rx.State` classes, each owning one concern.

**Backend-only logic rule.** All business logic + computation lives in state
layer, never in UI. Pages/components only *read and display* `State.<var>` — no
arithmetic, conditionals-as-logic, or formatting math in component tree. Pattern per state:

- **`_private` helper methods** hold actual logic (e.g. `_calc_items_total`,
  `_calc_packing_fee`, `_next_order_number`). Pure, unit-testable, ≤40 lines.
- **`@rx.var` computed vars** call helpers, expose *display-ready* values,
  including formatted strings (e.g. `items_total_display -> "₹80"`,
  `space_used_label -> "1 of 3 space used"`, `delivery_label -> "Delivering Thu, 16 Jul"`).
- Cross-state derived values use **async computed vars** (verified: `@rx.var` on
  `async def` yields `AsyncComputedVar` in Reflex 0.9.6) that
  `await self.get_state(OtherState)` — cross-state math stays in backend too.

### 1. `CustomerOrderSelectionState` (`customerorderstate.py`) — cart, menu, date

```python
cart: dict[str, int]                 # item_id -> qty
active_category: str = "Rotis & Breads"
selected_date: str = ""              # defaults to real today via on-load (#9)
# computed (own-state only): cart_count, items_total, total_portions
#   total_portions = sum(cart.values())  (1 cart unit = 1 portion, #6)
```
Handlers: `add_item(item_id)`, `inc(item_id)`, `dec(item_id)`,
`set_category(name)`, `select_date(date)`.
`add_item`/`inc`/`dec` **also reset packing** (clear all containers via
`get_state(CustomerPackingState)`) so stale pack can't survive cart edit (#2).
`dec` at qty 1 **removes item** from `cart` entirely (card reverts to "Add", #16).
`set_category` also scrolls menu list back to top (#19).
`selected_date` initialized to real current day (formatted `"Thu, 16 Jul"`)
on page load, not hardcoded literal (#9).

### 2. `CustomerPackingState` (`customerpackingstate.py`) — packing

```python
containers: list[dict]               # [{id, size, capacity, fee, items:{item_id:qty}}]
selected_item_to_pack: str | None = None
# computed (own-state only): packing_fee, portions_packed, container_count
```
Handlers: `add_container(size)`, `delete_container(container_id)` (removes
container + refunds fee; emptied containers otherwise stay in place — #13),
`select_item_to_pack(item_id)`, `pack_into(container_id)` (**packs one unit** of
`selected_item_to_pack` per call, up to capacity; when item's last unit
packed, **auto-advances** selection to next item with unpacked units, else
`None` — #7/#15), `remove_from_container(container_id, item_id)`,
`auto_pack` (**async, always enabled** — reads cart via `get_state`; augments
existing packing, minimizes container count; no-op when nothing to pack —
#10/#11/#18), `reset_packing`.

### 3. `StageOverlaysState` (`stageoverlaystate.py`) — nav, overlays, user, result

```python
stage: str = "menu"                  # "menu" | "containers" | "success"
show_cart: bool = False
show_date_picker: bool = False
show_profile: bool = False
user_name: str = "Priya S."          # mock user
orders_placed: int = 12
balance_status: str = "All paid up"
order_number: str = ""               # generated on pay: random "SAR-####" (#8)
paid_total: int = 0                  # snapshotted grand total for the receipt
receipt_container_count: int = 0     # snapshotted for the receipt
```
Handlers: `open_cart/close_cart`, `open_date_picker/close_date_picker`,
`open_profile/close_profile`, `go_to_containers`, `back_to_menu`,
`pay` (**async** — reads order + packing via `get_state`, snapshots total &
container count, generates random `order_number` (`"SAR-####"`, #8), sets
`stage="success"`).

### Cross-state derived values (backend, async computed vars)

Values spanning two states live on `CustomerPackingState` as **async computed vars**
(read cart via `get_state`), so UI never does math:

- `grand_total` → `await get_state(order)`; returns `items_total + packing_fee`.
- `grand_total_display` → formatted `"₹85"` for Pay button / receipt.
- `portions_left` → `total_portions − portions_packed`.
- `is_fully_packed` → `portions_left == 0 and total_portions > 0` (drives Pay
  button `disabled`; `total_portions > 0` guard keeps Pay disabled on empty
  order — see *Resolved decisions* #1).

UI reads these directly: `rx.button(CustomerPackingState.pay_button_label,
disabled=~CustomerPackingState.is_fully_packed)`. Since auto-dep tracking across
states inside async vars not guaranteed, these vars declare explicit
`@rx.var(deps=[...])` on cart/packing inputs they depend on.

Event handlers touching another state (`auto_pack`, `pay`, `back_to_menu`'s full
reset) use `other = await self.get_state(OtherState)`. `back_to_menu` resets all
three states.

### Packing math (`packing.py` — pure helpers, called by state `_` methods)

- Container specs (from `data.py`): Small cap 3 / fee ₹5; Medium 6 / ₹8; Large 12 / ₹12.
- `packing_fee` = sum of chosen containers' fees (sync computed var; own state).
- `grand_total` / `portions_left` / `is_fully_packed` = async computed vars (above).
- Pay disabled until `portions_left == 0`.
- `auto_pack`: **First Fit Decreasing (FFD)** bin-packing — sort portions descending,
  place each into first container with room. **Augments** current packing
  (keeps manually-added containers + their packs; only places currently-unpacked
  units — *Resolved decisions* #10). When unit fits nowhere, open **new container
  minimizing total container count** (prefer larger sizes — *Resolved decisions*
  #11, supersedes earlier "cheapest-fitting" wording). Pure helper
  `packing.ffd_pack(cart, specs, existing_containers)` in `packing.py`, called by
  async `auto_pack` handler after `get_state`.

## Data (`data.py`)

Categories (horizontal chips): **Rotis & Breads · Rice · Curries · Raw Salads · Dals**.

- **Rotis & Breads** (real, from screenshot): Paneer Paratha ₹80, Aloo Paratha ₹50,
  Puri ₹15, Oilless Phulka ₹10, Ghee Phulka ₹15, Ghee Chapathi ₹20.
- **Rice / Curries / Raw Salads / Dals:** ~4–6 invented plausible veg items each,
  with name, one-line description, price, unit.
- All items **veg** (green dot) — matches every screenshot.

Item shape: `{id, category, name, desc, price, unit, veg: True}`.

## Visual system (`theme.py`) — approximated from screenshots

| Token | Value (approx) | Use |
| --- | --- | --- |
| `cream` | `#F5EFE6` | page background |
| `card` | `#FFFFFF` | food cards, sheets |
| `terracotta` | `#B5502E` | primary buttons, active chip fill, stepper, selected date |
| `terracotta_soft` | peach `#F6E6DC` | Add-button hover, reminder box |
| `ink` | `#241E1A` | headings, "Done" button, active chip |
| `muted` | `#8A8178` | descriptions, secondary labels |
| `green` | `#2E7D32` | veg dot, success check, "All paid up", "Secured by Razorpay" |
| `green_soft` | `#E8F0E9` | info/success boxes |
| `today_blue` | `#DCE7F0` | today's date outline in calendar |

Fonts: **serif** headings (Playfair Display) for "Sarthi", section titles, sheet
titles, "Payment received"; **sans** body (Inter). **Self-hosted** under `assets/`
+ declared via `@font-face` in theme — no Google Fonts / CDN fetch (#3),
so app works offline + under strict CSP. Approximated since exact hex/font
can't be extracted from images (easy to fine-tune later).

## Screen-by-screen behavior

1. **Menu** — header (logo, "Delivering <date> ▾" opens date picker, profile icon,
   Cart pill with count badge), category chips (tap sets `active_category`),
   section title + item count, food cards. "Add" → stepper once qty > 0.
2. **Delivery date** — bottom sheet over dimmed menu. **Real functional calendar**
   (#5): real current month + weekday grid, working month nav, real past dates
   disabled, real today outlined; selected date terracotta; green tip box; "Done"
   closes. Default selection = real today (#9).
3. **Profile drawer** — right-side drawer; avatar "P", "Priya S.", stat cards
   (orders placed, current orders empty-state, balance "All paid up"); bottom links
   "Order history on WhatsApp" / "Saved addresses" (no-op stubs) / "Sign out".
4. **Cart ("Your order")** — bottom sheet; delivery reminder box with "Change"
   (reopens date picker); line items with steppers; summary (Items, Containers
   "chosen next", Items total); "Choose containers →" → `stage="containers"`.
5. **Containers ("Pack your order")** — screens 5 (empty) & 6 (packed). Item chips
   to pack, capacity/progress per container, add S/M/L, Auto-pack, packing status
   footer; "Pay ₹<grand_total> securely" enabled only when fully packed → `pay`.
6. **Success ("Payment received")** — full-screen; green check; "₹<total> paid
   successfully"; receipt (order number, delivery date, container count, "UPI ·
   Razorpay"); WhatsApp confirmation box; "Back to menu" resets + returns.

## Out of scope (stubs / mocked)

- Real payment gateway (mocked; Razorpay shape preserved at `pay`).
- WhatsApp order history, saved addresses, sign out — visual buttons, no behavior.
- Wet/dry container rules and strict capacity validation beyond simple counts.
- Persistence / backend / real auth.

## Verification

Follow reflex-process-management to compile & run, then do **click-through smoke
test**: visit each screen once, confirm no crashes and state/events behave
(#4). Full Playwright screenshot-diff pass against `assets/01`–`07` is **out of
scope** for this build; eyeball visual gaps informally, fix obvious ones.