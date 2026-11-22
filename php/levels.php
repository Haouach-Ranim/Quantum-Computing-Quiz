<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
requireMethod('GET');

$player = trim((string)($_GET['player'] ?? ''));
$pdo = db();

$best = [];
if ($player !== '') {
    $st = $pdo->prepare('SELECT level_id, MAX(correct_count) c, MAX(points) p FROM attempts
                         WHERE player = ? AND submitted = 1 GROUP BY level_id');
    $st->execute([$player]);
    foreach ($st as $r) $best[(int)$r['level_id']] = $r;
}

$levels = $pdo->query(
    'SELECT l.id, l.name, l.description, l.time_limit,
            (SELECT COUNT(*) FROM questions q WHERE q.level_id = l.id) AS question_count
     FROM levels l ORDER BY l.id')->fetchAll();

$list = [];
foreach ($levels as $l) {
    $id = (int)$l['id'];
    $list[] = [
        'id' => $id,
        'name' => $l['name'],
        'description' => $l['description'],
        'time_limit' => (int)$l['time_limit'],
        'question_count' => (int)$l['question_count'],
        'unlocked' => $player !== '' && ($id === 1 || levelCompleted($player, $id - 1)),
        'best_correct' => isset($best[$id]) ? (int)$best[$id]['c'] : null,
        'best_points'  => isset($best[$id]) ? (int)$best[$id]['p'] : null,
    ];
}

out([
    'levels' => $list,
    'scoring' => [
        'base' => BASE_POINTS, 'maxTimeLoss' => MAX_TIME_LOSS,
        'changePenalty' => CHANGE_PENALTY, 'timeoutPenalty' => TIMEOUT_PENALTY,
    ],
]);