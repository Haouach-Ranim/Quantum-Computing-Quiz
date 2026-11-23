<?php
// Saves a score in the database (one row per player and level, only the best score is kept).
// The answers are checked again here: the number of correct answers is never trusted from the browser.
require __DIR__ . '/config.php';
require_method('POST');

$body = read_json();
$level = read_level($body['level'] ?? null);

// Player name: 2 to 20 characters (letters, digits, space, _ and -).
$name = trim((string) ($body['name'] ?? ''));
if (!preg_match('/^[\p{L}\p{N} _-]{2,20}$/u', $name)) {
    send_json(['error' => 'Name must have 2 to 20 letters, digits, spaces, _ or -'], 400);
}

// Correct answers recomputed on the server.
$results = verify_level_answers($level, $body['answers'] ?? null);
$correct = count(array_filter($results, function ($r) { return $r === true; }));

// Points come from the page (time and penalties), but they must stay possible.
$points = as_int($body['points'] ?? null);
if ($points === null || $points < 0 || $points > $correct * POINTS_PER_QUESTION) {
    send_json(['error' => 'Invalid points'], 400);
}

// One row per player and level: a new score replaces the old one only if it is better.
$pdo = db();
$stmt = $pdo->prepare('SELECT id, points FROM scores WHERE player_name = ? AND level = ?');
$stmt->execute([$name, $level]);
$existing = $stmt->fetch();

$improved = false;
$best = $points;
if (!$existing) {
    $pdo->prepare('INSERT INTO scores (player_name, level, correct, points) VALUES (?, ?, ?, ?)')
        ->execute([$name, $level, $correct, $points]);
    $improved = true;
} elseif ($points > (int) $existing['points']) {
    $pdo->prepare('UPDATE scores SET correct = ?, points = ?, created_at = NOW() WHERE id = ?')
        ->execute([$correct, $points, $existing['id']]);
    $improved = true;
} else {
    $best = (int) $existing['points'];   // the old score stays
}

// Rank of the player in the level, with the same order as leaderboard.php
// (more points, then more correct answers, then the earlier score).
$stmt = $pdo->prepare('SELECT id, correct, points, created_at FROM scores WHERE player_name = ? AND level = ?');
$stmt->execute([$name, $level]);
$me = $stmt->fetch();

$stmt = $pdo->prepare(
    'SELECT COUNT(*) + 1 FROM scores WHERE level = ? AND (
        points > ?
        OR (points = ? AND correct > ?)
        OR (points = ? AND correct = ? AND created_at < ?)
        OR (points = ? AND correct = ? AND created_at = ? AND id < ?)
     )'
);
$stmt->execute([
    $level,
    $me['points'],
    $me['points'], $me['correct'],
    $me['points'], $me['correct'], $me['created_at'],
    $me['points'], $me['correct'], $me['created_at'], $me['id'],
]);

send_json([
    'saved'    => true,
    'improved' => $improved,
    'correct'  => $correct,
    'points'   => $points,
    'best'     => $best,
    'rank'     => (int) $stmt->fetchColumn(),
]);
