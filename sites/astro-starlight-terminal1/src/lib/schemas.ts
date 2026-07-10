/**
 * Help-collection contract schema.
 *
 * This is the single, machine-checkable definition of the `help/<tool>.json`
 * cross-repo contract (see `docs/memory/conventions/help-collection.md`). Both
 * the 7 sibling-tool producers and the follow-up Astro loader / CommandReference
 * component validate against THIS module — there is no second, drifting shape.
 *
 * `z` is imported from `astro:content` (Starlight re-exports zod transitively),
 * so this contract adds NO new dependency and requires NO repo-root Node
 * toolchain — preserving Constitution II (Multi-Site Isolation) and
 * VI (Minimal Dependencies). The repo root holds only the `help/*.json` data.
 *
 * The data lives at `<repo-root>/help/*.json` (a deliberate project-level
 * placement that survives a live-site swap, Constitution III); the live site
 * reaching up and out to read it is the documented, intended cross-boundary read.
 */
import { z } from 'astro:content';

/**
 * A single command in the help tree. Recursive: `commands` holds child Nodes
 * (empty array for a leaf). Produced by walking the CLI framework's command
 * tree (Cobra: `rootCmd.Commands()` recursively), never by parsing `text`.
 *
 * `commands` uses `z.lazy` because a Node references itself.
 *
 * The `: z.ZodType<Node>` annotation forward-references the `Node` interface
 * declared just below. This forward reference is deliberate and required: a
 * recursive `z.lazy` schema cannot infer its own type, so the explicit
 * annotation breaks the cycle. (Hoisting `interface Node` is safe.)
 */
export const NodeSchema: z.ZodType<Node> = z.lazy(() =>
  z.object({
    /** Command name at this level (e.g. "create"). */
    name: z.string(),
    /** Full invocation path (e.g. "wt create") — drives the tree label. */
    path: z.string(),
    /** One-line description (Cobra `Short`). */
    short: z.string(),
    /** Usage line (e.g. "wt create [branch] [flags]"). */
    usage: z.string(),
    /** Raw `-h`/`--help` output for this command, byte-for-byte, newlines preserved. */
    text: z.string(),
    /** Child commands, recursive. Empty array for a leaf command. */
    commands: z.array(NodeSchema),
  }),
);

/** Inferred TypeScript type for a help-tree Node. */
export interface Node {
  name: string;
  path: string;
  short: string;
  usage: string;
  text: string;
  commands: Node[];
}

/**
 * The top-level envelope for a tool's help document. One per tool, stored as
 * `help/<slug>.json` at the repo root.
 */
export const HelpDocSchema = z.object({
  /** Invoked binary name (e.g. "wt", "run-kit", "fab") — not necessarily the file slug. */
  tool: z.string(),
  /** Version reported by the built binary; never hardcoded by the producer. */
  version: z.string(),
  /** ISO-8601 UTC timestamp stamped at capture time. */
  captured_at: z.string(),
  /** Contract revision. Always 1 for this revision of the contract. */
  schema_version: z.literal(1),
  /** Recursive root command of the help tree. */
  root: NodeSchema,
});

/** Inferred TypeScript type for a full help document (the envelope). */
export type HelpDoc = z.infer<typeof HelpDocSchema>;
