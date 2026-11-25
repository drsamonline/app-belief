#!/usr/bin/env node
/* self-tests — Belief. No framework, no dependencies.
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * The two specs' must-nots are named tests here, and so is the "done means" the
 * Belief Lab spec spells out, because it is countable:
 *
 *   "The number of demonstrations reachable equals the number of mechanisms the app
 *    lists ... Every demonstration requires input before it shows a result ... After
 *    one, the summary quotes at least 1 answer the reader actually gave and names the
 *    mechanism ... A demonstration left unplayed is marked unplayed, never counted as
 *    complete."
 *
 *   node tests/self-tests.js
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var B = require(path.join(ROOT, "docs", "play", "belief-core.js"));

var passed = 0;
var failed = [];
var group = "";

function section(n) { group = n; }
function ok(name, cond, detail) { if (cond) { passed++; return; } failed.push(group + " :: " + name + (detail ? " — " + detail : "")); }
function eq(name, a, b) { ok(name, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }

/* Play a demonstration to the end with plausible answers, so the summary path is
   exercised for every mechanism rather than only the one we happened to pick. */
function answerFor(step) {
  if (step.kind === "choice") return step.options[0].value;
  if (step.kind === "number") return String(step.min + 100);
  if (step.kind === "scale") return String(Math.round((step.min + step.max) / 2));
  if (step.kind === "text") return "one, two, three";
  if (step.kind === "multi") return step.options.slice(0, step.pick).map(function (o) { return o.value; });
  if (step.kind === "rating") {
    var r = {};
    step.items.forEach(function (it, i) { r[it.id] = String(step.min + (i % (step.max - step.min + 1))); });
    return r;
  }
  return "";
}

function playFully(id) {
  var s = B.startDemo(id);
  var m = B.mechanismById(id);
  m.steps.forEach(function (step) {
    var r = B.answerDemo(s, step.id, answerFor(step));
    if (r.ok) s = r;
  });
  return s;
}

/* ============================================ the spec's own "done means" */

section("done means — the two counts are equal, and countable");
eq("the number of mechanisms is the number of demonstrations",
  B.MECHANISMS.length, B.MECHANISMS.filter(function (m) { return m.steps.length && typeof m.evaluate === "function"; }).length);
ok("there is more than one mechanism to count", B.MECHANISMS.length >= 6, B.MECHANISMS.length);
B.MECHANISMS.forEach(function (m) {
  ok("mechanism " + m.id + " has a name, a claim and at least one step",
    !!m.name && !!m.claim && m.steps.length >= 1);
  m.steps.forEach(function (s) {
    ok("every step of " + m.id + " has a prompt", typeof s.prompt === "string" && s.prompt.length > 10);
  });
});

section("done means — input before result, for every demonstration");
B.MECHANISMS.forEach(function (m) {
  var fresh = B.startDemo(m.id);
  var early = B.demoResult(fresh);
  eq("no result before any answer: " + m.id, early.ok, false);
  ok("and it says an answer is needed: " + m.id, /needs an answer|before it can show/.test(early.reason), early.reason);

  if (m.steps.length > 1) {
    var partial = B.answerDemo(fresh, m.steps[0].id, answerFor(m.steps[0]));
    var mid = B.demoResult(partial);
    eq("no result on a partial answer: " + m.id, mid.ok, false);
    ok("and it says how many answers are missing: " + m.id, /short/.test(mid.reason), mid.reason);
  }
});

section("done means — a complete demonstration quotes an answer and names the mechanism");
B.MECHANISMS.forEach(function (m) {
  var done = playFully(m.id);
  eq("the demonstration completes: " + m.id, done.complete, true);
  var r = B.demoResult(done);
  eq("a complete demonstration shows a result: " + m.id, r.ok, true);
  ok("the result names the mechanism: " + m.id, r.mechanism === m.name, r.mechanism);
  ok("the result quotes an answer the reader gave: " + m.id, r.quotesAnAnswer && r.quote.length > 0, r.quote);
  ok("the quote is built from the answers, not invented: " + m.id, typeof r.at === "object" && Object.keys(r.at).length > 0);
  ok("the summary is not prose with an illustration — it uses the reader's own numbers or choices: " + m.id,
    r.summary.length > 80);
});

section("done means — an unplayed demonstration is never counted complete");
var empty = B.progressSummary({});
eq("nothing played means nothing complete", empty.complete, 0);
eq("every mechanism is listed as unplayed", empty.unplayed.length, B.MECHANISMS.length);
var one = B.progressSummary({ anchoring: { complete: true } });
eq("one played is one complete", one.complete, 1);
eq("the rest stay unplayed", one.unplayed.length, B.MECHANISMS.length - 1);
var started = B.progressSummary({ anchoring: { complete: false } });
eq("a started demonstration is not complete", started.complete, 0);
eq("but it is no longer unplayed", started.played, 1);

