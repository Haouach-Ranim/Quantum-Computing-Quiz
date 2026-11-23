<?php
// Checks ONE answer (used for the immediate feedback).
// Receives {"question_id": 12, "choice": 2} and answers {"correct": true|false}.
require __DIR__ . '/config.php';
require_method('POST');

$body = read_json();
$id = as_int($body['question_id'] ?? null);
$choice = as_int($body['choice'] ?? null);
if ($id === null || $choice === null) {
    send_json(['error' => 'question_id and choice are required'], 400);
}

$stmt = db()->prepare('SELECT type, correct_index FROM questions WHERE id = ?');
$stmt->execute([$id]);
$question = $stmt->fetch();
if (!$question) {
    send_json(['error' => 'Unknown question'], 404);
}
if ($choice < 0 || $choice >= option_count($question['type'])) {
    send_json(['error' => 'Invalid choice'], 400);
}

send_json(['correct' => $choice === (int) $question['correct_index']]);
