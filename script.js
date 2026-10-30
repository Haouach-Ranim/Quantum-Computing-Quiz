const LEVELS = [
    {
        name: "Easy",
        description: "The basics of quantum computing",
        questions: [
            { q: "What is the basic unit of information in a quantum computer?", options: ["Bit", "Byte", "Qubit", "Pixel"], answer: 2 },
            { q: "A classical bit can be in which state?", options: ["0 or 1 only", "Any number", "Only 1", "Neither 0 nor 1"], answer: 0 },
            { q: "What does superposition mean for a qubit?", options: ["It is switched off", "It is a combination of 0 and 1 at the same time", "It is copied twice", "It moves faster than light"], answer: 1 },
            { q: "Quantum computers are expected to be especially good at:", options: ["Browsing the web", "Playing videos", "Solving certain very complex problems faster", "Storing photos"], answer: 2 },
            { q: "Which branch of physics do quantum computers rely on?", options: ["Thermodynamics", "Quantum mechanics", "Optics only", "Fluid mechanics"], answer: 1 },
            { q: "Which company created the Qiskit toolkit?", options: ["IBM", "Apple", "Netflix", "Tesla"], answer: 0 },
            { q: "What do you get when you measure a qubit?", options: ["A decimal number", "A color", "0 or 1", "Nothing"], answer: 2 },
            { q: "Will quantum computers replace everyday laptops soon?", options: ["Yes, next year", "No, they are specialised machines", "Yes, they are cheaper", "They already have"], answer: 1 },
            { q: "What is entanglement?", options: ["Two qubits linked so that their states are correlated", "A broken qubit", "A type of cable", "A programming language"], answer: 0 },
            { q: "Why are many quantum computers kept extremely cold?", options: ["To save electricity", "To reduce noise and keep fragile quantum states stable", "To look impressive", "To prevent rust"], answer: 1 }
        ]
    },
    {
        name: "Medium",
        description: "Gates, algorithms and key ideas",
        questions: [
            { q: "Which gate puts a qubit into an equal superposition?", options: ["AND gate", "Hadamard gate", "NOT gate", "OR gate"], answer: 1 },
            { q: "Which gate flips a qubit from 0 to 1 (and 1 to 0)?", options: ["Pauli-X gate", "Hadamard gate", "Phase gate", "Measure gate"], answer: 0 },
            { q: "What is Shor's algorithm used for?", options: ["Sorting lists", "Searching a database", "Factoring large integers", "Compressing files"], answer: 2 },
            { q: "What is Grover's algorithm used for?", options: ["Searching an unsorted database faster", "Encrypting messages", "Drawing graphics", "Cooling qubits"], answer: 0 },
            { q: "What is decoherence?", options: ["Merging two qubits", "A kind of quantum gate", "A cooling method", "The loss of a qubit's quantum state due to its environment"], answer: 3 },
            { q: "What is a Bell state?", options: ["A sound produced by qubits", "A maximally entangled two-qubit state", "A qubit at rest", "A type of error"], answer: 1 },
            { q: "How many basis states can 2 qubits be in superposition of?", options: ["2", "3", "4", "8"], answer: 2 },
            { q: "The CNOT gate acts on how many qubits?", options: ["One", "Two", "Three", "Ten"], answer: 1 },
            { q: "In which year did Google claim quantum supremacy?", options: ["2009", "2012", "2016", "2019"], answer: 3 },
            { q: "Which is a common qubit technology?", options: ["Superconducting circuits", "Vacuum tubes", "Magnetic tape", "Punch cards"], answer: 0 }
        ]
    },
    {
        name: "Hard",
        description: "Theory and advanced concepts",
        questions: [
            { q: "What does the Bloch sphere represent?", options: ["The cooling chamber", "The state of a single qubit", "A network of computers", "The speed of an algorithm"], answer: 1 },
            { q: "What does the no-cloning theorem state?", options: ["Qubits cannot be measured", "Classical bits cannot be copied", "An unknown quantum state cannot be copied perfectly", "Two qubits cannot be entangled"], answer: 2 },
            { q: "Which subroutine is central to Shor's algorithm?", options: ["Quantum Fourier Transform", "Binary search", "Bubble sort", "Hash function"], answer: 0 },
            { q: "How many queries does Grover's algorithm need to search N items?", options: ["About N", "About N squared", "About log N", "About the square root of N"], answer: 3 },
            { q: "Which complexity class captures problems efficiently solvable by a quantum computer?", options: ["P only", "BQP", "NP-hard only", "EXP"], answer: 1 },
            { q: "Which of these is a leading quantum error-correcting code?", options: ["Morse code", "Huffman code", "Surface code", "ASCII"], answer: 2 },
            { q: "The BB84 protocol is used for:", options: ["Quantum key distribution", "Quantum teleporting people", "Factoring numbers", "Qubit cooling"], answer: 0 },
            { q: "The state |+> is equal to:", options: ["|0> - |1>", "(|0> + |1>) / sqrt(2)", "|1>", "|0> |1>"], answer: 1 },
            { q: "What is a Toffoli gate?", options: ["A single-qubit rotation", "A measurement gate", "A two-qubit swap", "A three-qubit controlled-controlled-NOT gate"], answer: 3 },
            { q: "What does Bell's theorem show?", options: ["Qubits are always 0", "No local hidden-variable theory can reproduce all quantum predictions", "Quantum computers are impossible", "Light is slower than sound"], answer: 1 }
        ]
    }
];
const TIME_LIMITS = [20, 25, 30]; 

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
    done: false,
    best: null,                       
    bestPoints: null                
}));
state[0].unlocked = true;
let current = 0;

