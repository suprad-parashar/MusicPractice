# Carnatic Practice

A personal music studio for exploring ragas, practicing swaras, and building listening and rhythm skills.

- **Raga explorer:** 72 melakarta and 78 janya ragas, searchable by name or alternate spelling, with playable scales, a piano, and reference notes.
- **Exercises:** varisais, warm-ups, and voice patterns with adjustable tempo and guided practice modes.
- **Ear training and rhythm:** note identification, timed challenges, and generated rhythm drills.
- **Compositions:** a searchable library of songs, geetams, varnas, kritis, and chittaswarams.
- **Learn:** Carnatic foundations, pitch matching, vocal range, and interactive sheet music lessons.
- **Practice tools:** reference key, six playback instruments, tanpura, and a metronome with tala support.

## Development

Use Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Preferences are saved in this browser, including notation language and the four appearance themes. Microphone lessons request access when started.

```sh
npm run check          # Type checking, unit tests, and formatting
npm run format         # Apply the shared formatting rules
npx playwright install chromium
npm run test:browser   # Desktop and mobile interaction tests
```

To use an existing Chrome installation for browser tests, run `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`.

## Production

```sh
npm run build
npm start
```

The build exports a static site to `out/`. The preview serves it at [localhost:4173/MusicPractice/](http://localhost:4173/MusicPractice/), matching the GitHub Pages path in `next.config.js`. Pushing to `main` runs the existing Pages deployment workflow.

Fonts and the tanpura sample are bundled with the app. Sampled instruments load soundfonts over the network; the Sine instrument is synthesized locally.

## Project map

```text
app/                 Route entry points and styles grouped by purpose
components/
  studio/            App shell, navigation, preferences, accompaniment
  ui/                Shared controls, dialogs, and loading states
  ragas/             Raga explorer, search, notation, reference material
  practice/          Varisai, warm-up, and voice-pattern exercises
  ear-training/      Listening exercises
  rhythm/            Rhythm drills and glyphs
  compositions/      Library and composition players
  learn/             Lessons and interactive learning visuals
  notation/          Shared swara glyphs
hooks/               Settings, responsive behavior, and raga playback
lib/
  audio/             Audio graphs, soundfonts, tanpura, metronome
  music/             Pitch, notation, raga search, and music rules
  patterns/          Pure melodic-pattern generators
  pitch/             Microphone pitch detection and visualization
data/                Music catalog, composition JSON, exercise data
scripts/             Catalog generation, MIDI import, static preview
tests/               Settings regression tests and browser workflows
```

See [architecture notes](docs/architecture.md) for state ownership and conventions.

## Adding music

Add composition JSON to `data/compositions/data/`, then run `npm run generate:compositions`. Development and production builds run this automatically. Do not edit `registry.generated.ts` manually.

Ragas live in `data/all_ragas.json`; [the raga template](docs/raga-template.json) documents the available fields. Varisai notation lives in `data/exercises/`.

Existing `?song=`, `?chitta=`, and `/songs/<slug>/` links still open the unified composition library.
