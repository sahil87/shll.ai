# Intake: Terminal Shell Affordances — History, Tab-Completion, Control Keys

**Change**: 260610-n23o-terminal-shell-affordances
**Created**: 2026-06-10
**Status**: Draft

## Origin

This change originates from backlog item `[n23o]` (`fab/backlog.md`), surfaced by a
terminal-UX review on 2026-06-10 (findings #1, #2, #4). It was invoked one-shot via
`/fab-new n23o` with no preceding clarification conversation — the backlog entry itself
is exceptionally detailed and already encodes the design decisions, constraints, and
acceptance criteria. The intake reproduces and grounds them against the real code in
`sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`.

> Make the homepage terminal feel like a real shell — add command history,
> tab-completion, and standard control keys to the interactive prompt. All three are one
> cohesive enhancement to the `onKeydown` handler in `TerminalPrompt.astro` (the
> `COMMANDS` dispatch map and `freshPrompt`/`run` plumbing already exist; this only
> touches input handling).

## Why

**The problem.** The homepage hero terminal (`TerminalPrompt.astro`) is the brand's
signature interaction — a hand-rolled, zero-dependency client island that upgrades the
final static prompt line into a typeable in-page shell with a real command dispatch map
(`help`, `ls`, `cd`, `man`, easter eggs, etc.). But it behaves like a form field, not a
shell: there is no command recall (you re-type everything), no Tab-completion (you must
know exact command/tool spellings), and the standard control keys a developer's muscle
memory reaches for — Ctrl-L to clear, Ctrl-C to cancel a line — do nothing. For a site
whose entire value proposition is *developer tooling*, a terminal that doesn't feel like
a terminal undercuts the pitch on first contact.

**The consequence of not fixing it.** The interaction stays a gimmick rather than a
convincing demo. The audience is precisely the developers most likely to instinctively
hit ↑ or Tab and notice when nothing happens. The polish gap is most visible to exactly
the people we most want to impress.

**Why this approach.** The fix is small, surgical, and self-contained: all three features
live in input handling (`onKeydown`) and lean on plumbing that already exists
(`COMMANDS`, `TOOLS`, `freshPrompt`, `run`, `clear`, `caretToEnd`, `print`). It honors
the project's constitution — vanilla JS, zero new dependencies (Constitution VI: do NOT
pull in `xterm.js` or a completion library), static-first (Constitution I), dark/light
parity via existing `--c-*` vars (Constitution V). The alternative — adopting a terminal
emulator library — is explicitly rejected by the constitution and is wildly
disproportionate to three keyboard behaviors.

## What Changes

All changes are confined to the `<script>` in
`sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro`, primarily the
`onKeydown` handler plus a small amount of module-scoped state inside `initTerminal`. No
new files, no new dependencies, no markup changes to `index.mdx`.

> **Scope note — interactive prompt location.** The live, typeable prompt currently
> exists *only* on the homepage (`src/content/docs/index.mdx`, which hosts the
> `pre.shell-session` with `[data-terminal-prompt]`). All three features therefore ship
> on the homepage terminal only; no other route is affected.

### 1. Command history (↑ / ↓ recall)

Maintain an in-memory array of committed, non-empty **raw** lines (the trimmed text as
entered, before tokenization) plus a cursor index. This state lives at `initTerminal`
scope (one history per terminal instance), not inside `freshPrompt` (which runs per
prompt).

- **On commit** (inside `onKeydown` Enter branch, when `raw !== ''`): push `raw` onto the
  history array. Reset the navigation cursor to "past the newest" (i.e. `index = length`,
  the blank-line position). **`ignoredups` (in scope):** skip pushing if `raw` is identical
  to the immediately previous entry (bash `ignoredups` behavior).
  <!-- clarified: ignoredups is committed scope (was optional) — user confirmed #10 -->
