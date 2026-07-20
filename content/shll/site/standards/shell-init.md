# Standard: shell-init

How every [shll toolkit](https://shll.ai) tool that integrates with the shell emits its startup code. `<tool> shell-init <shell>` prints shell source that the user (or [shll](https://shll.ai)) `eval`s in every new shell — so its stdout runs, verbatim, at the top of every session on every machine. That makes eval-safety non-negotiable: one stray line poisons shell startup fleet-wide.

This page is the **producer-facing standard**: what your `shell-init` must emit. The consumer side — `shll shell-init`'s composition order and how it concatenates the per-tool blobs — is shll's job and lives in its own memory. A tool author's entire obligation is keeping `shell-init` conformant to this page.

Scope is the toolkit tools that **expose shell integration** — today `tu`, `hop`, and `wt`. `shll shell-init` is the **consumer/composer** and conforms by construction: it drops any tool that exits non-zero and re-emits the rest, so the composed blob is only ever as safe as each producer's stdout.

This standard implements principle №2 of the [toolkit CLI principles](principles.md) (stdout is data, stderr is diagnostics) — taken to its strictest form, where "data" means *eval-safe shell source* and any diagnostic leaking to stdout is not just noisy but actively breaks every shell. Its usage-error handling also serves principle №4 (fail fast — a bad shell argument exits `2` with a message on stderr).

## Invocation contract

`<tool> shell-init <shell>` for `zsh` and `bash`:

- **MUST emit eval-safe shell code on stdout and exit `0`.** stdout contains **ONLY** shell source for the named shell — no prompts, no colors, no banners, no warnings, no progress. Every byte on stdout is going to be `eval`ed.
- The output MUST be valid source for the **named** shell (`zsh` vs. `bash`), not a lowest-common-denominator guess.

## Diagnostics go to stderr only

Anything that is not shell source — a deprecation notice, a "run `shell-setup` to persist this" hint, a warning about a missing optional dependency — goes to **stderr**, never stdout. stderr is not `eval`ed; it is the only safe channel for a message.

## On any failure, exit non-zero

Eval-safety across the composed blob is enforced by **exit codes alone**: `shll shell-init` drops a tool's stdout from the blob **only when the tool exits non-zero**. It cannot inspect your stdout to decide whether it is "really" shell code — the exit code is its only signal.

- **On any failure the tool MUST exit non-zero.** If `shell-init` cannot produce clean shell source, it MUST fail loudly (non-zero) so the composer drops it, rather than emitting partial or apologetic output on stdout while exiting `0`.
- **Printing junk to stdout while exiting `0` poisons every shell.** A warning, a stack trace, or a half-written block on stdout with a `0` exit sails straight into `eval "$(shll shell-init …)"` on every machine that sources it — the single most damaging failure this standard exists to prevent, precisely because the exit-code gate cannot catch it.

**Failure mode.** A tool that prints `warning: config not found` to **stdout** and exits `0` injects that line into every new shell's `eval`, which either errors on every shell startup or silently corrupts the environment — on every machine, until someone traces it back.

## Unsupported or missing shell argument

- **An unsupported or missing shell argument MUST exit non-zero with a usage message on stderr.** `<tool> shell-init` with no shell, or with a shell the tool does not support, is a usage error: write the usage message to **stderr** (never stdout) and exit non-zero. The toolkit convention is **exit `2` for usage errors** (per principle №4 and the [principles standard](principles.md)); a bad shell argument is a usage error, not an operational one.
- stdout MUST stay empty on this path — the composer that dropped you on the non-zero exit must not also have received half a blob.

## Verifying conformance

Before shipping a change that touches `shell-init`:

- `<tool> shell-init zsh` and `<tool> shell-init bash` each write **only** eval-safe shell source to stdout and exit `0`. stderr MAY carry hints or warnings (a `shell-setup` reminder, a missing-optional-dependency notice) — the invariant is a clean stdout and a `0` exit, not silence on stderr.
- Every non-shell message (warnings, hints, deprecations) goes to stderr, never stdout.
- Any failure exits **non-zero** — there is no code path that prints to stdout while exiting `0` when it could not produce clean shell source.
- A missing or unsupported shell argument exits non-zero (convention: `2`) with a usage message on **stderr** and an empty stdout.
- Keep (or add) a test that `eval`s the output in a subshell and asserts a clean exit — the cheapest guard against a poisoned blob.
