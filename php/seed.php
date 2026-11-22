<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
if (PHP_SAPI !== 'cli') exit('CLI only');

$pdo = db();
if ((int)$pdo->query('SELECT COUNT(*) FROM levels')->fetchColumn() > 0) {
    exit("Levels already seeded, aborting.\n");
}
$levels = json_decode(file_get_contents(__DIR__ . '/data/questions.json'), true, 512, JSON_THROW_ON_ERROR);
$limits = [10, 15, 20];   // seconds per question: Easy, Medium, Hard

$pdo->beginTransaction();
$iLevel = $pdo->prepare('INSERT INTO levels (id, name, description, time_limit) VALUES (?,?,?,?)');
$iQ = $pdo->prepare('INSERT INTO questions (level_id, position, text) VALUES (?,?,?)');
$iA = $pdo->prepare('INSERT INTO answers (question_id, position, text, is_correct) VALUES (?,?,?,?)');

foreach ($levels as $li => $lv) {
    $lid = $li + 1;
    $iLevel->execute([$lid, $lv['name'], $lv['description'], $limits[$li]]);
    foreach ($lv['questions'] as $qi => $q) {
        $iQ->execute([$lid, $qi, $q['q']]);
        $qid = (int)$pdo->lastInsertId();
        foreach ($q['options'] as $oi => $text) {
            $iA->execute([$qid, $oi, $text, $oi === $q['answer'] ? 1 : 0]);
        }
    }
}
$pdo->commit();
echo "Seeded.\n";