- **↑ (ArrowUp)**: `preventDefault()`; walk the cursor back toward index 0 (clamp at 0);
  set the live `input.textContent` to `history[cursor]`; move the caret to end via the
  existing `caretToEnd()`. No-op (or stay at oldest) when already at the oldest entry.
- **↓ (ArrowDown)**: `preventDefault()`; walk the cursor forward; when it moves *past* the
  newest entry, clamp to `index = length` and restore a **blank** input line (the
  "drafting a new command" state), not the newest command. Caret to end.
- Navigation must only fire on a single-line input with the caret at the boundary in a way
  that reads naturally for a one-line prompt; since the prompt is enforced single-line
  (paste is flattened, `aria-multiline=false`), ↑/↓ can unconditionally drive history.

**Example.** After running `help` then `ls`:
- ↑ → input shows `ls`; ↑ again → `help`; ↑ again → stays `help` (oldest).
- ↓ → `ls`; ↓ again → blank line (new draft).

**Session persistence (in scope).** Persist the history array across reloads in
`sessionStorage` (explicitly NOT `localStorage` — keep it session-scoped so a page refresh
keeps your recent commands but a new session starts clean). Read on `initTerminal`, write
on each commit. Guard all `sessionStorage` access in try/catch — private-mode /
disabled-storage must degrade silently to in-memory-only, never throw.
<!-- clarified: sessionStorage persistence is committed scope (was optional) — user confirmed #10 -->

**`history` command (in scope).** Add a `history` entry to `COMMANDS` that prints the
array (one indexed line each, `shell-out` class), listing from the same array the recall
uses. Add a corresponding line to the `help` output so it's discoverable.
<!-- clarified: history command is committed scope (was optional) — user confirmed #10 -->

### 2. Tab-completion

On **Tab** keydown: `preventDefault()` first (Tab's default moves focus out of the
contenteditable — that must be suppressed). Then complete based on token position within
the current raw input:

- **First token** → complete against the `COMMANDS` map keys.
- **Second token, when the first token is `cd` / `open` / `man`** → complete against the
  `TOOLS` list (`['idea', 'hop', 'fab-kit', 'wt', 'run-kit', 'tu', 'shll']`). These are
  the three commands that take a tool name as an argument.

Completion resolution (bash-like), given the set of candidates that start with the token
fragment being completed:

- **Single match** → fill it in (replace the fragment with the full candidate; for a
  first-token completion, this is the whole input; for a second-token completion, preserve
  the leading `cd `/`open `/`man ` prefix). Caret to end.
- **Multiple matches** → print the candidates as a single `shell-out` line (space-joined,
  bash-style listing) via `print()`, then re-emit a fresh prompt carrying the **unchanged**
  current input so the user can keep typing. (Because completion happens mid-line, not on
  a committed line, the listing-then-restore must preserve what was typed.)
- **Longest common prefix** → when multiple candidates share a longer common prefix than
  what's typed, fill that common prefix in (partial completion), no listing. Standard bash
  behavior: first Tab extends to LCP; if that's ambiguous, a listing follows.
- **No match** → do nothing (no listing, input unchanged).

**Examples (must hold as acceptance):**
- `in` + Tab → `install` (unique prefix among command keys).
- `cd h` + Tab → `cd hop` (`hop` is the only TOOL starting with `h`).
- A fragment matching multiple commands (e.g. a prefix shared by several `COMMANDS` keys)
  → lists the candidates, leaves input as typed.

