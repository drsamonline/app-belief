/* belief-core — the engine behind Belief.
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * Two jobs, one file, because both are about how a story or a belief moves:
 *
 *   mechanisms   six demonstrations. Each one asks the reader something FIRST and
 *                only then shows a result computed from the reader's own answers.
 *                Nothing here is an essay with an illustration, and no population
 *                statistic is invented: the only numbers shown are the ones the
 *                reader typed.
 *   rumor map    versions of a story, each with a source and a date, diffed against
 *                each other so the mutation is visible as a chain. It never says
 *                which version is true - only what changed, and when.
 *
 * Pure functions: no DOM, no network, no storage. The page does the wiring.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BeliefCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";
  var UNSORTED = "unsorted";

  /* ============================================================== mechanisms
   * Every mechanism has exactly one demonstration, and the registry is the only
   * place either is listed: MECHANISMS.length is the number of mechanisms, and
   * every entry carries a runnable demo. That is what makes the two counts equal
   * by construction rather than by promise.
   */

  function opt(value, label) { return { value: value, label: label }; }

  var MECHANISMS = [
    {
      id: "anchoring",
      name: "Anchoring",
      claim: "The first number you meet pulls the next number you give.",
      steps: [
        { id: "first", kind: "number", min: 1, max: 100000, unit: "rupees",
          prompt: "A shop lists a lamp at Rs 12,000. Before reading anything else: what would you guess it is actually worth?" },
        { id: "second", kind: "number", min: 1, max: 100000, unit: "rupees",
          prompt: "The Rs 12,000 was a number the shop chose, not a valuation. Guess again, with that in mind." }
      ],
      evaluate: function (a) {
        var first = Number(a.first);
        var second = Number(a.second);
        var moved = second - first;
        var direction = moved === 0 ? "did not move at all" : (moved < 0 ? "came down" : "went up");
        var pull = Math.abs(second - 12000) < Math.abs(first - 12000);
        return {
          summary: "Your first guess was Rs " + first + " and your second was Rs " + second + " — it " + direction +
            " by Rs " + Math.abs(moved) + ". The anchor was the shop's number, not a valuation, and your second guess " +
            (pull ? "moved TOWARDS it even after you were told it was arbitrary. That is anchoring: the first number " +
                    "sets the range you reason inside."
                  : "moved away from it once you were told it was arbitrary. Anchoring is weaker in you than the " +
                    "effect it describes — which is worth knowing about yourself.") +
            " Nothing here is a score: it is the mechanism, working on the only person in the room.",
          quote: "Rs " + first + " → Rs " + second,
          mechanism: "Anchoring"
        };
      }
    },
    {
      id: "availability",
      name: "Availability",
      claim: "What comes to mind easily feels more likely than what is hard to recall.",
      steps: [
        { id: "easy", kind: "text", maxlength: 200,
          prompt: "Name three reasons a new cafe on your street could fail. (Three is easy.)" },
        { id: "rateEasy", kind: "scale", min: 0, max: 100,
          prompt: "How likely is that cafe to fail within a year? 0 = certain to survive, 100 = certain to fail." },
        { id: "hard", kind: "text", maxlength: 400,
          prompt: "Now name eight more reasons. Eight is hard — most people stall around five." },
        { id: "rateHard", kind: "scale", min: 0, max: 100,
          prompt: "Same question again: how likely is it to fail within a year?" }
      ],
      evaluate: function (a) {
        var e = Number(a.rateEasy);
        var h = Number(a.rateHard);
        var count = String(a.hard || "").split(/[,;\n]/).filter(function (s) { return s.trim().length > 1; }).length;
        var fell = h < e;
        return {
          summary: "After listing three reasons you put the chance of failure at " + e + ", and after the harder " +
            "task — where you produced " + count + " more — you put it at " + h + ". " +
            (fell ? "Your estimate FELL as the task got harder. Nothing about the cafe changed between the two " +
                    "answers; only how easy it was to bring reasons to mind. That is availability: fluency is read " +
                    "as probability."
                  : "Your estimate held or rose. The mechanism did not catch you this time — which does not make " +
                    "the mechanism imaginary, it makes it one you can see coming.") +
            " The two answers are yours; the app added nothing to them.",
          quote: e + " then " + h + " (after producing " + count + " more reasons)",
          mechanism: "Availability"
        };
      }
    },
    {
      id: "confirmation",
      name: "Confirmation bias",
      claim: "Once you lean, you read the evidence that agrees with you.",
      steps: [
        { id: "lean", kind: "choice",
          prompt: "Two headlines about a new law. Which do you open first?",
          options: [
            opt("against", "\u201cNew law will cost ordinary families money\u201d"),
            opt("for", "\u201cNew law will save ordinary families money\u201d")
          ] },
        { id: "picks", kind: "multi", pick: 3,
          prompt: "Pick the three you would actually read. (Six are offered; you get three.)",
          options: [
            opt("a-for", "A study finds the law saves money"),
            opt("a-against", "A study finds the law costs money"),
            opt("b-against", "Three families describe higher bills"),
            opt("b-for", "Three families describe lower bills"),
            opt("c-for", "An economist explains why the savings were underestimated"),
            opt("c-against", "An economist explains why the costs were underestimated")
          ] }
      ],
      evaluate: function (a) {
        var leaning = a.lean === "for" ? "for" : "against";
        var picks = Array.isArray(a.picks) ? a.picks : [];
        var agreeing = picks.filter(function (p) { return p.split("-")[1] === leaning; }).length;
        var disagreeing = picks.length - agreeing;
        var said = picks.map(function (p) { return p.split("-")[1]; });
        return {
          summary: "You opened the headline that the law would " + (leaning === "for" ? "save" : "cost") +
            " money, and then chose " + agreeing + " of your 3 sources from that same side (" + disagreeing +
            " from the other). The six sources were symmetrical: three each way, same strength. " +
            (agreeing > disagreeing
              ? "Your reading followed your lean. That is confirmation bias — not dishonesty, and not stupidity: " +
                "the agreeing sources felt more worth your time, and that feeling arrived before any reasoning did."
              : "Your reading did not follow your lean. The bias is a tendency, not a law, and you can be on the " +
                "other side of it.") +
            " Nothing here says which side is right — only which side you reached for.",
          quote: "you leaned \u201c" + leaning + "\u201d and picked " + said.join(", "),
          mechanism: "Confirmation bias"
        };
      }
    },
    {
      id: "repetition",
      name: "Illusory truth",
      claim: "A statement you have met before feels truer than one you have not.",
      steps: [
        { id: "ratings", kind: "rating", min: 1, max: 5,
          prompt: "How true does each statement feel? 1 = not at all, 5 = certainly. You are rating the wording, not checking facts.",
          items: [
            { id: "s1", text: "Cooling a burn under running water for twenty minutes reduces the damage." },
            { id: "s2", text: "A metal water bottle left in a hot car turns the water unsafe." },
            { id: "s3", text: "Cooling a burn under running water for twenty minutes reduces the damage." },
            { id: "s4", text: "Reading in dim light permanently weakens eyesight." },
            { id: "s5", text: "A metal water bottle left in a hot car turns the water unsafe." },
            { id: "s6", text: "Reading in dim light permanently weakens eyesight." }
          ] }
      ],
      evaluate: function (a) {
        var r = a.ratings || {};
        var first = [Number(r.s1), Number(r.s2), Number(r.s4)];
        var again = [Number(r.s3), Number(r.s5), Number(r.s6)];
        var avg = function (xs) { return xs.reduce(function (s, x) { return s + x; }, 0) / xs.length; };
        var f = avg(first);
        var g = avg(again);
        var delta = Math.round((g - f) * 100) / 100;
        return {
          summary: "Each statement appeared twice. You rated the first appearance at an average of " + f.toFixed(2) +
            " and the second at " + g.toFixed(2) + " — a change of " + (delta >= 0 ? "+" : "") + delta +
            " with no new evidence in between, because there was none: it was the same sentence. " +
            (delta > 0
              ? "Familiarity raised your rating. That is the illusory truth effect, and it is why repetition is a " +
                "propaganda technique rather than an accident."
              : "Your second rating did not rise. The effect is an average tendency, not a rule, and noticing the " +
                "repeat is exactly what blunts it.") +
            " The app did not check whether the statements are true; it only measured how they felt the second time.",
          quote: "first reading " + f.toFixed(2) + " → second reading " + g.toFixed(2),
          mechanism: "Illusory truth"
        };
      }
    },
    {
      id: "escalation",
      name: "Escalation of commitment",
      claim: "A small yes makes the next yes cheaper, and the sunk cost makes leaving dearer.",
      steps: [
        { id: "step1", kind: "choice",
          prompt: "A free evening class on \u201cnatural energy\u201d. The first session is free and pleasant. Do you go to the second?",
          options: [opt("yes", "Yes, it was pleasant"), opt("no", "No, not for me")] },
        { id: "step2", kind: "choice",
          prompt: "Session two: the group is warm, the teacher says the next level is Rs 8,000 and asks you to bring a friend. Do you pay?",
          options: [opt("yes", "Yes, I have already enjoyed two sessions"), opt("no", "No, that is where I stop")] },
        { id: "step3", kind: "choice",
          prompt: "You paid. Week six: the teacher says the method only works if you stop taking one of your prescribed medicines. What do you do?",
          options: [opt("stop", "Stop the medicine as asked"), opt("ask", "Ask a doctor before changing anything"), opt("leave", "Leave the group")] }
      ],
      evaluate: function (a) {
        var path = [a.step1, a.step2, a.step3].map(function (x) { return x || "(unanswered)"; });
        var paid = a.step2 === "yes";
        var three = a.step3 === "stop";
        return {
          summary: "Your path was: " + path.join(" → ") + ". Each step was small and each was asked after the last " +
            "one had already been agreed to — that sequence is the mechanism (foot-in-the-door). " +
            (paid ? "You paid after two pleasant free sessions, which is when a sunk cost starts arguing on the " +
                    "group's behalf: \u201cI have already given it this much.\u201d "
                  : "You stopped before paying, so the sunk cost never got a grip on you. ") +
            (three ? "At week six you accepted a change to prescribed medicine on a teacher's instruction. No " +
                     "app can make that decision safe: a change to prescribed medicine belongs with a doctor, " +
                     "whoever is asking and however warm the room."
                   : "At week six you did not accept the medicine instruction — which is the line that matters, " +
                     "because a group that asks for that has stopped being a class.") +
            " This is not a verdict on you: it is the shape of the trap, drawn with your own choices.",
          quote: path.join(" → "),
          mechanism: "Escalation of commitment"
        };
      }
    },
    {
      id: "technique",
      name: "Propaganda technique",
      claim: "Persuasion has named moves, and naming them is most of the defence.",
      steps: [
        { id: "t1", kind: "choice",
          prompt: "\u201cEveryone in this colony already knows the water tank is poisoned. Are you the last to find out?\u201d Which technique is doing the work?",
          options: [opt("bandwagon", "Bandwagon — everyone already agrees"), opt("authority", "Authority — an expert says so"), opt("fear", "Fear — something bad will happen to you"), opt("none", "No technique; it is a plain statement")] },
        { id: "t2", kind: "choice",
          prompt: "\u201cA retired engineer with thirty years of experience says the tank is safe.\u201d Which technique?",
          options: [opt("bandwagon", "Bandwagon"), opt("authority", "Authority — a titled person instead of evidence"), opt("fear", "Fear"), opt("none", "No technique")] },
        { id: "t3", kind: "choice",
          prompt: "\u201cIf you drink this water tonight, do not say nobody warned you.\u201d Which technique?",
          options: [opt("bandwagon", "Bandwagon"), opt("authority", "Authority"), opt("fear", "Fear — a threat in place of a fact"), opt("none", "No technique")] }
      ],
      evaluate: function (a) {
        var key = { t1: "bandwagon", t2: "authority", t3: "fear" };
        var right = ["t1", "t2", "t3"].filter(function (k) { return a[k] === key[k]; }).length;
        return {
          summary: "You named " + right + " of the three correctly: bandwagon (\u201ceveryone knows\u201d), authority " +
            "(a title standing in for evidence) and fear (a threat standing in for a fact). " +
            (right === 3
              ? "All three. The defence against a technique is not scepticism about everything — it is being able " +
                "to say which move is being made."
              : "The ones you missed are the ones that work on you most easily, which is worth knowing without " +
                "being hard on yourself: recognising the move is the skill, and it is learnable.") +
            " Note what was NOT required: deciding whether the water is actually poisoned. Naming the technique " +
            "comes first; the evidence comes after, from someone who measured it.",
          quote: "you named " + right + " of 3 techniques",
          mechanism: "Propaganda technique"
        };
      }
    }
  ];

  function mechanismById(id) {
    for (var i = 0; i < MECHANISMS.length; i++) if (MECHANISMS[i].id === id) return MECHANISMS[i];
    return null;
  }

  /* A demonstration is a small state machine. `start` gives the first step and an
   * empty answer set; `answer` records one; `result` refuses until every step has
   * an answer. That refusal is the spec's rule: input before result, always. */
  function startDemo(id) {
    var m = mechanismById(id);
    if (!m) return { ok: false, reason: "there is no mechanism called \u201c" + id + "\u201d" };
    return { ok: true, id: m.id, name: m.name, stepIndex: 0, step: m.steps[0], answers: {}, complete: false };
  }

  function answeredCount(state) {
    var m = mechanismById(state.id);
    if (!m) return 0;
    return m.steps.filter(function (s) { return hasAnswer(state.answers[s.id]); }).length;
  }

  function hasAnswer(v) {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") {
      var keys = Object.keys(v);
      return keys.length > 0 && keys.every(function (k) { return v[k] !== "" && v[k] != null; });
    }
    return true;
  }

  function answerDemo(state, stepId, value) {
    var m = mechanismById(state.id);
    if (!m) return { ok: false, reason: "unknown mechanism" };
    var step = m.steps.filter(function (s) { return s.id === stepId; })[0];
    if (!step) return { ok: false, reason: "this demonstration has no step called \u201c" + stepId + "\u201d" };
    if (!hasAnswer(value)) return { ok: false, reason: "that step is empty — a demonstration cannot run on no answer" };

    var check = checkStep(step, value);
    if (!check.ok) return check;

    var next = { ok: true, id: state.id, name: state.name, stepIndex: state.stepIndex, step: state.step, answers: {}, complete: false };
    Object.keys(state.answers).forEach(function (k) { next.answers[k] = state.answers[k]; });
    next.answers[stepId] = value;
    var done = m.steps.every(function (s) { return hasAnswer(next.answers[s.id]); });
    next.complete = done;
    if (!done) {
      var idx = m.steps.map(function (s) { return s.id; }).indexOf(stepId);
      var following = m.steps.slice(idx + 1).filter(function (s) { return !hasAnswer(next.answers[s.id]); })[0] || m.steps[0];
      next.step = following;
      next.stepIndex = m.steps.map(function (s) { return s.id; }).indexOf(following.id);
    } else {
      next.step = null;
      next.stepIndex = m.steps.length;
    }
    return next;
  }

  function checkStep(step, value) {
    if (step.kind === "number" || step.kind === "scale") {
      var n = Number(value);
      if (isNaN(n)) return { ok: false, reason: "that step needs a number" };
      if (step.min != null && n < step.min) return { ok: false, reason: "the smallest value here is " + step.min };
      if (step.max != null && n > step.max) return { ok: false, reason: "the largest value here is " + step.max };
    }
    if (step.kind === "choice") {
      var values = step.options.map(function (o) { return o.value; });
      if (values.indexOf(value) < 0) return { ok: false, reason: "that is not one of the options offered" };
    }
    if (step.kind === "multi") {
      if (!Array.isArray(value)) return { ok: false, reason: "that step needs a list of choices" };
      if (step.pick && value.length !== step.pick) return { ok: false, reason: "choose exactly " + step.pick };
      var allowed = step.options.map(function (o) { return o.value; });
      for (var i = 0; i < value.length; i++) if (allowed.indexOf(value[i]) < 0) return { ok: false, reason: "unknown option \u201c" + value[i] + "\u201d" };
    }
    if (step.kind === "rating") {
      if (typeof value !== "object") return { ok: false, reason: "that step needs a rating for each statement" };
      for (var j = 0; j < step.items.length; j++) {
        var v = value[step.items[j].id];
        if (v == null || v === "") return { ok: false, reason: "every statement needs a rating" };
        var num = Number(v);
        if (isNaN(num) || num < step.min || num > step.max) return { ok: false, reason: "ratings run from " + step.min + " to " + step.max };
      }
    }
    return { ok: true };
  }

  /* The result: refused until the demonstration is complete, and always quoting an
   * answer the reader actually gave. */
  function demoResult(state) {
    var m = mechanismById(state && state.id);
    if (!m) return { ok: false, reason: "unknown mechanism" };
    if (!answeredCount(state)) {
      return { ok: false, reason: "this demonstration needs an answer before it can show anything" };
    }
    if (!state.complete) {
      var left = m.steps.length - answeredCount(state);
      return { ok: false, reason: "still " + left + " answer(s) short — a demonstration does not show a result on a partial answer" };
    }
    var out = m.evaluate(state.answers);
    var quote = String(out.quote || "");
    return {
      ok: true,
      mechanism: m.name,
      mechanismId: m.id,
      summary: out.summary,
      quote: quote,
      quotesAnAnswer: quote.length > 0,
      at: state.answers
    };
  }

  /* Progress: what has actually been played, and what has not. An unplayed
   * demonstration is never counted as complete — that is a property of this
   * function, not a promise in the UI. */
  function progressSummary(played) {
    var p = played || {};
    var out = { mechanisms: MECHANISMS.length, played: 0, complete: 0, unplayed: [] };
    MECHANISMS.forEach(function (m) {
      var entry = p[m.id];
      if (!entry) { out.unplayed.push(m.id); return; }
      out.played++;
      if (entry.complete) out.complete++;
    });
    return out;
  }

  /* ================================================================ notes
   * A note belongs to a chapter (a mechanism). A note with no chapter is filed
   * under "unsorted" and says so; it is never attached to whatever happened to be
   * open.
   */
  function addNote(notes, note) {
    var text = String((note && note.text) || "").trim();
    if (!text) return { ok: false, reason: "an empty note was not saved" };
    var chapter = String((note && note.chapter) || "").trim();
    var known = chapter && mechanismById(chapter);
    var filed = {
      id: "n" + ((notes || []).length + 1) + "-" + Date.now(),
      chapter: known ? chapter : UNSORTED,
      asked: chapter || "",
      text: text,
      at: String((note && note.at) || "")
    };
    return {
      ok: true,
      note: filed,
      note_about_unsorted: !known,
      says: known ? "Filed under " + mechanismById(chapter).name + "." :
        "No chapter was attached, so this was filed under \u201c" + UNSORTED + "\u201d — not under whichever chapter happened to be open."
    };
  }

  /* ============================================================ rumor map */

  function parseDate(s) {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || "").trim());
    if (!m) return null;
    var d = Number(m[1]);
    var mo = Number(m[2]);
    var y = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCDate() !== d || dt.getUTCMonth() !== mo - 1) return null;
    return dt.getTime();
  }

  function splitSentences(text) {
    var raw = String(text || "").replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim();
    if (!raw) return [];
    var out = [];
    var buf = "";
    for (var i = 0; i < raw.length; i++) {
      var ch = raw.charAt(i);
      buf += ch;
      if (ch === "." || ch === "!" || ch === "?") {
        var prev = raw.charAt(i - 1);
        var next = raw.slice(i + 1).replace(/^\s+/, "").charAt(0);
        if (/[0-9]/.test(prev) && /[0-9]/.test(next)) continue;
        if (!next || /[A-Z0-9"'\u2018\u201c]/.test(next)) { out.push(buf.trim()); buf = ""; }
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function tokens(text) {
    return String(text || "").toLowerCase().replace(/[^\p{L}\p{N}\u20b9]+/gu, " ").split(" ").filter(Boolean);
  }

  function overlap(a, b) {
    var ta = tokens(a);
    var tb = tokens(b);
    if (!ta.length || !tb.length) return 0;
    var sa = {}, sb = {};
    ta.forEach(function (t) { sa[t] = 1; });
    tb.forEach(function (t) { sb[t] = 1; });
    var inter = 0, uni = 0;
    Object.keys(sa).forEach(function (k) { uni++; if (sb[k]) inter++; });
    Object.keys(sb).forEach(function (k) { if (!sa[k]) uni++; });
    return uni ? inter / uni : 0;
  }

  var HEDGES = ["reportedly", "it is said", "allegedly", "sources say", "unconfirmed", "some say", "it is believed", "apparently"];

  /* A version needs text, a source and a date. No provenance, no place on the map. */
  function addVersion(versions, v) {
    var list = versions || [];
    var text = String((v && v.text) || "").trim();
    var source = String((v && v.source) || "").trim();
    var date = String((v && v.date) || "").trim();
    if (!text) return { ok: false, reason: "a version with no text was not added" };
    if (!source) return { ok: false, reason: "refused: this version has no source, and a mutation with no provenance cannot be placed on a map" };
    if (!date) return { ok: false, reason: "refused: this version has no date, and a mutation with no provenance cannot be placed on a map" };
    if (parseDate(date) == null) return { ok: false, reason: "refused: \u201c" + date + "\u201d is not a date in dd/mm/yyyy, so this version cannot be ordered" };

    var identical = null;
    list.forEach(function (existing, i) {
      if (String(existing.text).trim() === text) identical = i;
    });
    var version = {
      id: "v" + (list.length + 1),
      text: text,
      source: source,
      date: date,
      sortKey: parseDate(date),
      sentences: splitSentences(text).length,
      repeat: identical != null,
      repeatOf: identical
    };
    return {
      ok: true,
      version: version,
      says: identical != null
        ? "This version is word-for-word the same as version " + (identical + 1) + ". Both are kept: it is marked as a repeat, not merged."
        : "Added version " + (list.length + 1) + " from " + source + ", dated " + date + "."
    };
  }

  /* The chain: consecutive versions by date, diffed. Never a verdict on truth. */
  function buildChain(versions) {
    var list = (versions || []).slice().sort(function (a, b) {
      if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
      return String(a.id).localeCompare(String(b.id));
    });
    var links = [];
    for (var i = 1; i < list.length; i++) {
      var before = list[i - 1];
      var after = list[i];
      var bS = splitSentences(before.text);
      var aS = splitSentences(after.text);
      var usedB = {};
      var kept = [];
      var added = [];
      aS.forEach(function (s) {
        var best = -1;
        var bestScore = 0;
        bS.forEach(function (t, j) {
          if (usedB[j]) return;
          var score = overlap(s, t);
          if (score > bestScore) { bestScore = score; best = j; }
        });
        if (best >= 0 && bestScore >= 0.5) { usedB[best] = true; kept.push({ from: bS[best], to: s, score: Math.round(bestScore * 100) / 100 }); }
        else added.push(s);
      });
      var removed = bS.filter(function (_, j) { return !usedB[j]; });
      var hedgesBefore = countHedges(before.text);
      var hedgesAfter = countHedges(after.text);
      var numbersBefore = countNumbers(before.text);
      var numbersAfter = countNumbers(after.text);
      links.push({
        from: { id: before.id, source: before.source, date: before.date },
        to: { id: after.id, source: after.source, date: after.date },
        added: added,
        removed: removed,
        reworded: kept.filter(function (k) { return k.score < 1; }),
        same: kept.filter(function (k) { return k.score >= 1; }),
        hedgesAdded: Math.max(0, hedgesAfter - hedgesBefore),
        hedgesRemoved: Math.max(0, hedgesBefore - hedgesAfter),
        numbersDropped: Math.max(0, numbersBefore - numbersAfter),
        numbersAdded: Math.max(0, numbersAfter - numbersBefore),
        lengthBefore: tokens(before.text).length,
        lengthAfter: tokens(after.text).length,
        repeat: after.repeat === true
      });
    }
    return { versions: list, links: links, count: list.length };
  }

  function countHedges(text) {
    var low = String(text).toLowerCase();
    var n = 0;
    HEDGES.forEach(function (h) { if (low.indexOf(h) >= 0) n++; });
    return n;
  }

  function countNumbers(text) {
    var m = String(text).match(/\d[\d,]*(?:\.\d+)?/g);
    return m ? m.length : 0;
  }

  /* What the map says. It describes movement only: no verdict, no ranking, no
   * "which one is accurate". */
  function chainSummary(chain) {
    if (!chain || !chain.versions || chain.versions.length < 2) {
      return "Add at least two versions to see a chain. One version is a statement, not a mutation.";
    }
    var l = chain.links;
    var totalAdded = l.reduce(function (s, x) { return s + x.added.length; }, 0);
    var totalRemoved = l.reduce(function (s, x) { return s + x.removed.length; }, 0);
    var hedges = l.reduce(function (s, x) { return s + x.hedgesAdded; }, 0);
    var numbers = l.reduce(function (s, x) { return s + x.numbersDropped; }, 0);
    var parts = [];
    parts.push(chain.versions.length + " versions from " + chain.versions[0].date + " to " + chain.versions[chain.versions.length - 1].date + ".");
    parts.push(totalAdded + " sentence(s) appeared and " + totalRemoved + " disappeared along the chain.");
    if (hedges) parts.push(hedges + " hedging phrase(s) were added (\u201creportedly\u201d, \u201cit is said\u201d and their relatives).");
    if (numbers) parts.push(numbers + " number(s) present earlier are gone by the end.");
    parts.push("This map shows what changed and when. It does not say which version is accurate — that needs the primary source, not a diff.");
    return parts.join(" ");
  }

  /* ============================================================== storage */

  function serializeProgress(data) {
    return JSON.stringify({
      version: VERSION,
      savedOn: (data && data.savedOn) || "",
      played: (data && data.played) || {},
      notes: (data && data.notes) || []
    }, null, 2);
  }

  function parseProgress(text) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) return { ok: false, reason: "there is no saved progress", raw: raw };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) {
      return { ok: false, reason: "the saved progress is not readable JSON. It was not used, and your place was not silently reset — export it to keep it, or start from the beginning deliberately.", raw: raw };
    }
    if (!data || typeof data !== "object" || typeof data.played !== "object") {
      return { ok: false, reason: "the saved progress has no demonstrations in it, so it was not used. Nothing was reset silently.", raw: raw };
    }
    return { ok: true, data: { version: data.version || VERSION, savedOn: data.savedOn || "", played: data.played || {}, notes: Array.isArray(data.notes) ? data.notes : [] }, raw: raw };
  }

  function serializeMap(versions) {
    return JSON.stringify({ version: VERSION, versions: (versions || []).map(function (v) {
      return { id: v.id, text: v.text, source: v.source, date: v.date, sortKey: v.sortKey, sentences: v.sentences, repeat: v.repeat, repeatOf: v.repeatOf };
    }) }, null, 2);
  }

  /* A corrupt map is reported, never rebuilt from a partial read: a wrong chain is
   * worse than no chain. */
  function parseMap(text) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) return { ok: false, reason: "there is no saved map", raw: raw };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) {
      return { ok: false, reason: "the saved map is not readable JSON. It was not rebuilt from a partial read — a wrong chain is worse than no chain. Export it to keep it, or clear it and start again.", raw: raw };
    }
    if (!data || !Array.isArray(data.versions)) {
      return { ok: false, reason: "the saved map has no versions in it, so it was not used. A chain was not invented to fill the gap.", raw: raw };
    }
    var clean = [];
    data.versions.forEach(function (v) {
      if (!v || !v.text || !v.source || !v.date) return;
      var key = parseDate(v.date);
      if (key == null) return;
      clean.push({ id: v.id, text: v.text, source: v.source, date: v.date, sortKey: key, sentences: v.sentences || 0, repeat: v.repeat === true, repeatOf: v.repeatOf });
    });
    if (!clean.length) return { ok: false, reason: "the saved map had no usable version in it (every entry was missing text, source or date), so it was not used.", raw: raw };
    return { ok: true, versions: clean, raw: raw };
  }

  /* =============================================================== export */

  function stamp(when) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(when || ""));
    return m ? m[3] + "-" + m[2] + "-" + m[1] : "undated";
  }

  function progressMarkdown(data) {
    var p = data || {};
    var played = p.played || {};
    var lines = ["# Belief — what you played", ""];
    if (p.savedOn) lines.push("Saved " + p.savedOn + ".");
    lines.push("");
    lines.push("| Mechanism | Played | Your answer |");
    lines.push("|---|---|---|");
    MECHANISMS.forEach(function (m) {
      var e = played[m.id];
      var answer = e && e.result ? String(e.result.quote || "").replace(/\|/g, "\\|") : "—";
      lines.push("| " + m.name + " | " + (e ? (e.complete ? "complete" : "started") : "unplayed") + " | " + answer + " |");
    });
    var notes = p.notes || [];
    if (notes.length) {
      lines.push("");
      lines.push("## Notes");
      notes.forEach(function (n) {
        var name = n.chapter === UNSORTED ? "unsorted" : (mechanismById(n.chapter) ? mechanismById(n.chapter).name : "unsorted");
        lines.push("");
        lines.push("- **" + name + "** (" + (n.at || "") + "): " + n.text);
      });
    }
    lines.push("");
    lines.push("Unplayed demonstrations are listed as unplayed. Nothing in this file was counted as complete unless it was played.");
    return lines.join("\n");
  }

  function mapMarkdown(chain, when) {
    var lines = ["# Rumor map", ""];
    lines.push("Built " + (when || "") + " from " + chain.count + " version(s).");
    lines.push("");
    lines.push(chainSummary(chain));
    lines.push("");
    chain.versions.forEach(function (v, i) {
      lines.push("## " + (i + 1) + ". " + v.date + " — " + v.source + (v.repeat ? " (repeat of version " + (v.repeatOf + 1) + ")" : ""));
      lines.push("");
      lines.push(v.text);
      lines.push("");
    });
    if (chain.links.length) {
      lines.push("## What changed, link by link");
      chain.links.forEach(function (l) {
        lines.push("");
        lines.push("### " + l.from.date + " → " + l.to.date);
        lines.push("");
        l.added.forEach(function (s) { lines.push("- appeared: " + s); });
        l.removed.forEach(function (s) { lines.push("- disappeared: " + s); });
        if (l.hedgesAdded) lines.push("- " + l.hedgesAdded + " hedging phrase(s) added");
        if (l.numbersDropped) lines.push("- " + l.numbersDropped + " number(s) dropped");
        if (!l.added.length && !l.removed.length && !l.hedgesAdded && !l.numbersDropped) lines.push("- no sentence changed (a repeat or a reordering)");
      });
    }
    lines.push("");
    lines.push("No version is marked accurate or otherwise: a diff shows movement, not truth.");
    return lines.join("\n");
  }

  function exportFile(what, payload, meta, writer) {
    meta = meta || {};
    if (typeof writer !== "function") return { ok: false, reason: "the file was not written: no writer is available in this browser" };
    var name, body;
    if (what === "progress") { name = "belief-progress-" + stamp(meta.when) + ".md"; body = progressMarkdown(payload); }
    else if (what === "map") { name = "rumor-map-" + stamp(meta.when) + ".md"; body = mapMarkdown(payload, meta.when); }
    else if (what === "raw") { name = "belief-unreadable-state-" + stamp(meta.when) + ".txt"; body = String(payload.raw || ""); }
    else return { ok: false, reason: "nothing was written: unknown export \u201c" + what + "\u201d" };
    try {
      var wrote = writer(name, body, what === "raw" ? "text/plain;charset=utf-8" : "text/markdown;charset=utf-8");
      if (wrote === false) return { ok: false, filename: name, reason: "the file was not written: the browser refused the save" };
      return { ok: true, filename: name, bytes: body.length };
    } catch (e) {
      var why = e && e.name === "QuotaExceededError" ? "storage is full" : (e && e.message ? e.message : "storage is unavailable");
      return { ok: false, filename: name, reason: "the file was not written: " + why };
    }
  }

  return {
    version: VERSION,
    UNSORTED: UNSORTED,
    MECHANISMS: MECHANISMS,
    mechanismById: mechanismById,
    startDemo: startDemo,
    answerDemo: answerDemo,
    demoResult: demoResult,
    answeredCount: answeredCount,
    progressSummary: progressSummary,
    addNote: addNote,
    addVersion: addVersion,
    buildChain: buildChain,
    chainSummary: chainSummary,
    splitSentences: splitSentences,
    overlap: overlap,
    parseDate: parseDate,
    serializeProgress: serializeProgress,
    parseProgress: parseProgress,
    serializeMap: serializeMap,
    parseMap: parseMap,
    progressMarkdown: progressMarkdown,
    mapMarkdown: mapMarkdown,
    exportFile: exportFile
  };
});
