<?php
// Checks the 10 answers of a level at the end ("See my results").
// Receives {"level": 0, "answers": [{"id": 1, "choice": 2}, ...]}
// and answers {"results": [true, false, null, ...], "correct_count": 7}.
require __DIR__ . '/config.php';
require_method('POST');

$body = read_json();
$level = read_level($body['level'] ?? null);
$results = verify_level_answers($level, $body['answers'] ?? null);

send_json([
    'results'       => $results,
    'correct_count' => count(array_filter($results, function ($r) { return $r === true; })),
]);
