const TIME_LIMITS = [10, 15, 20];
const VF_OPTIONS = ["True", "False"];   // "vf": answer 0 = True, 1 = False

const SCORING = {
    base: 100,
    maxTimeLoss: 0.5,
    changePenalty: 10,
    timeoutPenalty: 10
};
const MAX_POINTS = SCORING.base * 10;

const state = LEVELS.map(() => ({
    unlocked: false,
    answers: Array(10).fill(null),
    locked: Array(10).fill(false),
    remaining: Array(10).fill(null),   // null = timer not started
    expired: Array(10).fill(false),
    changes: Array(10).fill(0),
    done: false,
    best: null,
    bestPoints: null
}));
state[0].unlocked = true;
let current = 0;

/* ---------- Saved progress ---------- */

const STORAGE_KEY = "quantum-quiz-progress";

function saveProgress() {
    try {
        const data = state.map((s) => ({ unlocked: s.unlocked, best: s.best, bestPoints: s.bestPoints }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* storage unavailable: the quiz still works */ }
}

function loadProgress() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(data)) return;
        data.forEach((d, i) => {
            if (!state[i] || !d || typeof d !== "object") return;
            if (d.unlocked === true) state[i].unlocked = true;
            if (Number.isInteger(d.best) && d.best >= 0 && d.best <= 10) state[i].best = d.best;
            if (Number.isFinite(d.bestPoints) && d.bestPoints >= 0 && d.bestPoints <= MAX_POINTS) {
                state[i].bestPoints = d.bestPoints;
            }
        });
    } catch (e) { /* corrupted data: start fresh */ }
}

const $ = (id) => document.getElementById(id);
const home = $("home"), quiz = $("quiz"), grid = $("grid");

/* ---------- Helpers ---------- */

const isSolved = (l, i) => state[l].answers[i] === LEVELS[l].questions[i].answer;
const getScore = (l) => state[l].answers.filter((a, k) => isSolved(l, k)).length;

function getFeedback(score) {
    if (score === 10) return "Quantum Master — flawless! Level completed!";
    if (score >= 7) return "Quantum Ace — almost there! Get 10/10 to unlock the next level.";
    if (score >= 4) return "Scholar in Progress — keep refining your answers.";
    return "Quantum Novice — review the basics and try again.";
}

/* ---------- Scoring ---------- */

function elapsedOf(l, i) {
    const r = state[l].remaining[i];
    return r === null ? 0 : TIME_LIMITS[l] - r;
}

function worthAt(l, elapsed) {
    const ratio = Math.min(Math.max(elapsed, 0), TIME_LIMITS[l]) / TIME_LIMITS[l];
    return Math.round(SCORING.base * (1 - SCORING.maxTimeLoss * ratio));
}

function questionResult(l, i) {
    const s = state[l];
    const r = { points: 0, timeLoss: 0, changeLoss: 0, timeout: 0 };
    if (s.expired[i]) {
        r.timeout = SCORING.timeoutPenalty;
        return r;
    }
    if (s.answers[i] === null) return r;

    const worth = worthAt(l, elapsedOf(l, i));
    r.timeLoss = SCORING.base - worth;
    r.changeLoss = Math.min(worth, s.changes[i] * SCORING.changePenalty);
    if (isSolved(l, i)) r.points = worth - r.changeLoss;
    return r;
}

function getTotals(l, onlyCorrect) {
    let points = 0, timeLoss = 0, changeLoss = 0, timeouts = 0;
    LEVELS[l].questions.forEach((q, i) => {
        const r = questionResult(l, i);
        points += r.points;
        timeouts += r.timeout;
        if (!onlyCorrect || isSolved(l, i)) {
            timeLoss += r.timeLoss;
            changeLoss += r.changeLoss;
        }
    });
    return { points, timeLoss, changeLoss, timeouts, total: Math.max(0, points - timeouts) };
}

function ensureBreakdown() {
    let el = $("breakdown");
    if (!el) {
        el = document.createElement("dl");
        el.id = "breakdown";
        $("score").insertAdjacentElement("afterend", el);
    }
    return el;
}

function renderBreakdown(l) {
    const t = getTotals(l, true);
    const lines = [
        ["Correct answers", getScore(l) + " / 10"],
        ["Points before penalties", String(getScore(l) * SCORING.base)],
        ["Time penalty", "−" + t.timeLoss],
        ["Answer changes", "−" + t.changeLoss],
        ["Time-out penalty", "−" + t.timeouts],
        ["Total", t.total + " pts"]
    ];
    const box = ensureBreakdown();
    box.replaceChildren();
    lines.forEach(([label, value]) => {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = value;
        box.append(dt, dd);
    });
}

