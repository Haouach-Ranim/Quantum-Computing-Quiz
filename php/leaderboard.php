<?php
// Sends the 10 best scores of a level: leaderboard.php?level=0
require __DIR__ . '/config.php';
require_method('GET');

$level = read_level($_GET['level'] ?? 0);

$stmt = db()->prepare(
    'SELECT player_name, correct, points, created_at FROM scores
     WHERE level = ? ORDER BY points DESC, correct DESC, created_at ASC, id ASC LIMIT 10'
);
$stmt->execute([$level]);

$scores = [];
$rank = 1;
foreach ($stmt as $r) {
    $scores[] = [
        'rank'    => $rank++,
        'name'    => $r['player_name'],
        'correct' => (int) $r['correct'],
        'points'  => (int) $r['points'],
        'date'    => substr($r['created_at'], 0, 10),
    ];
}

send_json(['level' => $level, 'scores' => $scores]);
