// Level names and descriptions stay here.
// The questions are loaded from the database by php/get_questions.php (see init() at the end).
const LEVELS = [
    { name: "Easy", description: "The basics of quantum computing", questions: [] },
    { name: "Medium", description: "Gates, algorithms and key ideas", questions: [] },
    { name: "Hard", description: "Theory and advanced concepts", questions: [] }
];

// Folder of the PHP scripts, relative to html/index.html
const API = "../php/";

const TIME_LIMITS = [10, 15, 20]; 

// Question types: "qcm" (default, uses its own options) or "vf" (True/False).
// For "vf", answer is 0 for True and 1 for False.
const VF_OPTIONS = ["True", "False"];

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
    remaining: Array(10).fill(null),   
    expired: Array(10).fill(false),   
    changes: Array(10).fill(0),       
    correct: Array(10).fill(null),     // true / false, decided by the server
    pending: Array(10).fill(false),    // answer being checked by the server
    scoreSaved: false,
    scoreMsg: "",
    saveFailed: false,
    done: false,
    best: null,                       
    bestPoints: null                
}));
state[0].unlocked = true;
let current = 0;
//progress saving
const STORAGE_KEY = "quantum-quiz-progress";
const PLAYER_KEY = "quantum-quiz-player";
const NAME_PATTERN = /^[\p{L}\p{N} _-]{2,20}$/u;   // same rule as php/save_score.php
let player = null;                                    // current player name
// Each player has his own progress (unlocked levels, best scores) in this browser.
const progressKey = () => STORAGE_KEY + ":" + String(player).toLowerCase();

function saveProgress() {
    try {
        const data = state.map((s) => ({ unlocked: s.unlocked, best: s.best, bestPoints: s.bestPoints }));
        localStorage.setItem(progressKey(), JSON.stringify(data));
    } catch (e) {
        // Storage unavailable (private mode, quota...): the quiz still works without saving.
    }
}

function loadProgress() {
    try {
        const data = JSON.parse(localStorage.getItem(progressKey()));
        if (!Array.isArray(data)) return;
        data.forEach((d, i) => {
            if (!state[i] || !d || typeof d !== "object") return;
            if (d.unlocked === true) state[i].unlocked = true;
            if (Number.isInteger(d.best) && d.best >= 0 && d.best <= 10) state[i].best = d.best;
            if (Number.isFinite(d.bestPoints) && d.bestPoints >= 0 && d.bestPoints <= MAX_POINTS) {
                state[i].bestPoints = d.bestPoints;
            }
        });
    } catch (e) {
        // Corrupted data: ignore it and start fresh.
    }
}


const $ = (id) => document.getElementById(id);
const home = $("home"), quiz = $("quiz"), grid = $("grid");

// ---- Communication JavaScript -> PHP (fetch) ----
async function callPHP(script, options) {
    const res = await fetch(API + script, options);
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (!res.ok || !data) {
        throw new Error((data && data.error) || "Server error (" + res.status + ")");
    }
    return data;
}
const getJSON = (script) => callPHP(script);
const postJSON = (script, body) => callPHP(script, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
});

function showError(message) {
    const box = $("app-error");
    box.textContent = message;
    box.hidden = !message;
}

// The 10 answers of the current level, in the format expected by the PHP scripts
const answersPayload = (l) => LEVELS[l].questions.map((q, i) => ({ id: q.id, choice: state[l].answers[i] }));

const getScore = (i) => state[i].correct.filter((c) => c === true).length;

function getFeedback(score) {
    if (score === 10) return "Quantum Master — flawless! Level completed!";
    if (score >= 7) return "Quantum Ace — almost there! Get 10/10 to unlock the next level.";
    if (score >= 4) return "Scholar in Progress — keep refining your answers.";
    return "Quantum Novice — review the basics and try again.";
}

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
    if (s.correct[i] === true) {
        r.points = worth - r.changeLoss;
    }
    return r;
}