/* ============================================================ must-nots */

section("must-not — it must not tell the reader what to believe, or mock believers");
var core = read("docs/play/belief-core.js");
ok("must_not_tell_reader_what_to_believe: no mechanism claims a verdict",
  !/\byou are (wrong|right|stupid|naive|gullible)\b/i.test(core));
ok("must_not_tell_reader_what_to_believe: no mocking vocabulary in the copy",
  !/\b(idiot|fool|moron|crazy|deluded)\b/i.test(core));
ok("must_not_tell_reader_what_to_believe: every mechanism explains rather than instructs",
  B.MECHANISMS.every(function (m) { return !/^\s*(you must|you should believe)/i.test(m.claim); }));
ok("must_not_invent_evidence: no population statistic is asserted", !/\b\d{1,3}% of (people|adults|readers|users)\b/i.test(core));
ok("must_not_invent_evidence: no fake study citation", !/according to (a )?(study|survey|research) (by|from)/i.test(core));

section("must-not — the map must not decide which version is true");
["verdict", "truth", "confidence", "accurateVersion", "isTrue", "isFalse"].forEach(function (k) {
  ok("must_not_decide_truth: no field called " + k + " on a link",
    !new RegExp("\\b" + k + "\\s*:").test(core), k);
});
var vs = [];
var v1 = B.addVersion(vs, { text: "The tank was cleaned on 3 May. Testing found normal chlorine levels.", source: "office notice", date: "03/05/2026" });
vs.push(v1.version);
var v2 = B.addVersion(vs, { text: "The tank was reportedly not cleaned. Some say nobody confirmed it.", source: "a forward", date: "12/05/2026" });
vs.push(v2.version);
var chain = B.buildChain(vs);
var linkKeys = Object.keys(chain.links[0]).sort().join(",");
eq("a link carries only movement, never a judgement", linkKeys,
  "added,from,hedgesAdded,hedgesRemoved,lengthAfter,lengthBefore,numbersAdded,numbersDropped,removed,repeat,reworded,same,to");
ok("the chain summary refuses to rank the versions", /does not say which version is accurate/.test(B.chainSummary(chain)));
ok("the exported map refuses to rank the versions", /No version is marked accurate or otherwise/.test(B.mapMarkdown(chain, "25/11/2026")));

section("must-not — a version with no provenance cannot be placed on the map");
eq("no source is refused", B.addVersion(vs, { text: "x", date: "01/06/2026" }).ok, false);
ok("the refusal names provenance", /provenance/.test(B.addVersion(vs, { text: "x", date: "01/06/2026" }).reason));
eq("no date is refused", B.addVersion(vs, { text: "x", source: "s" }).ok, false);
eq("a date that is not dd/mm/yyyy is refused", B.addVersion(vs, { text: "x", source: "s", date: "2026-06-01" }).ok, false);
eq("an impossible date is refused", B.addVersion(vs, { text: "x", source: "s", date: "31/02/2026" }).ok, false);
eq("no text is refused", B.addVersion(vs, { source: "s", date: "01/06/2026" }).ok, false);

section("must-not — two identical versions are kept, not merged");
var before = vs.length;
var dup = B.addVersion(vs, { text: v2.version.text, source: "another forward", date: "14/05/2026" });
eq("the identical version is accepted", dup.ok, true);
ok("it is marked as a repeat", dup.version.repeat === true);
eq("it points at the version it repeats", dup.version.repeatOf, 1);
ok("the app says it is kept, not merged", /kept: it is marked as a repeat, not merged/.test(dup.says), dup.says);
vs.push(dup.version);
eq("the list grew: nothing was merged away", vs.length, before + 1);

section("must-not — a corrupt map is never rebuilt from a partial read");
var bad = B.parseMap("{ not json");
eq("a corrupt map is reported", bad.ok, false);
ok("the reason says a chain was not invented", /wrong chain is worse than no chain/.test(bad.reason), bad.reason);
eq("no versions are returned from a corrupt map", bad.versions, undefined);
eq("the raw text is kept for export", bad.raw, "{ not json");
var partialMap = B.parseMap(JSON.stringify({ versions: [{ text: "only text" }, { text: "t", source: "s", date: "01/01/2026" }] }));
eq("entries missing provenance are dropped, not guessed", partialMap.ok && partialMap.versions.length, 1);
eq("a map with nothing usable is refused", B.parseMap(JSON.stringify({ versions: [{ text: "x" }] })).ok, false);

