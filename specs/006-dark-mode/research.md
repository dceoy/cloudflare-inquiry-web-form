# Research: Dark mode UI

## Summary

Use CSS custom properties for theme tokens and set `data-theme` on `document.documentElement`. Initialize theme from localStorage when available, otherwise fall back to `prefers-color-scheme`. Persist user selection when toggled, with try/catch to handle storage errors.

## Decisions

- **Theme tokens**: CSS variables in `src/index.css` with overrides in `:root[data-theme="dark"]`.
- **Theme switch**: UI button in `src/App.tsx` that toggles React state and updates `data-theme`.
- **Persistence**: `localStorage` key `theme` storing `light` or `dark`, with graceful fallback on access errors.
- **System preference**: Read once via `matchMedia("(prefers-color-scheme: dark)")` if no saved preference.

## Risks

- LocalStorage may throw in private browsing modes; handled with try/catch and fallback to system preference.
