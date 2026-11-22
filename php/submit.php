<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
requireMethod('POST');

$in = body();
$attemptId = (int)($in['attempt_id'] ?? 0);
$token = (string)($in['token'] ?? '');
$items = $in['answers'] ?? null;
if (!is_array($items)) out(['error' => 'Missing answers'], 422);

$pdo = db();
$st = $pdo->prepare('SELECT a.*, l.time_limit FROM attempts a JOIN levels l ON l.id = a.level_id WHERE a.id = ?');
$st->execute([$attemptId]);
$att = $st->fetch();
if (!$att || !hash_equals((string)$att['token'], $token)) out(['error' => 'Unknown attempt'], 403);

// Server-side truth: option count and correct position per question
$st = $pdo->prepare(
    'SELECT q.id, COUNT(a.id) AS n, MAX(CASE WHEN a.is_correct = 1 THEN a.position END) AS correct
     FROM questions q JOIN answers a ON a.question_id = q.id WHERE q.level_id = ? GROUP BY q.id');
$st->execute([$att['level_id']]);
$qs = [];
foreach ($st as $r) $qs[(int)$r['id']] = ['n' => (int)$r['n'], 'correct' => (int)$r['correct']];

// Questions already answered correctly are frozen (retry cannot change them)
$st = $pdo->prepare('SELECT question_id FROM attempt_answers WHERE attempt_id = ? AND correct = 1');
$st->execute([$attemptId]);
$frozen = array_flip(array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN)));

$now = time();
$limit = (int)$att['time_limit'];
$window = $now - (int)$att['last_activity'] + 3;   // no question can take longer than this
$rows = [];

foreach ($items as $it) {
    if (!is_array($it)) continue;
    $qid = (int)($it['question_id'] ?? 0);
    if (!isset($qs[$qid])) out(['error' => 'Unknown question'], 422);
    if (isset($frozen[$qid]) || isset($rows[$qid])) continue;

    $opt = $it['option'] ?? null;
    if ($opt !== null && (!is_int($opt) || $opt < 0 || $opt >= $qs[$qid]['n'])) {
        out(['error' => 'Invalid option'], 422);
    }
    $elapsed = max(0, min((int)($it['elapsed'] ?? 0), $limit, $window));
    $changes = max(0, min((int)($it['changes'] ?? 0), 20));

    $row = ['opt' => $opt, 'elapsed' => $elapsed, 'changes' => $changes,
            'correct' => 0, 'points' => 0, 'tl' => 0, 'cl' => 0, 'to' => 0];

    if ($opt === null) {
        $row['to'] = TIMEOUT_PENALTY;                  // unanswered = time ran out
    } elseif ($opt === $qs[$qid]['correct']) {
        $w  = worth($elapsed, $limit);
        $cl = min($w, $changes * CHANGE_PENALTY);
        $row = [...$row, 'correct' => 1, 'points' => $w - $cl, 'tl' => BASE_POINTS - $w, 'cl' => $cl];
    }
    $rows[$qid] = $row;
}

$pdo->beginTransaction();
$ins = $pdo->prepare(
    'INSERT INTO attempt_answers
       (attempt_id, question_id, option_pos, elapsed, changes, correct, points, time_loss, change_loss, timeout_pen)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE option_pos = VALUES(option_pos), elapsed = VALUES(elapsed),
       changes = VALUES(changes), correct = VALUES(correct), points = VALUES(points),
       time_loss = VALUES(time_loss), change_loss = VALUES(change_loss), timeout_pen = VALUES(timeout_pen)');
foreach ($rows as $qid => $r) {
    $ins->execute([$attemptId, $qid, $r['opt'], $r['elapsed'], $r['changes'],
                   $r['correct'], $r['points'], $r['tl'], $r['cl'], $r['to']]);
}

$st = $pdo->prepare(
    'SELECT COALESCE(SUM(correct),0) c, COALESCE(SUM(points),0) p, COALESCE(SUM(time_loss),0) tl,
            COALESCE(SUM(change_loss),0) cl, COALESCE(SUM(timeout_pen),0) t
     FROM attempt_answers WHERE attempt_id = ?');
$st->execute([$attemptId]);
$t = $st->fetch();
$correct = (int)$t['c'];
$total = max(0, (int)$t['p'] - (int)$t['t']);

$pdo->prepare('UPDATE attempts SET submitted = 1, correct_count = ?, points = ?, last_activity = ? WHERE id = ?')
    ->execute([$correct, $total, $now, $attemptId]);
$pdo->commit();

$st = $pdo->prepare('SELECT question_id, correct, points, timeout_pen FROM attempt_answers WHERE attempt_id = ? ORDER BY question_id');
$st->execute([$attemptId]);
$results = [];
foreach ($st as $r) {
    $qid = (int)$r['question_id'];
    $res = ['question_id' => $qid, 'correct' => (bool)$r['correct'],
            'points' => (int)$r['points'], 'timeout' => (int)$r['timeout_pen']];
    if (REVEAL_CORRECT_OPTION) $res['correct_option'] = $qs[$qid]['correct'];
    $results[] = $res;
}

out([
    'results' => $results,
    'totals' => ['correct' => $correct, 'points' => (int)$t['p'], 'timeLoss' => (int)$t['tl'],
                 'changeLoss' => (int)$t['cl'], 'timeouts' => (int)$t['t'], 'total' => $total],
    'completed' => $correct === count($qs),
]);