> **Implementation note — listing while mid-line (decided).** The Tab listing prints
> **without freezing** the line: reuse `print()` to append the candidate listing as an
> output line *above* the still-live `input`, which keeps its text and caret untouched. Do
> NOT commit/freeze the line and do NOT emit a new prompt — this is the cleanest path for
> the "exactly one trailing prompt" invariant, since no commit/re-emit happens. (The
> freeze→`print`→`freshPrompt`-with-reseed alternative was considered and rejected.)
> <!-- clarified: print-without-freezing chosen for Tab listing — user picked it over freeze→reseed (#11) -->
>
> ```js
> // onKeydown Tab branch, multiple-match case:
> print([{ text: matches.join('  '), classes: 'shell-out' }]);
> // input untouched — caret stays put, no freshPrompt()
> ```

### 3. Control keys (Ctrl-L, Ctrl-C)

Detect via `e.ctrlKey` (and the corresponding `e.key === 'l'` / `'c'`) in `onKeydown`.
`preventDefault()` to suppress browser defaults (Ctrl-L focuses the address bar).

- **Ctrl-L** → clear the transcript. Reuse the existing `clear()` path (which calls
  `session.replaceChildren()`), then emit exactly **one** fresh prompt. ⚠️ Mind the
  invariant documented at `onKeydown` / `clear`: the code is careful that exactly one
  trailing prompt exists after any command. Since Ctrl-L is handled directly in
  `onKeydown` (not through the Enter→`run`→`freshPrompt` path), it must call `clear()` then
  `freshPrompt()` itself — and must not double-emit.
- **Ctrl-C** → freeze the current line with a trailing `^C` (echo the in-progress input
  followed by `^C`, exactly as a real shell does when you abort a line), discard the typed
  input (do **not** run it), and drop a fresh prompt. No command is dispatched. The freeze
  should reuse the same "convert live input span to static text + drop block cursor" logic
  the Enter branch uses, then append `^C` to the frozen text, then `freshPrompt()`.

**Examples (must hold as acceptance):**
- Typing `ls` then Ctrl-C → the line shows `$ ls^C`, input is discarded, a fresh empty
  prompt appears, `ls` did not run.
- Ctrl-L at any time → transcript wiped, single fresh prompt remains.

### Constraints (binding)

- **Vanilla JS only, zero new dependencies** (Constitution VI). No `xterm.js`, no
  completion library.
- **Preserve existing paste-normalization** (`onPaste` flattens newlines) and the
  **focus/blur cursor-blink** behavior (`onFocus`/`onBlur` toggle `is-active` on the block
  cursor). New keydown handling must not regress these.
- **Preserve the "exactly one trailing prompt" invariant** at `onKeydown` — the most
  fragile part of this change. Both Ctrl-L and Ctrl-C add new prompt-emitting paths
  outside the Enter flow; each must emit exactly one prompt.
- **`prefers-reduced-motion`** — respect it if any animation is added. (None is required;
  the features are non-animated. If a completion/cancel flourish is added, gate it.)
- **Dark/light parity** (Constitution V) — reuse existing `--c-*` vars and `.shell-*`
  classes for any printed output (the Tab listing, the `^C` echo). No new hardcoded colors.
- **Keyboard accessibility** — the new keys are themselves keyboard affordances; ensure
  they don't trap focus or break the existing `aria-label` / `role=textbox` semantics on
  the live input.

## Affected Memory

No memory updates required. This is an **implementation-only** enhancement to a single
client-island component's input handling — it changes how the homepage terminal *feels*,
not any spec-level system behavior, build/deploy contract, or cross-cutting convention.
The two existing memory domains (`build-deploy`, `conventions`) are untouched. If the
hydrate stage later judges the terminal's interaction model worth recording as a
convention, that can be decided then; this intake does not mandate it.

## Impact

- **Code**: single file —
  `sites/astro-starlight-terminal1/src/components/TerminalPrompt.astro` (the `<script>`,
  specifically `onKeydown` and module-scoped state inside `initTerminal`). Also touches the
  `COMMANDS` map (the in-scope `history` command) and the `help` handler's output (to list
  it).
- **Markup/content**: none. `index.mdx` and the static `pre.shell-session` are unchanged;
  the no-JS fallback is unaffected.
- **Dependencies**: none added (Constitution VI).
- **APIs / endpoints**: none (static-first, Constitution I — no network).
- **Other sites**: none (Multi-Site Isolation, Constitution II — change is scoped to
  `sites/astro-starlight-terminal1/`).
