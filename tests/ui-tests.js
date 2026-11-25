#!/usr/bin/env node
/* ui-tests — the Belief page in a real DOM (jsdom).
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * The engine has its own suite, including the spec's countable "done means". This one
 * proves the page is wired to it: a mechanism opens, a step renders, an empty answer is
 * refused, the result only appears after the last answer, it quotes what was typed, the
 * mechanism is marked complete, a note is filed under its chapter, a version without a
 * source is refused, and a corrupt map on reload is reported rather than rebuilt.
 *
 *   npm install --no-save jsdom && node tests/ui-tests.js
 */
"use strict";

var fs = require("fs");
var path = require("path");
var { JSDOM } = require("jsdom");

var ROOT = path.join(__dirname, "..");
var PLAY = path.join(ROOT, "docs", "play");
var PAGE = path.join(PLAY, "index.html");

var passed = 0;
var failed = [];
function ok(name, cond, detail) { if (cond) { passed++; return; } failed.push(name + (detail ? " — " + detail : "")); }
function eq(name, a, b) { ok(name, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }

function build(seed) {
  var html = fs.readFileSync(PAGE, "utf8");
  var dom = new JSDOM(html, { url: "https://example.test/play/index.html", runScripts: "outside-only", pretendToBeVisual: true });
  var w = dom.window;
  if (seed) Object.keys(seed).forEach(function (k) { w.localStorage.setItem(k, seed[k]); });
  ["web-kit.js", "export-kit.js", "belief-core.js", "app.js"].forEach(function (f) {
    w.eval(fs.readFileSync(path.join(PLAY, f), "utf8"));
  });
  return dom;
}

var dom = build(null);
var w = dom.window;
var d = w.document;
var $ = function (id) { return d.getElementById(id); };

ok("the engine loaded into the page", !!w.BeliefCore);

/* ------------------------------------------------------------- the list */

eq("every mechanism is listed", d.querySelectorAll(".mech").length, w.BeliefCore.MECHANISMS.length);
eq("all of them start unplayed", d.querySelectorAll('.mech[data-state="unplayed"]').length, w.BeliefCore.MECHANISMS.length);
ok("the progress line counts them", /played 0 of 6/.test($("progressLine").textContent), $("progressLine").textContent);

/* ------------------------------------------------------- a demonstration */

d.querySelector('.mech[data-id="anchoring"]').click();
eq("the demonstration card opens", $("demoCard").hidden, false);
eq("the title is the mechanism", $("demoTitle").textContent, "Anchoring");
ok("the first step asks a question", /what would you guess/.test($("demoBody").textContent), $("demoBody").textContent);
eq("no result is shown before an answer", $("demoResult").hidden, true);
ok("the page says a result waits for input", /will not show a result until every step is answered/.test($("demoHint").textContent));

$("demoSubmit").click();
ok("an empty answer is refused", /empty/.test($("status").textContent), $("status").textContent);
eq("and no result appears", $("demoResult").hidden, true);

$("input-first").value = "9000";
$("demoSubmit").click();
eq("a partial answer still shows no result", $("demoResult").hidden, true);
ok("the second step is now asked", /guess again/i.test($("demoBody").textContent), $("demoBody").textContent);

$("input-second").value = "10500";
$("demoSubmit").click();
eq("the result appears once the last answer is in", $("demoResult").hidden, false);
ok("the result names the mechanism", /Anchoring/.test($("demoResult").textContent));
ok("the result quotes the answer that was typed",
  /Rs 9000 → Rs 10500/.test($("demoResult").textContent), $("demoResult").textContent);
ok("the mechanism is now marked complete",
  d.querySelector('.mech[data-id="anchoring"]').getAttribute("data-state") === "complete");
ok("the progress line counts one complete", /played 1 of 6 \(1 complete\)/.test($("progressLine").textContent),
  $("progressLine").textContent);
ok("the completion was saved on the device", !!w.localStorage.getItem("belief:progress"));

/* ---------------------------------------------------------------- notes */

$("noteText").value = "My second guess moved towards the shop's number.";
$("noteSave").click();
ok("the note is filed under the mechanism that was open", /Filed under Anchoring/.test($("status").textContent),
  $("status").textContent);
ok("the note appears in the list", /Anchoring/.test($("noteList").textContent), $("noteList").textContent);

/* ------------------------------------------------------------ the export */

w.URL.createObjectURL = function () { return "blob:stub"; };
w.URL.revokeObjectURL = function () {};
w.HTMLAnchorElement.prototype.click = function () {};
$("exportProgress").click();
ok("the export names the file it wrote", /Wrote belief-progress-\d{4}-\d\d-\d\d\.md/.test($("exportNote").textContent),
  $("exportNote").textContent);

w.URL.createObjectURL = function () { throw new Error("storage is full"); };
$("exportProgress").click();
ok("a failed export says the file was not written", /not written/.test($("status").textContent), $("status").textContent);
w.URL.createObjectURL = function () { return "blob:stub"; };

/* ------------------------------------------------------------- the map */

$("tab-map").click();
eq("the map panel shows", $("panel-map").hidden, false);

$("vText").value = "The tank was cleaned on 3 May. Testing found normal chlorine levels.";
$("vSource").value = "";
$("vDate").value = "03/05/2026";
$("vAdd").click();
ok("a version with no source is refused", /no source/.test($("status").textContent), $("status").textContent);
eq("nothing was added", $("versionsCard").hidden, true);

$("vSource").value = "office notice";
$("vAdd").click();
eq("a version with provenance is added", $("versionsCard").hidden, false);
eq("the table has one row", d.querySelectorAll("#vTable tbody tr").length, 1);

$("vText").value = "The tank was reportedly not cleaned. Some say nobody confirmed it.";
$("vSource").value = "a forward";
$("vDate").value = "12/05/2026";
$("vAdd").click();
eq("a second version builds the chain", d.querySelectorAll("#chainList .link").length, 1);
ok("the chain shows what disappeared", /disappeared/.test($("chainList").textContent), $("chainList").textContent);
ok("the chain refuses to rank the versions", /does not say which version is accurate/.test($("chainSummary").textContent),
  $("chainSummary").textContent);

$("vText").value = "The tank was reportedly not cleaned. Some say nobody confirmed it.";
$("vSource").value = "another forward";
$("vDate").value = "14/05/2026";
$("vAdd").click();
ok("an identical version is marked a repeat", /repeat of 2/.test($("vTable").textContent), $("vTable").textContent);
eq("both copies are kept", d.querySelectorAll("#vTable tbody tr").length, 3);

$("exportMap").click();
ok("the map exports", /Wrote rumor-map-/.test($("mapNote").textContent), $("mapNote").textContent);

/* ------------------------------------------- a corrupt map on reload */

var dom2 = build({ "belief:map": "{ broken map" });
var d2 = dom2.window.document;
ok("a corrupt map is reported on load", /not readable JSON/.test(d2.getElementById("status").textContent),
  d2.getElementById("status").textContent);
ok("a corrupt map offers an export and a deliberate restart",
  Array.prototype.some.call(d2.querySelectorAll("button"), function (b) { return /unreadable map/.test(b.textContent); }) &&
  Array.prototype.some.call(d2.querySelectorAll("button"), function (b) { return /Clear the map/.test(b.textContent); }));
eq("no chain is invented from a corrupt map", d2.querySelectorAll("#chainList .link").length, 0);
eq("no versions are shown from a corrupt map", d2.querySelectorAll("#vTable tbody tr").length, 0);

/* ------------------------------------------- corrupt progress on reload */

var dom3 = build({ "belief:progress": "{ broken progress" });
var d3 = dom3.window.document;
ok("a corrupt progress file is reported", /not readable JSON/.test(d3.getElementById("status").textContent),
  d3.getElementById("status").textContent);
ok("the page offers to start from the beginning deliberately",
  Array.prototype.some.call(d3.querySelectorAll("button"), function (b) { return /Start from the beginning/.test(b.textContent); }));
ok("the mechanisms still work with a corrupt progress file",
  (function () {
    d3.querySelector('.mech[data-id="technique"]').click();
    return d3.getElementById("demoCard").hidden === false;
  })());

var total = passed + failed.length;
if (!total) { console.error("ui-tests: 0 assertions ran. That is a failure, not a pass."); process.exit(1); }
if (failed.length) {
  console.error("ui-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED");
  failed.forEach(function (f) { console.error("  FAIL " + f); });
  process.exit(1);
}
console.log("ui-tests: " + passed + "/" + total + " assertions passed");
dom.window.close(); dom2.window.close(); dom3.window.close();