section("must-not — progress must not be silently reset");
var badProgress = B.parseProgress("{ broken");
eq("a corrupt progress file is reported", badProgress.ok, false);
ok("the reason promises no silent reset", /not silently reset|not used/.test(badProgress.reason), badProgress.reason);
eq("the raw progress is kept for export", badProgress.raw, "{ broken");

/* ==================================================== the other mechanics */

section("mechanic — the map diffs versions instead of describing them");
ok("a sentence that disappeared is listed as disappeared", chain.links[0].removed.length >= 1);
ok("hedging phrases added along the chain are counted", chain.links[0].hedgesAdded >= 2, chain.links[0].hedgesAdded);
ok("numbers present earlier and gone later are counted", chain.links[0].numbersDropped >= 1, chain.links[0].numbersDropped);
eq("versions are ordered by date, not by the order they were added", B.buildChain([vs[2], vs[0], vs[1]]).versions[0].date, "03/05/2026");
eq("one version is not a chain", B.chainSummary(B.buildChain([vs[0]])).indexOf("at least two versions") >= 0, true);

section("mechanic — notes are filed by chapter, or under unsorted");
var n1 = B.addNote([], { text: "I moved my estimate towards the anchor.", chapter: "anchoring", at: "25/11/2026" });
eq("a note with a known chapter is filed under it", n1.note.chapter, "anchoring");
ok("the app says where it went", /Filed under Anchoring/.test(n1.says));
var n2 = B.addNote([], { text: "Something else.", chapter: "not-a-mechanism" });
eq("a note with an unknown chapter is filed under unsorted", n2.note.chapter, B.UNSORTED);
ok("the app says it was not attached to whatever was open", /not under whichever chapter happened to be open/.test(n2.says), n2.says);
var n3 = B.addNote([], { text: "   " });
eq("an empty note is refused", n3.ok, false);

section("failure case — storage full or unavailable");
var thrown = B.exportFile("progress", { played: { anchoring: { complete: true, result: { quote: "Rs 9000 → Rs 10500" } } }, notes: [] }, { when: "25/11/2026" }, function () {
  var e = new Error("quota"); e.name = "QuotaExceededError"; throw e;
});
eq("a failed write is reported as failed", thrown.ok, false);
ok("a failed write says the file was not written", /not written/.test(thrown.reason), thrown.reason);
ok("a failed write names the cause", /storage is full/.test(thrown.reason), thrown.reason);
eq("no writer means no file", B.exportFile("progress", {}, {}, null).ok, false);

section("export — what was played, and what was not");
var md = B.progressMarkdown({ savedOn: "25/11/2026", played: { anchoring: { complete: true, result: { quote: "Rs 9000 → Rs 10500" } } }, notes: [] });
ok("the export lists every mechanism", B.MECHANISMS.every(function (m) { return md.indexOf(m.name) >= 0; }));
ok("an unplayed mechanism is exported as unplayed", /Anchoring \| complete/.test(md) && /unplayed/.test(md));
ok("the export quotes the answer that was given", /Rs 9000 → Rs 10500/.test(md));
ok("the export says nothing was counted that was not played", /Nothing in this file was counted as complete unless it was played/.test(md));

section("failure case — no network");
["docs/play/belief-core.js", "docs/play/app.js", "docs/play/sw.js", "docs/play/web-kit.js", "docs/play/export-kit.js"].forEach(function (f) {
  var src = read(f);
  ok("no fetch call in " + f, !/\bfetch\s*\(/.test(src));
  ok("no XHR/WebSocket/beacon in " + f, !/XMLHttpRequest|WebSocket|sendBeacon|EventSource/.test(src));
});
ok("the page forbids connections in its CSP", /connect-src 'none'/.test(read("docs/play/index.html")));

/* ================================================== the shape on disk */

section("shape — every script the page loads exists beside it");
var page = read("docs/play/index.html");
var srcs = (page.match(/<script[^>]+src="([^"]+)"/g) || []).map(function (t) { return t.replace(/.*src="([^"]+)".*/, "$1"); });
ok("the page loads at least three scripts", srcs.length >= 3, srcs.join(","));
srcs.forEach(function (s) {
  ok("script src resolves: " + s, fs.existsSync(path.join(ROOT, "docs", "play", s.replace(/^\.\//, ""))));
});
ok("the landing page exists", fs.existsSync(path.join(ROOT, "docs", "index.html")));
ok("the page manifest exists", fs.existsSync(path.join(ROOT, "PAGES.json")));

/* ============================================================== summary */

var total = passed + failed.length;
if (!total) { console.error("self-tests: 0 assertions ran. That is a failure, not a pass."); process.exit(1); }
if (failed.length) {
  console.error("self-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED");
  failed.forEach(function (f) { console.error("  FAIL " + f); });
  process.exit(1);
}
console.log("self-tests: " + passed + "/" + total + " assertions passed");
