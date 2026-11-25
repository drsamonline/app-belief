# Belief

Six mechanisms, six interactive demonstrations, and a map of how a story mutated as it was
shared. Each demonstration asks you something **first** and only then shows a result, because
the only way the lesson lands is if the mechanism works on you, once, in front of you.

- **Demo (the app itself):** https://drsamonline.github.io/app-belief/play/index.html
- **Landing page:** https://drsamonline.github.io/app-belief/
- **Plan row:** #3 of 37 in `drsamonline/forge` → `QUEUE/PLAN.json`
- **Specs absorbed:** `app-belief-lab` (lead), `app-rumor-map`
- **Licence:** PolyForm Noncommercial 1.0.0

## Status

| | |
|---|---|
| **Built** | Six mechanisms each with one demonstration (anchoring, availability, confirmation bias, illusory truth, escalation of commitment, propaganda technique); a result refused until every step is answered, then quoting the answer given; progress that marks unplayed as unplayed; notes filed by chapter or `unsorted`; a rumor map that diffs consecutive versions, counts hedges added and numbers dropped, refuses a version with no source or date, and keeps identical versions as repeats. |
| **Not built** | A packaged Windows EXE / Android APK release (`app-builder` is not reachable here). Any population statistic — deliberately, see below. |
| **Untested** | Dragging files (there is no file input in this app), the service worker and install prompt (jsdom implements neither), and how the demonstrations feel on a real phone — the copy is written for a screen, not measured against readers. |

## The spec's "done means", made countable

The Belief Lab spec asks for five things that can be counted rather than claimed. Each is a
named assertion in `tests/self-tests.js`:

| The spec says | The test |
|---|---|
| the number of demonstrations reachable equals the number of mechanisms listed | `MECHANISMS.length` equals the count of entries with steps and an evaluator; the registry is the only place either is listed |
| every demonstration requires input before it shows a result | for every mechanism: `demoResult` on a fresh start returns `ok: false`; on a partial answer it returns `ok: false` and says how many answers are missing |
| none is prose with an illustration | every mechanism has ≥1 step, every step has a prompt, and the summary is computed from the answers |
| the summary quotes at least 1 answer the reader gave and names the mechanism | for every mechanism: `quotesAnAnswer === true` and `mechanism === name` |
| an unplayed demonstration is marked unplayed, never counted complete | `progressSummary({})` reports 0 complete and all unplayed; a started-but-unfinished demo counts as played, not complete |

## What it will not do

- **Tell you what to believe**, or mock anyone who believes something. It explains the mechanism
  and lets you recognise it.
- **Invent evidence.** There is no "70% of people…" anywhere in this app. Every number shown is one
  the reader typed, and each result says so. Where a mechanism is described, it is described —
  not cited with a figure nobody in this repository measured.
- **Decide which version of a story is true.** The map shows movement: what appeared, what
  disappeared, which hedges were added, which numbers were dropped. It says, in the page and in
  the export, that it does not say which version is accurate.
- **Show a result before you answer.** Enforced in the engine, not the layout: `demoResult`
  refuses on zero answers and on a partial answer.
- **Merge two identical versions.** Both are kept; the second is marked `repeat of N`.
- **Upload anything.** No `fetch`, XHR, WebSocket or beacon in any shipped file; CSP `connect-src 'none'`.

## When things go wrong

| Case | Behaviour |
|---|---|
| **Bad input** | A note with no chapter is filed under `unsorted` and the app says so. A story version with no source, no date, or a date that is not dd/mm/yyyy is refused — a mutation with no provenance cannot be placed on a map. |
| **No network** | Nothing changes. The demonstrations, notes and map are on the device. |
| **Storage full or unavailable** | Progress and notes are not written and the app says the session will not be remembered; playing and reading continue. |
| **Corrupt saved state** | Unreadable progress is reported, offered for export, and followed by an explicit *start from the beginning* — never a silent reset. An unreadable map is never rebuilt from a partial read. |

## The must-nots, and the test that holds each

| Must not | Test |
|---|---|
| tell the reader what to believe, or mock believers | `must_not_tell_reader_what_to_believe` — no verdict or mocking vocabulary in the copy |
| invent evidence | `must_not_invent_evidence` — no asserted population percentage, no fake study citation |
| decide which version is true | `must_not_decide_truth` — a link's keys are exactly the movement fields; the summary and export both refuse to rank |
| place a version with no provenance | `must_not_place_unprovenanced_version` — no source, no date, wrong format, impossible date all refused |
| merge identical versions | `must_not_merge_identical_versions` — both kept, second marked a repeat |
| rebuild a chain from a partial read | `must_not_rebuild_from_partial_read` — corrupt map reported, no versions returned, raw kept |
| reset progress silently | `must_not_reset_silently` — corrupt progress reported, raw kept, restart is explicit |

Mutation-tested four ways on 25/11/2026: showing a result before any answer (6 failures),
showing one on a partial answer (10), merging an identical version (1), and rebuilding a chain
from a corrupt map (4) each turned the suite red; restored, 157/157 pass.

## Tests

```bash
npm test                      # all three suites
node tests/self-tests.js      # engine — 157 assertions, including the spec's done-means
node tests/ui-tests.js        # the page in jsdom — 41 assertions (needs the dev-only jsdom)
node tests/page-smoke.js      # every local src/href resolves, nothing off-origin
```

## Layout

```
docs/index.html            landing page
docs/play/index.html       the app (Mechanisms and Rumor map tabs)
docs/play/app.js           DOM wiring: step rendering, notes, map
docs/play/belief-core.js   the engine — mechanisms, demonstrations, map, progress
docs/play/web-kit.js       vendored kit (unmodified)
docs/play/export-kit.js    vendored kit (unmodified)
docs/play/sw.js            cache-only service worker
tests/self-tests.js        engine suite (157)
tests/ui-tests.js          page suite (41, jsdom)
tests/page-smoke.js        shape on disk
PAGES.json                 landing = docs/index.html, app = docs/play/index.html
```

## Where the spec was silent, and what was chosen

- **Six mechanisms, not a curriculum.** The spec names biases, cult dynamics and propaganda. Six is
  what could be demonstrated honestly — each needs a demonstration that actually works, not a
  paragraph. Escalation of commitment is the cult-dynamics one; it ends with a line that refuses to
  make a medical decision safe, because no app can.
- **No prevalence figures.** Every result is the reader's own arithmetic. A cited statistic would
  have to be sourced and dated in `NOTICE`, and a wrong one would discredit the mechanism.
- **The rumor map diffs sentences, not words.** The mutation that matters is a sentence appearing,
  disappearing, or gaining a hedge — not a comma moving.
- **`repeat` is a flag, not a merge.** Two identical versions are evidence of a forward, which is
  the thing being mapped.

## What is not built, and why

**The packaged release.** The definition of done asks for a release with the EXE and APK that
`app-builder` produces from the same source. `app-builder` was not reachable from the environment
this was built in, so no release exists and none is claimed.
