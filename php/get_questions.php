<?php
// Sends the questions of the 3 levels as JSON.
// The correct answers are NOT sent: they stay on the server.
require __DIR__ . '/config.php';
require_method('GET');

$rows = db()->query(
    'SELECT id, level, type, question_text, option_a, option_b, option_c, option_d
     FROM questions ORDER BY level, position'
);

$levels = array_fill(0, LEVEL_COUNT, []);
foreach ($rows as $r) {
    $question = [
        'id'      => (int) $r['id'],
        'type'    => $r['type'],
        'q'       => $r['question_text'],
        'options' => $r['type'] === 'vf'
            ? null   // true/false: the page adds "True" and "False" itself
            : [$r['option_a'], $r['option_b'], $r['option_c'], $r['option_d']],
    ];
    $levels[(int) $r['level']][] = $question;
}

send_json(['levels' => $levels]);