- **Tests**: this site has no existing test harness for the terminal island that this
  intake is aware of; acceptance is behavioral/manual (the six acceptance bullets below).
  If a lightweight test exists or is warranted, the plan stage decides.

## Open Questions

- None. All material decisions resolved by the backlog entry, and the two formerly-open
  items were settled in clarification (2026-06-10): the three refinements (sessionStorage
  persistence, the `history` command, `ignoredups`) are all **in scope**, and the Tab
  "multiple matches" listing uses the **print-without-freezing** approach. See
  `## Clarifications`.

## Clarifications

### Session 2026-06-10

| # | Question | Resolution |
|---|----------|------------|
| 1 | Which optional refinements are in scope vs. deferred? | All three in scope: sessionStorage persistence, the `history` command, and `ignoredups` (upgrades assumption #10 → Certain) |
| 2 | How should the Tab "multiple matches" listing render? | Print-without-freezing — append the listing above the still-live input via `print()`, no freeze, no new prompt (upgrades assumption #11 → Certain) |

## Assumptions

| # | Grade | Decision | Rationale | Scores |
|---|-------|----------|-----------|--------|
| 1 | Certain | Vanilla JS, zero new deps — no xterm.js / completion lib | Constitution VI states it explicitly; backlog repeats it as a binding constraint | S:98 R:90 A:98 D:95 |
| 2 | Certain | All three features confined to `onKeydown` + module-scoped state in `TerminalPrompt.astro`; no markup/content change | Backlog names the exact file and function; code read confirms `COMMANDS`/`freshPrompt`/`run`/`clear`/`caretToEnd` all exist | S:95 R:80 A:95 D:90 |
| 3 | Certain | History stores trimmed non-empty **raw** lines; ↑ walks back, ↓ forward, ↓ past newest = blank draft | Backlog specifies exact semantics verbatim | S:95 R:75 A:90 D:90 |
| 4 | Certain | Tab completes 1st token vs `COMMANDS` keys; 2nd token vs `TOOLS` when 1st is `cd`/`open`/`man` | Backlog specifies; code confirms `cd`/`open`/`man` are the tool-arg commands and `TOOLS` is the canonical list | S:95 R:75 A:92 D:88 |
| 5 | Certain | Tab resolution: single→fill, multiple→list (input unchanged), LCP→fill prefix | Backlog specifies bash-like behavior explicitly | S:90 R:70 A:88 D:85 |
| 6 | Certain | Ctrl-L reuses `clear()` then emits one fresh prompt; Ctrl-C freezes line with `^C`, discards input, fresh prompt, no run | Backlog specifies; code confirms `clear()` and the freeze logic in the Enter branch | S:95 R:70 A:90 D:90 |
| 7 | Certain | Preserve paste-normalization, focus/blur cursor-blink, and the "exactly one trailing prompt" invariant | Backlog + the in-code comments at `onKeydown`/`clear` make this binding | S:92 R:60 A:90 D:88 |
| 8 | Confident | Interactive prompt ships on homepage only (`index.mdx`); no other route gains it | Backlog states the prompt "currently lives only on the homepage"; bootstrap keys off `[data-terminal-prompt]` which exists only there | S:85 R:80 A:88 D:82 |
| 9 | Confident | Dark/light parity & reduced-motion handled by reusing existing `--c-*` vars / `.shell-*` classes; no new animation needed | Constitution V + reduced-motion are standing constraints; features are non-animated by nature | S:80 R:85 A:90 D:80 |
| 10 | Certain | sessionStorage persistence, the `history` command, AND `ignoredups` are all **in scope** (committed, not deferred) | Clarified — user confirmed all three optional refinements are in scope | S:95 R:88 A:75 D:55 |
| 11 | Certain | Tab listing renders by printing an output line **without** committing/freezing the in-progress input (no freeze→reseed) | Clarified — user chose "print without freezing" | S:95 R:65 A:70 D:50 |

11 assumptions (9 certain, 2 confident, 0 tentative, 0 unresolved).