const $ = (id) => document.getElementById(id);
const home = $("home"), quiz = $("quiz"), grid = $("grid");

const getScore = (i) => state[i].answers.filter((a, k) => a === LEVELS[i].questions[k].answer).length;

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
    if (s.answers[i] === LEVELS[l].questions[i].answer) {
        r.points = worth - r.changeLoss;
    }
    return r;
}

function getTotals(l, onlyCorrect) {
    let points = 0, timeLoss = 0, changeLoss = 0, timeouts = 0;
    LEVELS[l].questions.forEach((q, i) => {
        const r = questionResult(l, i);
        const ok = state[l].answers[i] === q.answer;
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
    const t = getTotals(current, false);
    const lost = t.timeLoss + t.changeLoss + t.timeouts;
    $("progress").textContent = s.done
        ? "Finished"
        : "Answered " + answered + " / 10" +
          (missed ? " · Time's up: " + missed : "") +
          (lost ? " · Penalties: −" + lost : "");
    $("finish").hidden = s.done || answered + missed < 10;
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
        const pts = s.bestPoints !== null ? " · Best: " + s.bestPoints + " pts" : "";
        const status = !s.unlocked
            ? "Level locked"
            : s.best === 10
                ? "Completed (10/10) ✓" + pts
                : s.best !== null
                    ? "Last score: " + s.best + "/10 (Needs 10/10)" + pts
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
        card.classList.add("answered");
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
    else if (chosen !== null) mark = "Answered ✓";

    card.innerHTML =
        '<div class="inner">' +
        '<div class="face front"><span class="big">' + (i + 1) + "</span><span>" + mark +
        '</span><span class="timer" data-timer="' + i + '"></span></div>' +
        '<div class="face back"><span class="timer" data-timer="' + i + '"></span>' +
        '<p class="q"></p><div class="opts"></div></div>' +
        "</div>";
    card.querySelector(".q").textContent = question.q;
    card.querySelectorAll(".timer").forEach((el) => paintEl(el, i));

    const opts = card.querySelector(".opts");
    question.options.forEach((text, oi) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "option";
        b.textContent = text;

        if (oi === chosen) b.classList.add("chosen");

        if (s.done) {
            b.disabled = true;
            if (oi === question.answer) b.classList.add("ok");
            else if (oi === chosen) b.classList.add("bad");
        } else if (expired || s.locked[i]) {
            b.disabled = true;
        } else {
            b.addEventListener("click", (e) => {
                e.stopPropagation();
                answer(i, oi);
            });
        }
        opts.appendChild(b);
    });

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
    if (s.expired[i] || s.locked[i]) return;
    if (s.answers[i] !== null && s.answers[i] !== oi) s.changes[i]++;   
    s.answers[i] = oi;
    renderQuiz();
}

$("finish").addEventListener("click", () => {
    const s = state[current];
    s.done = true;
    const score = getScore(current);
    s.best = score;
    s.bestPoints = Math.max(s.bestPoints ?? 0, getTotals(current, true).total);
    s.locked = s.answers.map((a, k) => a === LEVELS[current].questions[k].answer);

    if (score === 10 && current + 1 < LEVELS.length) {
        state[current + 1].unlocked = true;
    }

    renderQuiz();
    window.scrollTo({ top: 0, behavior: "smooth" });
});

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
    if (state[current].best === 10 && current + 1 < LEVELS.length) {
        current += 1;
        renderQuiz();
        window.scrollTo({ top: 0 });
    }
});

$("back").addEventListener("click", renderHome);

renderHome();