/**
 * ESM resolve hook used only by `scripts/validate-help.mjs`.
 *
 * `src/lib/schemas.ts` imports `z` from the Astro virtual module
 * `astro:content`, which only exists inside an Astro build. To validate the
 * contract from a plain `node` invocation (no Astro runtime), we alias
 * `astro:content` to `astro/zod` — the very module Astro re-exports `z` from
 * (`zod/v4`). This lets the standalone validator import the SAME schema module
 * the site uses, with no duplicated shape.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'astro:content') {
    return nextResolve('astro/zod', context);
  }
  return nextResolve(specifier, context);
}
