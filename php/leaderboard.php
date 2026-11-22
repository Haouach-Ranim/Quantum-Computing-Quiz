<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
requireMethod('GET');

$levelId = (int)($_GET['level'] ?? 0);
$st = db()->prepare(
    'SELECT player, MAX(points) AS points FROM attempts
     WHERE level_id = ? AND submitted = 1
     GROUP BY player ORDER BY points DESC, MIN(started_at) ASC LIMIT 10');
$st->execute([$levelId]);

out(['scores' => array_map(
    fn($r) => ['player' => $r['player'], 'points' => (int)$r['points']],
    $st->fetchAll()
)]);