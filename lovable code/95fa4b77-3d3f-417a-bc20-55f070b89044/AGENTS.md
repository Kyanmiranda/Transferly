<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Transferly is frontend-only: demo data lives in `src/lib/demo-data.ts`, status changes persist via localStorage in `src/lib/store.ts` — the spec forbids backends/real data.
- Reusable component classes (btn, panel, tbl…) are Tailwind v4 `@utility` rules in `src/styles.css` — `@layer components` classes can't be `@apply`-composed in v4.