/* ---------- Timer & status ---------- */

function timerLabel(i) {
    const s = state[current];
    if (s.done || s.expired[i] || isSolved(current, i)) return "";
    const t = s.remaining[i] === null ? TIME_LIMITS[current] : s.remaining[i];
    const worth = worthAt(current, TIME_LIMITS[current] - t);
    return "⏱ " + t + "s · " + worth + " pts";
}

function paintEl(el, i) {
    const s = state[current];
    el.textContent = timerLabel(i);
    el.classList.toggle("urgent", s.remaining[i] !== null && s.remaining[i] <= 5);
}

function paintTimer(i) {
    grid.querySelectorAll('[data-timer="' + i + '"]').forEach((el) => paintEl(el, i));
}

function updateStatus() {
    const s = state[current];
    const solved = getScore(current);
    const missed = s.expired.filter(Boolean).length;
    const resolved = solved + missed;
    const t = getTotals(current, false);
    const lost = t.timeLoss + t.changeLoss + t.timeouts;

    const fill = $("progress-fill");
    if (fill) fill.style.width = (resolved / 10) * 100 + "%";

    $("progress").textContent = s.done
        ? "Finished"
        : "Solved " + solved + " / 10" +
          (missed ? " · Time's up: " + missed : "") +
          (lost ? " · Penalties: −" + lost : "");

    $("finish").hidden = s.done || resolved < 10;
}

// One interval for the whole app. A question's clock runs from its first flip
// until it is answered CORRECTLY (a wrong answer does not stop it).
setInterval(() => {
    if (quiz.hidden || document.hidden) return;
    const s = state[current];
    if (s.done) return;

    let changed = false;
    s.remaining.forEach((t, i) => {
        if (t === null || s.expired[i] || isSolved(current, i)) return;
        s.remaining[i] = t - 1;
        if (s.remaining[i] <= 0) {
            s.remaining[i] = 0;
            s.expired[i] = true;
            grid.children[i].replaceWith(makeCard(LEVELS[current].questions[i], i));
            changed = true;
        } else {
            paintTimer(i);
        }
    });
    if (changed) updateStatus();
}, 1000);

/* ---------- Interface ---------- */

function renderHome() {
    const box = $("levels");
    box.innerHTML = "";
    LEVELS.forEach((level, i) => {
        const s = state[i];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "level";
        b.disabled = !s.unlocked;
        const pts = s.bestPoints !== null ? " · " + s.bestPoints + " pts" : "";
        const status = !s.unlocked
            ? "Level locked"
            : s.best === 10
                ? "Completed (10/10) ✓" + pts
                : s.best !== null
                    ? "Best score: " + s.best + "/10 (Needs 10/10)" + pts
                    : "Ready to play";
        b.innerHTML = "<strong>" + level.name + "</strong>" + level.description +
            "<br>" + TIME_LIMITS[i] + "s per question<br>" + status;
        b.addEventListener("click", () => openLevel(i));
        box.appendChild(b);
    });
    home.hidden = false;
    quiz.hidden = true;
}

function openLevel(i) {
    current = i;
    home.hidden = true;
    quiz.hidden = false;
    renderQuiz();
}

function renderQuiz() {
    const level = LEVELS[current];
    const s = state[current];

    $("level-title").textContent = "Level: " + level.name;

    $("result").hidden = !s.done;
    if (s.done) {
        const score = getScore(current);
        const totals = getTotals(current, true);
        $("score").textContent = totals.total + " / " + MAX_POINTS + " pts";
        renderBreakdown(current);
        $("feedback").textContent = getFeedback(score);
        $("retry").hidden = score === 10;
        $("next").hidden = score !== 10 || current === LEVELS.length - 1;
    }

    updateStatus();

    grid.innerHTML = "";
    level.questions.forEach((question, i) => grid.appendChild(makeCard(question, i)));
}