function getTotals(l, onlyCorrect) {
    let points = 0, timeLoss = 0, changeLoss = 0, timeouts = 0;
    LEVELS[l].questions.forEach((q, i) => {
        const r = questionResult(l, i);
        const ok = state[l].correct[i] === true;
        points += r.points;
        timeouts += r.timeout;
        if (!onlyCorrect || ok) {
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

function timerLabel(i) {
    const s = state[current];
    if (s.done || s.expired[i] || s.answers[i] !== null) return "";
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

    const answered = s.answers.filter((a) => a !== null).length;
    const missed = s.expired.filter(Boolean).length;

    const completed = answered + missed;

    const percentage = (completed / 10) * 100;

    $("progress-fill").style.width = percentage + "%";
    $("progress").textContent = completed + " / 10";

    const t = getTotals(current, false);
    const lost = t.timeLoss + t.changeLoss + t.timeouts;

    $("progress").textContent = s.done
        ? "Finished"
        : "Answered " + answered + " / 10" +
          (missed ? " · Time's up: " + missed : "") +
          (lost ? " · Penalties: −" + lost : "");

    $("finish").hidden = s.done || completed < 10;
}

setInterval(() => {
    if (quiz.hidden || document.hidden) return;  
    const s = state[current];
    if (s.done) return;

    let changed = false;
    s.remaining.forEach((t, i) => {
        if (t === null || s.answers[i] !== null || s.expired[i]) return;
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


function renderHome() {
    const box = $("levels");
    box.innerHTML = "";
    LEVELS.forEach((level, i) => {
        const s = state[i];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "level";
        b.disabled = !s.unlocked;
        //const pts = s.bestPoints !== null ? " · Best: " + s.bestPoints + " pts" : "";
        const pts = s.bestPoints !== null ? " · " + s.bestPoints + " pts" : "";
        const status = !s.unlocked
            ? "Level locked"
            : s.best === 10
                ? "Completed (10/10) ✓" + pts
                : s.best !== null
                    // old is "Last score"
                    ? "Best score: " + s.best + "/10 (Needs 10/10)" + pts
                    : "Ready to play";
        b.innerHTML = "<strong>" + level.name + "</strong>" + level.description +
            "<br>" + TIME_LIMITS[i] + "s per question<br>" + status;
        b.addEventListener("click", () => openLevel(i));
        box.appendChild(b);
    });
    $("welcome").hidden = true;
    $("player-label").textContent = player;
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
        renderScoreStatus();
    }

    updateStatus();

    grid.innerHTML = "";
    level.questions.forEach((question, i) => grid.appendChild(makeCard(question, i)));
}

function makeCard(question, i) {
    const s = state[current];
    const chosen = s.answers[i];
    const isCorrect = s.correct[i] === true;
    const expired = s.expired[i];

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
        //card.classList.add("answered");
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
    //else if (chosen !== null) mark = "Answered ✓";
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
    //old version for only multiple choice questions
    /*const opts = card.querySelector(".opts");
    question.options.forEach((text, oi) => {*/
    const opts = card.querySelector(".opts");
    const isVF = question.type === "vf";

    const kind = document.createElement("span");
    kind.className = "qtype";
    kind.textContent = isVF ? "True / False" : "Multiple choice";
    card.querySelector(".q").before(kind);
    if (isVF) opts.classList.add("vf");

    (isVF ? VF_OPTIONS : question.options).forEach((text, oi) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "option";
        b.textContent = text;

        //if (oi === chosen) b.classList.add("chosen");
        if (oi === chosen && !s.done) b.classList.add(isCorrect ? "ok" : "bad");


        if (s.done) {
            b.disabled = true;
            if (oi === chosen) b.classList.add(isCorrect ? "ok" : "bad");
        } 
        //add isCorrect
        else if (expired || s.locked[i] || isCorrect) {
            b.disabled = true;
        } else {
            b.addEventListener("click", (e) => {
                e.stopPropagation();
                answer(i, oi);
            });
        }
        opts.appendChild(b);
    });

    // new block of code
        if (chosen !== null && !s.done) {
        const fb = document.createElement("p");
        fb.className = "feedback " + (isCorrect ? "ok" : "bad");
        fb.textContent = isCorrect
            ? "✓ Correct!"
            : "✗ Not right. Try another answer (−" + SCORING.changePenalty + " pts per change).";
        card.querySelector(".back").appendChild(fb);
    }


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

async function answer(i, oi) {
    const l = current;
    const s = state[l];
    const question = LEVELS[l].questions[i];
    if (s.expired[i] || s.locked[i] || s.correct[i] === true || s.pending[i] || s.answers[i] === oi) return;

    const previous = s.answers[i];
    const counted = previous !== null;          // changing a wrong answer costs points
    if (counted) s.changes[i]++;
    s.answers[i] = oi;
    s.pending[i] = true;

    try {
        // The server checks the answer: the correct one is never in the browser.
        const data = await postJSON("check_answer.php", { question_id: question.id, choice: oi });
        s.correct[i] = data.correct === true;
    } catch (err) {
        s.answers[i] = previous;                // undo: the answer was not checked
        if (counted) s.changes[i]--;
        s.pending[i] = false;
        $("sr-feedback").textContent = "Could not check the answer. Please try again.";
        showError("Could not check your answer: " + err.message);
        return;
    }
    s.pending[i] = false;
    showError("");

    if (current !== l || quiz.hidden) return;   // the player left the level meanwhile

    // Rebuild only this card and keep it flipped so the feedback is visible at once
    const card = makeCard(question, i);
    card.classList.add("flipped");
    grid.children[i].replaceWith(card);
    card.focus();
    updateStatus();

    $("sr-feedback").textContent = "Question " + (i + 1) + ": " +
        (s.correct[i] ? "correct." : "not right, try another answer.");
}

$("finish").addEventListener("click", async () => {
    const l = current;
    const s = state[l];
    const button = $("finish");
    button.disabled = true;

    try {
        // The server checks the 10 answers and sends back the correction.
        const data = await postJSON("submit_answers.php", { level: l, answers: answersPayload(l) });
        s.correct = data.results.map((r) => r === true);
    } catch (err) {
        showError("Could not check your answers: " + err.message);
        button.disabled = false;
        return;
    }
    button.disabled = false;
    showError("");

    s.done = true;
    s.scoreSaved = false;
    const score = getScore(l);
    // Save the best score
    s.best = Math.max(s.best ?? 0, score);
    s.bestPoints = Math.max(s.bestPoints ?? 0, getTotals(l, true).total);
    s.locked = s.correct.slice();

    if (score === 10 && l + 1 < LEVELS.length) {
        state[l + 1].unlocked = true;
    }
    saveProgress();

    renderQuiz();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

    saveScore(l);   // the score is saved automatically with the player's name
});

$("retry").addEventListener("click", () => {
    const s = state[current];
    s.answers = s.answers.map((a, k) => (s.locked[k] ? a : null));
    s.remaining = s.remaining.map((t, k) => (s.locked[k] ? t : null));  
    s.expired = s.expired.map((e, k) => (s.locked[k] ? e : false));
    s.changes = s.changes.map((c, k) => (s.locked[k] ? c : 0));
    s.correct = s.correct.map((c, k) => (s.locked[k] ? c : null));
    s.done = false;
    s.scoreSaved = false;
    renderQuiz();
});

$("next").addEventListener("click", () => {
    if (state[current].best === 10 && current + 1 < LEVELS.length) {
        current += 1;
        renderQuiz();
        window.scrollTo({ top: 0 });
    }
});

$("back").addEventListener("click", renderHome);

// ---- Save the score automatically (JS -> PHP -> database) ----
function renderScoreStatus() {
    const s = state[current];
    $("score-msg").textContent = s.scoreMsg;
    $("retry-save").hidden = !s.saveFailed;
}

async function saveScore(l) {
    const s = state[l];
    s.saveFailed = false;
    s.scoreMsg = "Saving your score…";
    if (current === l) renderScoreStatus();

    try {
        const data = await postJSON("save_score.php", {
            name: player,
            level: l,
            answers: answersPayload(l),
            points: getTotals(l, true).total
        });
        s.scoreSaved = true;
        s.scoreMsg = (data.improved
            ? "New best saved ✓ "
            : "Your best score is still " + data.best + " pts. ") +
            "You are #" + data.rank + " in the " + LEVELS[l].name + " leaderboard.";
        $("lb-level").value = String(l);
        loadLeaderboard(l);
    } catch (err) {
        s.saveFailed = true;
        s.scoreMsg = "Could not save your score: " + err.message;
    }
    if (current === l && s.done) renderScoreStatus();
}

$("retry-save").addEventListener("click", () => {
    if (state[current].done) saveScore(current);
});

// ---- Welcome screen: the player types his name once ----
function showWelcome() {
    home.hidden = true;
    quiz.hidden = true;
    $("welcome").hidden = false;
    $("welcome-name").focus();
}

$("welcome-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("welcome-name").value.trim();
    if (!NAME_PATTERN.test(name)) {
        $("welcome-msg").textContent = "Use 2 to 20 letters, digits, spaces, _ or -.";
        return;
    }
    player = name;
    try { localStorage.setItem(PLAYER_KEY, name); } catch (err) { /* ignore */ }
    $("welcome-msg").textContent = "";
    loadProgress();
    renderHome();
    loadLeaderboard(Number($("lb-level").value));
});

$("change-player").addEventListener("click", () => {
    try { localStorage.removeItem(PLAYER_KEY); } catch (err) { /* ignore */ }
    location.reload();   // fresh state, then the welcome screen asks for the new name
});

// ---- Leaderboard (PHP -> JS) ----
async function loadLeaderboard(level) {
    const body = $("lb-body");
    const msg = $("lb-msg");
    try {
        const data = await getJSON("leaderboard.php?level=" + level);
        body.replaceChildren();
        data.scores.forEach((row) => {
            const tr = document.createElement("tr");
            const isMe = player !== null && row.name.toLowerCase() === player.toLowerCase();
            if (isMe) tr.classList.add("me");
            [row.rank, isMe ? row.name + " (you)" : row.name, row.correct + " / 10", row.points, row.date].forEach((value) => {
                const td = document.createElement("td");
                td.textContent = value;        // textContent: a name can never inject HTML
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
        msg.textContent = data.scores.length ? "" : "No scores yet. Be the first!";
    } catch (err) {
        body.replaceChildren();
        msg.textContent = "Could not load the leaderboard.";
    }
}

function initLeaderboard() {
    const select = $("lb-level");
    LEVELS.forEach((level, i) => {
        const option = document.createElement("option");
        option.value = String(i);
        option.textContent = level.name;
        select.appendChild(option);
    });
    select.addEventListener("change", () => loadLeaderboard(Number(select.value)));
    loadLeaderboard(0);
}

// ---- Start: load the questions from the database, then show the home screen ----
async function init() {
    try {
        const data = await getJSON("get_questions.php");
        data.levels.forEach((questions, l) => {
            if (LEVELS[l]) LEVELS[l].questions = questions;
        });
        if (LEVELS.some((level) => level.questions.length !== 10)) {
            throw new Error("each level needs exactly 10 questions");
        }
    } catch (err) {
        showError("Could not load the questions (" + err.message + "). Start Apache and MySQL, " +
            "import database/quiz.sql, and open this page through http://localhost/.");
        return;
    }
    try { player = localStorage.getItem(PLAYER_KEY) || null; } catch (e) { /* ignore */ }
    if (player) {
        loadProgress();
        renderHome();
    } else {
        showWelcome();
    }
    initLeaderboard();
}

init();
