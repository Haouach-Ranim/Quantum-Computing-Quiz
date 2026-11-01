"# Quantum-Computing-Quiz" 
- feature : best score
It saves each level’s best score, best points and unlocked state to localStorage, and restores them when the page loads. Reloading the page, or closing and reopening it, keeps Level 1 as “Completed (10/10) ✓” with Level 2 still unlocked. A bad replay can no longer overwrite a better score.
1/ Press F5. The level card on the home screen should still show your best score.
2/Press F12, open Application > Local Storage, and you’ll see the quantum-quiz-progress key with your data.
3/To start fresh while testing, right-click the key and delete it, or run localStorage.clear() in the console.

- feature : more than one kind of question, and handle each one correctly:
I added True/False questions. Each level still has 10 questions (7 multiple choice and 3 True/False), so the scoring, the “10/10 unlocks the next level” rule, the timer, the feedback and localStorage all work as before.