function makeCard(question, i) {
    const s = state[current];
    const chosen = s.answers[i];
    const isCorrect = chosen === question.answer;
    const expired = s.expired[i];
    const isVF = question.type === "vf";

    const card = document.createElement("div");
    card.className = "card";
    card.tabIndex = 0;

    if (s.done) {
        card.classList.add("done", isCorrect ? "ok" : "bad");
    } else if (s.locked[i]) {
        card.classList.add("ok", "locked");
    } else if (expired) {
        card.classList.add("expired");
    } else if (chosen !== null) {
        card.classList.add("answered", isCorrect ? "ok" : "bad");
    }

    let mark = "Tap to flip";
    if (s.done) {
        const r = questionResult(current, i);
        mark = expired
            ? "Time's up ✗ −" + r.timeout
            : isCorrect
                ? "Correct ✓ +" + r.points + " pts"
                : "Wrong ✗";
    }
    else if (s.locked[i]) mark = "Correct ✓";
    else if (expired) mark = "Time's up ✗";
    else if (chosen !== null) mark = isCorrect ? "Correct ✓" : "Not right ✗";

    card.innerHTML =
        '<div class="inner">' +
        '<div class="face front"><span class="big">' + (i + 1) + "</span><span>" + mark +
        '</span><span class="timer" data-timer="' + i + '"></span></div>' +
        '<div class="face back"><span class="timer" data-timer="' + i + '"></span>' +
        '<p class="q"></p><div class="opts"></div></div>' +
        "</div>";
    card.querySelector(".q").textContent = question.q;
    card.querySelectorAll(".timer").forEach((el) => paintEl(el, i));

    const kind = document.createElement("span");
    kind.className = "qtype";
    kind.textContent = isVF ? "True / False" : "Multiple choice";
    card.querySelector(".q").before(kind);

    const opts = card.querySelector(".opts");
    if (isVF) opts.classList.add("vf");

    (isVF ? VF_OPTIONS : question.options).forEach((text, oi) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "option";
        b.textContent = text;

        if (oi === chosen) b.classList.add(isCorrect ? "ok" : "bad");

        // Once finished, only the player's own answers are coloured:
        // the correct option of a timed-out question is not revealed.
        if (s.done || expired || s.locked[i] || isCorrect) {
            b.disabled = true;
        } else {
            b.addEventListener("click", (e) => {
                e.stopPropagation();
                answer(i, oi);
            });
        }
        opts.appendChild(b);
    });

    if (chosen !== null && !s.done) {
        const fb = document.createElement("p");
        fb.className = "feedback " + (isCorrect ? "ok" : "bad");
        fb.textContent = isCorrect
            ? "✓ Correct!"
            : "✗ Not right. Try another answer (−" + SCORING.changePenalty + " pts per change).";
        card.querySelector(".back").appendChild(fb);
    }

    // The clock starts the first time the card is flipped
    const flip = () => {
        if (s.done || s.expired[i]) return;
        if (s.remaining[i] === null && s.answers[i] === null) {
            s.remaining[i] = TIME_LIMITS[current];
        }
        card.classList.toggle("flipped");
    };
    card.addEventListener("click", flip);
    card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target === card) flip();
    });
    return card;
}

function answer(i, oi) {
    const s = state[current];
    const question = LEVELS[current].questions[i];
    if (s.expired[i] || s.locked[i] || isSolved(current, i)) return;

    if (s.answers[i] !== null && s.answers[i] !== oi) s.changes[i]++;
    s.answers[i] = oi;

    // Rebuild only this card and keep it flipped so the feedback shows at once
    const card = makeCard(question, i);
    card.classList.add("flipped");
    grid.children[i].replaceWith(card);
    card.focus();
    updateStatus();

    const sr = $("sr-feedback");
    if (sr) {
        sr.textContent = "Question " + (i + 1) + ": " +
            (oi === question.answer ? "correct." : "not right, try another answer.");
    }
}

/* ---------- Buttons ---------- */

$("finish").addEventListener("click", () => {
    const s = state[current];
    s.done = true;
    const score = getScore(current);
    s.best = Math.max(s.best ?? 0, score);
    s.bestPoints = Math.max(s.bestPoints ?? 0, getTotals(current, true).total);
    s.locked = s.answers.map((a, k) => isSolved(current, k));

    if (score === 10 && current + 1 < LEVELS.length) {
        state[current + 1].unlocked = true;
    }
    saveProgress();

    renderQuiz();
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// Retry: solved questions keep their frozen timer (same points); the rest restart
$("retry").addEventListener("click", () => {
    const s = state[current];
    s.answers = s.answers.map((a, k) => (s.locked[k] ? a : null));
    s.remaining = s.remaining.map((t, k) => (s.locked[k] ? t : null));
    s.expired = s.expired.map((e, k) => (s.locked[k] ? e : false));
    s.changes = s.changes.map((c, k) => (s.locked[k] ? c : 0));
    s.done = false;
    renderQuiz();
});

$("next").addEventListener("click", () => {
    if (getScore(current) === 10 && current + 1 < LEVELS.length) {
        current += 1;
        renderQuiz();
        window.scrollTo({ top: 0 });
    }
});

$("back").addEventListener("click", renderHome);

loadProgress();
renderHome();