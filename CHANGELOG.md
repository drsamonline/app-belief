# Changelog

All notable changes to Belief are recorded here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates: dd/mm/yyyy.

## [Unreleased]

## [1.0.0] — 25/11/2026

### Added
- Six mechanisms, each with one interactive demonstration: anchoring, availability,
  confirmation bias, illusory truth, escalation of commitment, propaganda technique.
  The registry is the only place either is listed, so the number of demonstrations equals
  the number of mechanisms by construction.
- Demonstrations that refuse to show a result until every step is answered, then quote an
  answer the reader actually gave and name the mechanism. No population statistic is used
  or invented: the only numbers are the reader's own.
- Progress that marks an unplayed demonstration as `unplayed` and never counts it as
  complete; notes filed by chapter, or under `unsorted` with the app saying so.
- Rumor map: versions with a source and a date, refused without either; identical versions
  kept and marked a repeat rather than merged; a chain that diffs consecutive versions and
  counts hedges added and numbers dropped. It never says which version is accurate.
- Corruption handling: unreadable progress is reported, offered for export, and never
  silently reset; an unreadable map is never rebuilt from a partial read.
- PWA shell: manifest, cache-only service worker, icons. Works from `file://`.
- Tests: `tests/self-tests.js` (157 assertions, including the spec's countable done-means),
  `tests/ui-tests.js` (41, in jsdom), `tests/page-smoke.js`. CI runs all three.

### Not built
- A packaged EXE / APK release: `app-builder` is not reachable from the build environment.
