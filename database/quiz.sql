-- Quantum Computing Quiz: database
-- Import with phpMyAdmin (Import tab) or: mysql -u root < quiz.sql

CREATE DATABASE IF NOT EXISTS quantum_quiz
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quantum_quiz;

DROP TABLE IF EXISTS scores;
DROP TABLE IF EXISTS questions;

-- One row per question. level: 0 = Easy, 1 = Medium, 2 = Hard.
-- type: 'qcm' (4 options) or 'vf' (True/False, options stay NULL).
-- correct_index: index of the right option (for 'vf': 0 = True, 1 = False).
CREATE TABLE questions (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  level         TINYINT UNSIGNED NOT NULL,
  position      TINYINT UNSIGNED NOT NULL,
  type          ENUM('qcm','vf') NOT NULL DEFAULT 'qcm',
  question_text VARCHAR(255) NOT NULL,
  option_a      VARCHAR(255) NULL,
  option_b      VARCHAR(255) NULL,
  option_c      VARCHAR(255) NULL,
  option_d      VARCHAR(255) NULL,
  correct_index TINYINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_level_position (level, position)
) ENGINE=InnoDB;

-- One row per player and level: the best score (used for the leaderboard).
CREATE TABLE scores (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  player_name VARCHAR(20) NOT NULL,
  level       TINYINT UNSIGNED NOT NULL,
  correct     TINYINT UNSIGNED NOT NULL,
  points      SMALLINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_player_level (player_name, level),
  KEY idx_level_points (level, points)
) ENGINE=InnoDB;

INSERT INTO questions (level, position, type, question_text, option_a, option_b, option_c, option_d, correct_index) VALUES
(0, 1, 'qcm', 'What is the basic unit of information in a quantum computer?', 'Bit', 'Byte', 'Qubit', 'Pixel', 2),
(0, 2, 'vf', 'A classical bit can only be 0 or 1.', NULL, NULL, NULL, NULL, 0),
(0, 3, 'qcm', 'What does superposition mean for a qubit?', 'It is switched off', 'It is a combination of 0 and 1 at the same time', 'It is copied twice', 'It moves faster than light', 1),
(0, 4, 'qcm', 'Quantum computers are expected to be especially good at:', 'Browsing the web', 'Playing videos', 'Solving certain very complex problems faster', 'Storing photos', 2),
(0, 5, 'vf', 'Quantum computers rely on quantum mechanics.', NULL, NULL, NULL, NULL, 0),
(0, 6, 'qcm', 'Which company created the Qiskit toolkit?', 'IBM', 'Apple', 'Netflix', 'Tesla', 0),
(0, 7, 'qcm', 'What do you get when you measure a qubit?', 'A decimal number', 'A color', '0 or 1', 'Nothing', 2),
(0, 8, 'vf', 'Quantum computers are expected to replace everyday laptops within the next year.', NULL, NULL, NULL, NULL, 1),
(0, 9, 'qcm', 'What is entanglement?', 'Two qubits linked so that their states are correlated', 'A broken qubit', 'A type of cable', 'A programming language', 0),
(0, 10, 'qcm', 'Why are many quantum computers kept extremely cold?', 'To save electricity', 'To reduce noise and keep fragile quantum states stable', 'To look impressive', 'To prevent rust', 1),
(1, 1, 'qcm', 'Which gate puts a qubit into an equal superposition?', 'AND gate', 'Hadamard gate', 'NOT gate', 'OR gate', 1),
(1, 2, 'vf', 'The Pauli-X gate flips a qubit from 0 to 1 (and 1 to 0).', NULL, NULL, NULL, NULL, 0),
(1, 3, 'qcm', 'What is Shor''s algorithm used for?', 'Sorting lists', 'Searching a database', 'Factoring large integers', 'Compressing files', 2),
(1, 4, 'qcm', 'What is Grover''s algorithm used for?', 'Searching an unsorted database faster', 'Encrypting messages', 'Drawing graphics', 'Cooling qubits', 0),
(1, 5, 'qcm', 'What is decoherence?', 'Merging two qubits', 'A kind of quantum gate', 'A cooling method', 'The loss of a qubit''s quantum state due to its environment', 3),
(1, 6, 'qcm', 'What is a Bell state?', 'A sound produced by qubits', 'A maximally entangled two-qubit state', 'A qubit at rest', 'A type of error', 1),
(1, 7, 'qcm', 'How many basis states can 2 qubits be in superposition of?', '2', '3', '4', '8', 2),
(1, 8, 'vf', 'The CNOT gate acts on three qubits.', NULL, NULL, NULL, NULL, 1),
(1, 9, 'vf', 'Google claimed quantum supremacy in 2012.', NULL, NULL, NULL, NULL, 1),
(1, 10, 'qcm', 'Which is a common qubit technology?', 'Superconducting circuits', 'Vacuum tubes', 'Magnetic tape', 'Punch cards', 0),
(2, 1, 'qcm', 'What does the Bloch sphere represent?', 'The cooling chamber', 'The state of a single qubit', 'A network of computers', 'The speed of an algorithm', 1),
(2, 2, 'vf', 'An unknown quantum state can be copied perfectly.', NULL, NULL, NULL, NULL, 1),
(2, 3, 'qcm', 'Which subroutine is central to Shor''s algorithm?', 'Quantum Fourier Transform', 'Binary search', 'Bubble sort', 'Hash function', 0),
(2, 4, 'qcm', 'How many queries does Grover''s algorithm need to search N items?', 'About N', 'About N squared', 'About log N', 'About the square root of N', 3),
(2, 5, 'qcm', 'Which complexity class captures problems efficiently solvable by a quantum computer?', 'P only', 'BQP', 'NP-hard only', 'EXP', 1),
(2, 6, 'qcm', 'Which of these is a leading quantum error-correcting code?', 'Morse code', 'Huffman code', 'Surface code', 'ASCII', 2),
(2, 7, 'vf', 'The BB84 protocol is used for quantum key distribution.', NULL, NULL, NULL, NULL, 0),
(2, 8, 'qcm', 'The state |+> is equal to:', '|0> - |1>', '(|0> + |1>) / sqrt(2)', '|1>', '|0> |1>', 1),
(2, 9, 'qcm', 'What is a Toffoli gate?', 'A single-qubit rotation', 'A measurement gate', 'A two-qubit swap', 'A three-qubit controlled-controlled-NOT gate', 3),
(2, 10, 'vf', 'Bell''s theorem proves that quantum computers are impossible.', NULL, NULL, NULL, NULL, 1);
