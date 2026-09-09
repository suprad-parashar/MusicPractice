# Architecture

## State and navigation

`app/page.tsx` is a small route entry point. `PracticeApp` coordinates navigation and the studio layout; `FeatureContent` loads the selected feature. Large lesson and exercise modules load on demand.

`useSettings` owns persistent studio preferences. `lib/settings.ts` validates stored values and migrates older tab names and drone patterns. Components receive typed values and a `setSetting` callback. Reference frequency is derived from the key instead of being stored separately.

Feature-specific state stays in its feature. Metronome and raga tempo reset for a new session; composition tempo still respects the score. The storage namespace remains `carnatic-practice:` so existing preferences and exercise history survive upgrades.

Both the initial theme script and the settings hook use the same storage key and theme defaults. The script applies the saved theme before the first paint.

## UI and styling

Shared controls live in `components/ui/`. Use `TempoControl`, `PlaybackButton`, `SegmentedControl`, `SelectField`, `RangeField`, and `Disclosure` before creating another control. `RagaSearch` accepts a catalog subset so exercises can restrict selection to melakarta ragas.

The four themes define semantic colors in `app/styles/tokens.css`. Tailwind exposes those as `page`, `surface`, `subtle`, `ink`, `muted`, `line`, and `accent`. A component should select colors by purpose; it should not require a global selector to override a hardcoded palette. `on-accent` follows the readable foreground calculated for the user's accent color.

The other style files cover base behavior, controls, the studio shell, the raga explorer, and shared feature surfaces. Piano-key colors and musical glyph geometry remain local to their visualizations.

`ResponsiveAside` keeps one mounted instance of each panel through desktop/mobile transitions. Closed drawers are inert, and open drawers contain keyboard focus. Preferences use a native dialog. Segmented choices use native radios for arrow-key navigation.

## Music and audio

Music data and transformations are independent of React. Pattern generators live in `lib/patterns`, notation and pitch rules in `lib/music`, and microphone analysis in `lib/pitch`.

`useRagaPlayback` owns raga scheduling. `NotePlayer` owns its audio graph and releases it when the feature unmounts. A generation counter prevents delayed instrument loading from restarting playback after navigation. Tempo, root pitch, and loop changes are read at the next note boundary.

The studio's tanpura and metronome stay mounted when the selected feature changes. `useMetronome` gives each player its own audio chain and loop, so a composition's reference tala cannot interrupt the studio beat. Each stops and disposes its own sounds without stopping the shared Tone transport. More specialized composition players handle sustained notes and tala groupings, and reuse `CompositionReference` for scales and beat diagrams.

## Catalog and checks

Composition JSON is the source of truth. `generate-composition-registry.mjs` produces static imports for the Next.js export and rejects duplicate slugs. The `data/songs` and `data/chittaswarams` adapters provide the notation shapes needed by composition players and old links.

TypeScript rejects unused locals and parameters. Prettier provides one formatting convention. Unit tests cover persisted settings and migrations; Playwright covers navigation, search, playback controls, preferences, old links, and responsive drawers. The generated catalog and source music JSON are excluded from formatting. Exercise arrays retain rows of eight swaras so their musical patterns remain easy to scan.
