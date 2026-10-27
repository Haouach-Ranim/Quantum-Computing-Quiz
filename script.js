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
// Tracking State with an Array for each level
const state = LEVELS.map(() => ({
    unlocked: false,
    answers: Array(10).fill(null),   
    locked: Array(10).fill(false),  
    done: false,                 
    best: null                       
}));
state[0].unlocked = true;
let current = 0;

const $ = (id) => document.getElementById(id);
const home = $("home"), quiz = $("quiz"), grid = $("grid");
//Dynamic Score Computation
const getScore = (i) => state[i].answers.filter((a, k) => a === LEVELS[i].questions[k].answer).length;

function getFeedback(score) {
    if (score === 10) return "Quantum Master — flawless! Level completed!";
    if (score >= 7) return "Quantum Ace — almost there! Get 10/10 to unlock the next level.";
    if (score >= 4) return "Scholar in Progress — keep refining your answers.";
    return "Quantum Novice — review the basics and try again.";
}

function renderHome() {
    const box = $("levels");
    box.innerHTML = "";
    LEVELS.forEach((level, i) => {
        const s = state[i];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "level";
        b.disabled = !s.unlocked;
        const status = !s.unlocked ? "level Locked" : s.best === 10 ? "Completed (10/10) ✓" : s.best !== null ? "Last score: " + s.best + "/10 (Needs 10/10)" : "Ready to play";
        b.innerHTML = "<strong>" + level.name + "</strong>" + level.description + "<br>" + status;
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
    const answered = s.answers.filter((a) => a !== null).length;

    $("level-title").textContent = "Level: " + level.name;
    $("progress").textContent = s.done ? "Finished" : "Answered " + answered + " / 10";

    const score = getScore(current);
    $("result").hidden = !s.done;
    if (s.done) {
        $("score").textContent = score + " / 10";
        $("feedback").textContent = getFeedback(score);
        $("retry").hidden = score === 10;
        $("next").hidden = score !== 10 || current === LEVELS.length - 1;
    }

    $("finish").hidden = s.done || answered < 10;

    grid.innerHTML = "";
    level.questions.forEach((question, i) => grid.appendChild(makeCard(question, i)));
}

function makeCard(question, i) {
    const s = state[current];
    const chosen = s.answers[i];
    const isCorrect = chosen === question.answer;

    const card = document.createElement("div");
    card.className = "card";
    card.tabIndex = 0;

    if (s.done) {
        card.classList.add("done", isCorrect ? "ok" : "bad");
    } else if (s.locked[i]) {
        card.classList.add("ok", "locked");
    } else if (chosen !== null) {
        card.classList.add("answered");
    }

    let mark = "Tap to flip";
    if (s.done) mark = isCorrect ? "Correct ✓" : "Wrong ✗";
    else if (s.locked[i]) mark = "Correct ✓";
    else if (chosen !== null) mark = "Answered ✓";

    card.innerHTML =
        '<div class="inner">' +
        '<div class="face front"><span class="big">' + (i + 1) + "</span><span>" + mark + "</span></div>" +
        '<div class="face back"><p class="q"></p><div class="opts"></div></div>' +
        "</div>";
    card.querySelector(".q").textContent = question.q;

    const opts = card.querySelector(".opts");
    question.options.forEach((text, oi) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "option";
        b.textContent = text;

        if (oi === chosen) {
            b.classList.add("chosen");
        }
// to style the correct answers green and wrong answers red
        if (s.done) {
            b.disabled = true;
            if (oi === question.answer) b.classList.add("ok");
            else if (oi === chosen) b.classList.add("bad");
        } else {
            b.addEventListener("click", (e) => {
                e.stopPropagation();
                answer(i, oi);
            });
        }
        opts.appendChild(b);
    });

    const flip = () => {
        if (s.done) return; 
        card.classList.toggle("flipped");
    };
    card.addEventListener("click", flip);
    card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target === card) flip();
    });
    return card;
}

function answer(i, oi) {
    state[current].answers[i] = oi;
    renderQuiz(); 
}

// When the user finishes a level and submits their answers, the "finish" event listener evaluates the quiz and locks in all correct responses:
$("finish").addEventListener("click", () => {
    const s = state[current];
    s.done = true;
    const score = getScore(current);
    s.best = score;
    // Evaluates every answer and locks it if it matches the correct answer
    //Compares the user's answer against the actual correct answer. If correct, s.locked[k] becomes true.
    s.locked = s.answers.map((a, k) => a === LEVELS[current].questions[k].answer);
    
    if (score === 10 && current + 1 < LEVELS.length) {
        state[current + 1].unlocked = true; 
    }
    
    renderQuiz();
    window.scrollTo({ top: 0, behavior: "smooth" });
});
// Clearing Only Incorrect Answers on Retry
$("retry").addEventListener("click", () => {
    const s = state[current];
    // Keeps locked answers intact, resets un-locked (incorrect/unanswered) ones to null
    s.answers = s.answers.map((a, k) => (s.locked[k] ? a : null));
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