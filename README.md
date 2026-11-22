"# Quantum-Computing-Quiz"

- feature : best score
  It saves each level’s best score, best points and unlocked state to localStorage, and restores them when the page loads. Reloading the page, or closing and reopening it, keeps Level 1 as “Completed (10/10) ✓” with Level 2 still unlocked. A bad replay can no longer overwrite a better score.
  1/ Press F5. The level card on the home screen should still show your best score.
  2/Press F12, open Application > Local Storage, and you’ll see the quantum-quiz-progress key with your data.
  3/To start fresh while testing, right-click the key and delete it, or run localStorage.clear() in the console.

- feature : more than one kind of question, and handle each one correctly:
  I added True/False questions. Each level still has 10 questions (7 multiple choice and 3 True/False), so the scoring, the “10/10 unlocks the next level” rule, the timer, the feedback and localStorage all work as before.

databese:
CREATE DATABASE IF NOT EXISTS quantum_quiz CHARACTER SET utf8mb4;
USE quantum_quiz;

CREATE TABLE levels (
id TINYINT UNSIGNED PRIMARY KEY,
name VARCHAR(30) NOT NULL,
description VARCHAR(120) NOT NULL,
time_limit SMALLINT UNSIGNED NOT NULL
);

CREATE TABLE questions (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
level_id TINYINT UNSIGNED NOT NULL,
position TINYINT UNSIGNED NOT NULL,
text VARCHAR(255) NOT NULL,
UNIQUE (level_id, position),
FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
);

CREATE TABLE answers (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
question_id INT UNSIGNED NOT NULL,
position TINYINT UNSIGNED NOT NULL,
text VARCHAR(255) NOT NULL,
is_correct TINYINT(1) NOT NULL DEFAULT 0,
UNIQUE (question_id, position),
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE attempts (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
token CHAR(32) NOT NULL,
player VARCHAR(20) NOT NULL,
level_id TINYINT UNSIGNED NOT NULL,
started_at INT UNSIGNED NOT NULL,
last_activity INT UNSIGNED NOT NULL,
submitted TINYINT(1) NOT NULL DEFAULT 0,
correct_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
points SMALLINT UNSIGNED NOT NULL DEFAULT 0,
INDEX (level_id, submitted, points),
INDEX (player, level_id),
FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
);

CREATE TABLE attempt_answers (
attempt_id INT UNSIGNED NOT NULL,
question_id INT UNSIGNED NOT NULL,
option_pos TINYINT UNSIGNED NULL,
elapsed SMALLINT UNSIGNED NOT NULL DEFAULT 0,
changes TINYINT UNSIGNED NOT NULL DEFAULT 0,
correct TINYINT(1) NOT NULL DEFAULT 0,
points SMALLINT UNSIGNED NOT NULL DEFAULT 0,
time_loss SMALLINT UNSIGNED NOT NULL DEFAULT 0,
change_loss SMALLINT UNSIGNED NOT NULL DEFAULT 0,
timeout_pen SMALLINT UNSIGNED NOT NULL DEFAULT 0,
PRIMARY KEY (attempt_id, question_id),
FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);
