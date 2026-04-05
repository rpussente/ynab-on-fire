# Project Rules: ynab-on-fire

These instructions are foundational mandates and take absolute precedence over general workflows.

## Pull Requests
* **Permission Required:** Do not create pull requests without explicit permission from the user.
* **Draft Mode:** All pull requests must be created in draft mode using `gh pr create --draft`.
* **Readability:** Use real newlines in pull request descriptions. Do not use `\n` to represent enters; characters must be properly formatted for readability.

## Commits
* **Validation:** Always run `make check` before committing any changes to ensure formatting, linting, and type-checking pass.

## Code Style & Architecture
* **Frameworks:** Follow standard Vue 3 / Vite patterns.
* **Logic:** Prefer idiomatic TypeScript for all logic.
* **UI/UX:** Ensure all changes follow the established UI design system.
* **Styling:** Use Tailwind CSS for CSS styling. Avoid changing global styles in `App.vue` or `HomeView.vue` unless explicitly instructed.
