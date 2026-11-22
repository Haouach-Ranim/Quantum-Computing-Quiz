<?php
declare(strict_types=1);

const DB_DSN  = 'mysql:host=localhost;dbname=quantum_quiz;charset=utf8mb4';
const DB_USER = 'quiz_user';
const DB_PASS = 'change-me';

// Scoring (single source of truth: the client reads it from levels.php)
const BASE_POINTS       = 100;
const MAX_TIME_LOSS     = 0.5;
const CHANGE_PENALTY    = 10;
const TIMEOUT_PENALTY   = 10;
const REVEAL_CORRECT_OPTION = false; // true: show the right option after each submit

ini_set('display_errors', '0');

function db(): PDO {
    static $pdo = null;
    return $pdo ??= new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function out(array $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireMethod(string $m): void {
    if ($_SERVER['REQUEST_METHOD'] !== $m) out(['error' => 'Method not allowed'], 405);
}

function body(): array {
    $d = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($d)) out(['error' => 'Invalid JSON'], 400);
    return $d;
}

function cleanPlayer(mixed $p): string {
    $p = trim((string)$p);
    if (!preg_match('/^[\p{L}\p{N} _-]{2,20}$/u', $p)) {
        out(['error' => 'Name: 2-20 letters, digits, spaces, _ or -'], 422);
    }
    return $p;
}

function worth(int $elapsed, int $limit): int {
    $ratio = min(max($elapsed, 0), $limit) / $limit;
    return (int)round(BASE_POINTS * (1 - MAX_TIME_LOSS * $ratio));
}

// A level is completed when the player got every question right in one attempt
function levelCompleted(string $player, int $levelId): bool {
    $st = db()->prepare(
        'SELECT 1 FROM attempts a WHERE a.player = ? AND a.level_id = ? AND a.submitted = 1
         AND a.correct_count = (SELECT COUNT(*) FROM questions q WHERE q.level_id = a.level_id) LIMIT 1');
    $st->execute([$player, $levelId]);
    return (bool)$st->fetchColumn();
}

set_exception_handler(function (Throwable $e): void {
    error_log($e->getMessage());
    out(['error' => 'Server error'], 500);
});