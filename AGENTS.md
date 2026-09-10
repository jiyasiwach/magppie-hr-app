
# Magppie HR — start here

**Read [`AI_MEMORY.md`](AI_MEMORY.md) before writing any code.** It carries the hard
constraints, the decisions already taken, the business rules, and the 24 questions that
were deliberately flagged rather than guessed. Then `docs/` for anything specific.

Three constraints that are easy to violate by accident:

1. **Nothing to do with Sunrooof.** Never import from, copy from, push to, or deploy
   alongside any Sunrooof project. Several sit in the same Vercel team and Supabase org.
2. **Never reproduce Keka's design.** Follow how it works; never its icons, layouts,
   colours or copy.
3. **Flag, do not guess.** Wrong assumptions in an HR app become HR disputes. If a rule
   is missing, say so on screen and in a comment instead of inventing a policy.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
