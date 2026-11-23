<?php
// Shared settings and helpers used by every PHP script of the quiz.
// Default XAMPP/WAMP values: user "root" and an empty password.
// On MAMP the password is usually "root": change DB_PASS if needed.

const DB_HOST = 'localhost';
const DB_NAME = 'quantum_quiz';
const DB_USER = 'root';
const DB_PASS = '';

const LEVEL_COUNT = 3;          // Easy, Medium, Hard
const QUESTIONS_PER_LEVEL = 10;
const POINTS_PER_QUESTION = 100; // maximum points for one question

// Never print PHP errors in the page: they would break the JSON answer.
ini_set('display_errors', '0');

// Any uncaught error is logged and answered with a clean JSON message.
set_exception_handler(function ($e) {
    error_log('Quiz error: ' . $e->getMessage());
    send_json(['error' => 'Server error'], 500);
});

/** One PDO connection per request (prepared statements, exceptions on errors). */
function db() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

/** Sends a JSON answer and stops the script. */
function send_json($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Accepts only the given HTTP method (GET or POST). */
function require_method($method) {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        header('Allow: ' . $method);
        send_json(['error' => 'Method not allowed'], 405);
    }
}

/** Reads and decodes the JSON body sent by fetch(). */
function read_json() {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        send_json(['error' => 'Invalid JSON body'], 400);
    }
    return $data;
}

/** Returns the integer value of $v, or null if it is not a whole number. */
function as_int($v) {
    if (is_int($v)) return $v;
    if (is_string($v) && preg_match('/^-?\d{1,9}$/', $v)) return (int) $v;
    return null;
}

/** Checks a level number (0, 1 or 2). */
function read_level($v) {
    $level = as_int($v);
    if ($level === null || $level < 0 || $level >= LEVEL_COUNT) {
        send_json(['error' => 'Invalid level'], 400);
    }
    return $level;
}

/** Number of options of a question type: 2 for true/false, 4 for multiple choice. */
function option_count($type) {
    return $type === 'vf' ? 2 : 4;
}

/**
 * Checks the 10 answers of a level against the database.
 * $answers is a list of {id, choice}; choice is null when the question was not answered.
 * Returns the list of results (true / false / null) in the same order.
 */
function verify_level_answers($level, $answers) {
    if (!is_array($answers) || count($answers) !== QUESTIONS_PER_LEVEL) {
        send_json(['error' => 'Exactly ' . QUESTIONS_PER_LEVEL . ' answers are required'], 400);
    }

    $stmt = db()->prepare('SELECT id, type, correct_index FROM questions WHERE level = ?');
    $stmt->execute([$level]);
    $key = [];
    foreach ($stmt as $row) {
        $key[(int) $row['id']] = $row;
    }

    $results = [];
    $seen = [];
    foreach ($answers as $a) {
        $id = is_array($a) ? as_int($a['id'] ?? null) : null;
        if ($id === null || !isset($key[$id]) || isset($seen[$id])) {
            send_json(['error' => 'Invalid question id'], 400);
        }
        $seen[$id] = true;

        $choice = $a['choice'] ?? null;
        if ($choice === null) {
            $results[] = null;               // not answered / time is up
            continue;
        }
        $choice = as_int($choice);
        if ($choice === null || $choice < 0 || $choice >= option_count($key[$id]['type'])) {
            send_json(['error' => 'Invalid choice'], 400);
        }
        $results[] = ($choice === (int) $key[$id]['correct_index']);
    }
    return $results;
}
