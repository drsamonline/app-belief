/* app — the Belief page. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * Wiring only. The mechanisms, the demonstrations and the rumor map live in
 * belief-core.js, which the tests exercise directly. This file renders a step, records
 * an answer, and shows a result — and it refuses to show a result before the last
 * answer is in, because core does.
 */
(function () {
  "use strict";

  var B = window.BeliefCore;
  var $ = function (id) { return document.getElementById(id); };

  var K_PROGRESS = "belief:progress";
  var K_MAP = "belief:map";

  var els = {
    status: $("status"), progressLine: $("progressLine"),
    mechList: $("mechList"), demoCard: $("demoCard"), demoTitle: $("demoTitle"),
    demoProgress: $("demoProgress"), demoBody: $("demoBody"), demoResult: $("demoResult"),
    demoBar: $("demoBar"), demoSubmit: $("demoSubmit"), demoRestart: $("demoRestart"), demoHint: $("demoHint"),
    noteCard: $("noteCard"), noteWhere: $("noteWhere"), noteText: $("noteText"), noteSave: $("noteSave"),
    noteList: $("noteList"), exportProgress: $("exportProgress"), exportNote: $("exportNote"),
    vText: $("vText"), vSource: $("vSource"), vDate: $("vDate"), vAdd: $("vAdd"),
    mapExample: $("mapExample"), exportMap: $("exportMap"), mapNote: $("mapNote"),
    versionsCard: $("versionsCard"), vTable: $("vTable"), vCount: $("vCount"),
    chainCard: $("chainCard"), chainSummary: $("chainSummary"), chainList: $("chainList"),
    mapEmpty: $("mapEmpty")
  };

  var state = {
    played: {},
    notes: [],
    current: null,
    versions: [],
    chain: null,
    when: ""
  };

  /* ------------------------------------------------------------- helpers */

  function today() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
  }

  function setStatus(kind, msg) {
    els.status.className = "status show " + kind;
    els.status.textContent = msg;
  }
  function clearStatus() { els.status.className = "status"; els.status.textContent = ""; }

  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function store(key, value) {
    try { window.localStorage.setItem(key, value); return { ok: true }; }
    catch (e) { return { ok: false, reason: e && e.name === "QuotaExceededError" ? "storage is full" : "storage is unavailable" }; }
  }
  function load(key) {
    try { return { ok: true, value: window.localStorage.getItem(key) }; }
    catch (e) { return { ok: false, value: null }; }
  }
  function drop(key) { try { window.localStorage.removeItem(key); return true; } catch (e) { return false; } }

  function persistProgress() {
    var saved = store(K_PROGRESS, B.serializeProgress({ savedOn: today(), played: state.played, notes: state.notes }));
    if (!saved.ok) {
      setStatus("warn", "This session will not be remembered: " + saved.reason + ". Reading and playing still work.");
      return false;
    }
    return true;
  }

  /* --------------------------------------------------------- mechanism list */

  function renderMechList() {
    els.mechList.textContent = "";
    B.MECHANISMS.forEach(function (m) {
      var entry = state.played[m.id];
      var st = entry ? (entry.complete ? "complete" : "started") : "unplayed";
      var b = node("button", "mech");
      b.type = "button";
      b.dataset.state = st;
      b.dataset.id = m.id;
      if (state.current && state.current.id === m.id) b.setAttribute("aria-current", "true");
      b.appendChild(node("b", null, m.name));
      b.appendChild(node("span", "claim", m.claim));
      b.appendChild(node("span", "badge " + (st === "complete" ? "complete" : st === "started" ? "started" : ""), st));
      b.addEventListener("click", function () { openDemo(m.id); });
      els.mechList.appendChild(b);
    });

    var p = B.progressSummary(state.played);
    els.progressLine.textContent = "You have played " + p.played + " of " + p.mechanisms +
      " (" + p.complete + " complete). " + (p.unplayed.length ? p.unplayed.length + " unplayed." : "None left unplayed.");
  }

  /* ------------------------------------------------------------- a demo */

  function openDemo(id) {
    clearStatus();
    var m = B.mechanismById(id);
    if (!m) return;
    var existing = state.played[id];
    if (existing && existing.complete) {
      state.current = null;
      els.demoCard.hidden = false;
      els.demoTitle.textContent = m.name;
      els.demoProgress.textContent = "Already played — this is the result you got.";
      els.demoBody.textContent = "";
      els.demoBar.hidden = true;
      showResult(existing.result);
      renderMechList();
      return;
    }
    state.current = B.startDemo(id);
    renderMechList();
    renderStep();
  }

  function renderStep() {
    var s = state.current;
    if (!s || !s.step) return;
    var m = B.mechanismById(s.id);
    els.demoCard.hidden = false;
    els.demoTitle.textContent = m.name;
    els.demoBody.textContent = "";
    els.demoResult.hidden = true;
    els.demoBar.hidden = false;
    els.demoSubmit.hidden = false;
    els.demoRestart.hidden = false;
    els.demoHint.textContent = "This demonstration will not show a result until every step is answered.";
    var idx = m.steps.map(function (x) { return x.id; }).indexOf(s.step.id);
    els.demoProgress.textContent = "Step " + (idx + 1) + " of " + m.steps.length;
    els.demoBody.appendChild(node("p", "step", s.step.prompt));
    renderInput(s.step);
    renderNoteWhere(m);
  }

  function renderInput(step) {
    var wrap = node("div");
    var kind = step.kind;

    if (kind === "choice") {
      step.options.forEach(function (o, i) {
        var lab = node("label", "choice");
        var input = document.createElement("input");
        input.type = "radio";
        input.name = "step-" + step.id;
        input.value = o.value;
        if (i === 0) input.checked = false;
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(o.label));
        wrap.appendChild(lab);
      });
    } else if (kind === "number" || kind === "scale") {
      var inp = document.createElement("input");
      if (kind === "number") {
        inp.type = "number";
        if (step.min != null) inp.min = step.min;
        if (step.max != null) inp.max = step.max;
      } else {
        inp.type = "range";
        inp.min = step.min;
        inp.max = step.max;
        inp.value = Math.round((step.min + step.max) / 2);
      }
      inp.id = "input-" + step.id;
      wrap.appendChild(inp);
      if (kind === "scale") {
        var out = node("div", "hint", "Value: " + inp.value);
        out.id = "scaleOut-" + step.id;
        inp.addEventListener("input", function () { out.textContent = "Value: " + inp.value; });
        wrap.appendChild(out);
      }
    } else if (kind === "text") {
      var ta = document.createElement("textarea");
      ta.rows = 3;
      ta.id = "input-" + step.id;
      ta.placeholder = "Type your answers, separated by commas.";
      if (step.maxlength) ta.maxLength = step.maxlength;
      wrap.appendChild(ta);
    } else if (kind === "multi") {
      step.options.forEach(function (o) {
        var lab = node("label", "choice");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.name = "step-" + step.id;
        input.value = o.value;
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(o.label));
        wrap.appendChild(lab);
      });
      wrap.appendChild(node("p", "hint", "Choose exactly " + step.pick + "."));
    } else if (kind === "rating") {
      var g = node("div", "rating");
      step.items.forEach(function (it, i) {
        var row = node("div", "row");
        row.appendChild(node("div", null, (i + 1) + ". " + it.text));
        var sel = document.createElement("select");
        sel.id = "rate-" + it.id;
        var blank = document.createElement("option");
        blank.value = "";
        blank.textContent = "—";
        sel.appendChild(blank);
        for (var v = step.min; v <= step.max; v++) {
          var o2 = document.createElement("option");
          o2.value = String(v);
          o2.textContent = String(v);
          sel.appendChild(o2);
        }
        row.appendChild(sel);
        g.appendChild(row);
      });
      wrap.appendChild(g);
    }
    els.demoBody.appendChild(wrap);
  }

  function readInput(step) {
    if (step.kind === "choice") {
      var picked = document.querySelector('input[name="step-' + step.id + '"]:checked');
      return picked ? picked.value : "";
    }
    if (step.kind === "number" || step.kind === "scale") {
      var inp = $("input-" + step.id);
      return inp ? inp.value : "";
    }
    if (step.kind === "text") {
      var ta = $("input-" + step.id);
      return ta ? ta.value : "";
    }
    if (step.kind === "multi") {
      var out = [];
      Array.prototype.forEach.call(document.querySelectorAll('input[name="step-' + step.id + '"]:checked'), function (c) { out.push(c.value); });
      return out;
    }
    if (step.kind === "rating") {
      var ratings = {};
      for (var i = 0; i < step.items.length; i++) {
        var sel = $("rate-" + step.items[i].id);
        ratings[step.items[i].id] = sel ? sel.value : "";
      }
      return ratings;
    }
    return "";
  }

  function submitStep() {
    var s = state.current;
    if (!s || !s.step) return;
    var value = readInput(s.step);
    var next = B.answerDemo(s, s.step.id, value);
    if (!next.ok) {
      setStatus("bad", next.reason);
      return;
    }
    clearStatus();
    state.current = next;
    if (next.complete) {
      var result = B.demoResult(next);
      if (!result.ok) { setStatus("bad", result.reason); return; }
      state.played[next.id] = { complete: true, answers: next.answers, result: result };
      persistProgress();
      els.demoBar.hidden = true;
      showResult(result);
      renderMechList();
      return;
    }
    renderStep();
  }

  function showResult(result) {
    els.demoResult.hidden = false;
    els.demoResult.textContent = "";
    els.demoResult.appendChild(node("span", "mech", result.mechanism));
    els.demoResult.appendChild(node("p", null, result.summary));
    els.demoResult.appendChild(node("div", "hint", "Your answer, quoted:"));
    els.demoResult.appendChild(node("div", "q", result.quote));
    els.demoResult.appendChild(node("p", "hint",
      "Nothing above was measured against other people: the only numbers are yours."));
    renderNoteWhere(B.mechanismById(result.mechanismId));
  }

  function renderNoteWhere(m) {
    if (!m) {
      els.noteWhere.textContent = "No chapter chosen yet — a note with no chapter is filed under \u201cunsorted\u201d, and says so.";
      return;
    }
    els.noteWhere.textContent = "This note will be filed under \u201c" + m.name + "\u201d.";
  }

  /* --------------------------------------------------------------- notes */

  function saveNote() {
    var chapter = state.current && state.current.id ? state.current.id : "";
    var res = B.addNote(state.notes, { text: els.noteText.value, chapter: chapter, at: today() });
    if (!res.ok) { setStatus("bad", res.reason); return; }
    state.notes.push(res.note);
    els.noteText.value = "";
    persistProgress();
    renderNotes();
    setStatus(res.note_about_unsorted ? "warn" : "ok", res.says);
  }

  function renderNotes() {
    els.noteList.textContent = "";
    state.notes.slice().reverse().forEach(function (n) {
      var m = B.mechanismById(n.chapter);
      var label = n.chapter === B.UNSORTED ? "unsorted" : (m ? m.name : "unsorted");
      els.noteList.appendChild(node("li", null, "[" + label + "] " + n.text));
    });
  }

  /* ----------------------------------------------------------- rumor map */

  function addVersion() {
    clearStatus();
    var res = B.addVersion(state.versions, { text: els.vText.value, source: els.vSource.value, date: els.vDate.value });
    if (!res.ok) { setStatus("bad", res.reason); return; }
    state.versions.push(res.version);
    els.vText.value = "";
    renderMap();
    var saved = store(K_MAP, B.serializeMap(state.versions));
    if (!saved.ok) setStatus("warn", res.says + " This version is on screen only — " + saved.reason + ", so it was not saved.");
    else setStatus(res.version.repeat ? "warn" : "ok", res.says);
  }

  function renderMap() {
    state.chain = B.buildChain(state.versions);
    var has = state.versions.length > 0;
    els.versionsCard.hidden = !has;
    els.mapEmpty.hidden = state.versions.length >= 2;

    els.vTable.querySelector("tbody").textContent = "";
    state.versions.forEach(function (v, i) {
      var tr = node("tr");
      tr.appendChild(node("td", null, String(i + 1)));
      tr.appendChild(node("td", null, v.date));
      tr.appendChild(node("td", null, v.source));
      tr.appendChild(node("td", null, String(v.sentences)));
      var tag = node("td");
      if (v.repeat) tag.appendChild(node("span", "badge started", "repeat of " + (v.repeatOf + 1)));
      tr.appendChild(tag);
      els.vTable.querySelector("tbody").appendChild(tr);
    });
    els.vCount.textContent = "· " + state.versions.length + " added";

    els.chainCard.hidden = state.versions.length < 2;
    if (state.versions.length >= 2) {
      els.chainSummary.textContent = B.chainSummary(state.chain);
      els.chainList.textContent = "";
      state.chain.links.forEach(function (l) {
        var li = node("li", "link");
        li.appendChild(node("h4", null, l.from.date + " → " + l.to.date + (l.repeat ? "  (repeat)" : "")));
        var ul = node("ul");
        l.added.forEach(function (s) { ul.appendChild(node("li", "add", "appeared: " + s)); });
        l.removed.forEach(function (s) { ul.appendChild(node("li", "del", "disappeared: " + s)); });
        if (l.hedgesAdded) ul.appendChild(node("li", null, l.hedgesAdded + " hedging phrase(s) added"));
        if (l.numbersDropped) ul.appendChild(node("li", null, l.numbersDropped + " number(s) dropped"));
        if (!l.added.length && !l.removed.length && !l.hedgesAdded && !l.numbersDropped) {
          ul.appendChild(node("li", null, "no sentence changed — a repeat or a reordering"));
        }
        li.appendChild(ul);
        els.chainList.appendChild(li);
      });
    }
    els.mapNote.textContent = state.versions.length + " version(s) on this device.";
  }

  /* -------------------------------------------------------------- export */

  function writer(name, text, mime) {
    if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
    window.Export.save(name, text, mime);
    return true;
  }

  function doExport(what, payload) {
    var out = B.exportFile(what, payload, { when: today() }, writer);
    if (out.ok) {
      var where = what === "map" ? els.mapNote : els.exportNote;
      where.textContent = "Wrote " + out.filename + " (" + out.bytes + " bytes).";
      setStatus("ok", "Wrote " + out.filename + ".");
    } else {
      setStatus("bad", out.reason + ".");
    }
  }

  /* ---------------------------------------------------------------- tabs */

  ["mech", "map"].forEach(function (name) {
    $("tab-" + name).addEventListener("click", function () {
      ["mech", "map"].forEach(function (other) {
        var on = other === name;
        $("tab-" + other).setAttribute("aria-selected", on ? "true" : "false");
        $("panel-" + other).hidden = !on;
      });
    });
  });

  /* ---------------------------------------------------------------- wire */

  els.demoSubmit.addEventListener("click", submitStep);
  els.demoRestart.addEventListener("click", function () {
    if (state.current) { var id = state.current.id; state.current = null; openDemo(id); }
  });
  els.noteSave.addEventListener("click", saveNote);
  els.exportProgress.addEventListener("click", function () {
    doExport("progress", { savedOn: today(), played: state.played, notes: state.notes });
  });
  els.vAdd.addEventListener("click", addVersion);
  els.exportMap.addEventListener("click", function () {
    if (!state.chain || !state.chain.count) { setStatus("bad", "There is no map to export yet — add two versions first."); return; }
    doExport("map", state.chain);
  });
  els.mapExample.addEventListener("click", function () {
    state.versions = [];
    var a = B.addVersion(state.versions, {
      text: "The colony water tank was cleaned on 3 May 2026. The colony office confirmed the cleaning in a notice. Testing found normal chlorine levels.",
      source: "colony office notice", date: "03/05/2026"
    });
    state.versions.push(a.version);
    var b = B.addVersion(state.versions, {
      text: "The colony water tank was reportedly not cleaned in May. Some say the office never confirmed anything.",
      source: "WhatsApp forward", date: "12/05/2026"
    });
    state.versions.push(b.version);
    var c = B.addVersion(state.versions, {
      text: "The colony water tank was reportedly not cleaned in May. Some say the office never confirmed anything.",
      source: "another forward, same wording", date: "14/05/2026"
    });
    state.versions.push(c.version);
    renderMap();
    store(K_MAP, B.serializeMap(state.versions));
    setStatus("ok", "Example loaded: an invented story, three versions. The third is word-for-word the second — it is kept and marked a repeat, not merged.");
  });

  /* ------------------------------------------------------------ start up */

  var rawProgress = load(K_PROGRESS);
  if (rawProgress.ok && rawProgress.value) {
    var parsed = B.parseProgress(rawProgress.value);
    if (parsed.ok) {
      state.played = parsed.data.played;
      state.notes = parsed.data.notes;
    } else {
      setStatus("bad", parsed.reason);
      var keep = node("button", "small", "Export the unreadable progress");
      keep.addEventListener("click", function () { doExport("raw", parsed); });
      els.exportNote.parentNode.insertBefore(keep, els.exportNote);
      var restart = node("button", "small", "Start from the beginning");
      restart.addEventListener("click", function () {
        drop(K_PROGRESS);
        state.played = {};
        state.notes = [];
        renderMechList();
        renderNotes();
        setStatus("ok", "Starting from the beginning, deliberately. The unreadable file is gone.");
      });
      els.exportNote.parentNode.insertBefore(restart, els.exportNote);
    }
  }

  var rawMap = load(K_MAP);
  if (rawMap.ok && rawMap.value) {
    var pm = B.parseMap(rawMap.value);
    if (pm.ok) { state.versions = pm.versions; }
    else {
      setStatus("bad", pm.reason);
      var keepMap = node("button", "small", "Export the unreadable map");
      keepMap.addEventListener("click", function () { doExport("raw", pm); });
      els.mapNote.parentNode.insertBefore(keepMap, els.mapNote);
      var clearMap = node("button", "small", "Clear the map and start again");
      clearMap.addEventListener("click", function () {
        drop(K_MAP);
        state.versions = [];
        renderMap();
        setStatus("ok", "The map was cleared. A chain was not rebuilt from the partial read.");
      });
      els.mapNote.parentNode.insertBefore(clearMap, els.mapNote);
    }
  }

  renderMechList();
  renderNotes();
  renderMap();
  if (window.Loom && window.Loom.pwa) window.Loom.pwa.register("sw.js");
})();
