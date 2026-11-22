<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
requireMethod('POST');

$in = body();
$player  = cleanPlayer($in['player'] ?? '');
$levelId = (int)($in['level'] ?? 0);

$pdo = db();
$st = $pdo->prepare('SELECT id, time_limit FROM levels WHERE id = ?');
$st->execute([$levelId]);
$level = $st->fetch();
if (!$level) out(['error' => 'Unknown level'], 404);
if ($levelId > 1 && !levelCompleted($player, $levelId - 1)) {
    out(['error' => 'Level locked: complete the previous level with a perfect score'], 403);
}

$token = bin2hex(random_bytes(16));
$now = time();
$pdo->prepare('INSERT INTO attempts (token, player, level_id, started_at, last_activity) VALUES (?,?,?,?,?)')
    ->execute([$token, $player, $levelId, $now, $now]);
$attemptId = (int)$pdo->lastInsertId();

// is_correct is never selected
$st = $pdo->prepare(
    'SELECT q.id AS qid, q.text AS qtext, a.text AS atext
     FROM questions q JOIN answers a ON a.question_id = q.id
     WHERE q.level_id = ? ORDER BY q.position, a.position');
$st->execute([$levelId]);

$questions = [];
foreach ($st as $r) {
    $qid = (int)$r['qid'];
    $questions[$qid] ??= ['id' => $qid, 'q' => $r['qtext'], 'options' => []];
    $questions[$qid]['options'][] = $r['atext'];
}

out([
    'attempt_id' => $attemptId,
    'token' => $token,
    'time_limit' => (int)$level['time_limit'],
    'questions' => array_values($questions),
]);