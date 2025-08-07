const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('./db');

const hash = (password) => {
    const saltRounds = 10;
    const salt = bcrypt.genSaltSync(saltRounds);
    return bcrypt.hashSync(password, salt);
}

// #region Users
// GET all users
router.get('/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET one user
router.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json(row);
  });
});

// POST new user
router.post('/user/register', (req, res) => {
  const { name, email, password } = req.body;

  // Hash the password using bcrypt
  const passwordHashed = hash(password);

  db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, passwordHashed], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID, name, email, passwordHashed });
  });
});

// POST login
router.post('/user/login', (req, res) => {
//   console.log(req.body);
  const { email, password } = req.body;

  // Check if the email exists
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) {
      return res.status(401).json({ error: 'Invalid email' });
    } else {
      // Check if the password matches
      if (!bcrypt.compareSync(password, row.password)) return res.status(401).json({ error: 'Invalid password' });
    }
    res.json(row);
  });
});

// #endregion

// #region Notes

// GET all notes
router.get('/notes', (req, res) => {
  db.all('SELECT * FROM notes', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET one note 
router.get('/note/:id', (req, res) => {
  const noteId = req.params.id;
  db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Note not found' });
    res.json(row);
  });
});

// POST new note
router.post('/note', (req, res) => {
  const { title, content, user_id } = req.body;
  db.run('INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)', [title, content, user_id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID, title, content, user_id });
  });
});

// PUT update note
router.put('/note/:id', (req, res) => {
  const noteId = req.params.id;
  const { title, content } = req.body;
  db.run('UPDATE notes SET title = ?, content = ? WHERE id = ?', [title, content, noteId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Note updated successfully' });
  });
});

// DELETE note
router.delete('/note/:id', (req, res) => {
  const noteId = req.params.id;
  db.run('DELETE FROM notes WHERE id = ?', [noteId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Note deleted successfully' });
  });
});

// #endregion

// #region Projects

// GET project ID and titles of a user
router.get('/projects/:id', (req, res) => {
  const userId = req.params.id;
  db.all('SELECT id, name FROM projects WHERE user_id = ?', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET EVERYTHING from a project
router.get('/project/:id', (req, res) => {
    const projectId = req.params.id;
    // console.log(projectId)
    const project_json = {};
    // Get project data
    db.all('SELECT * FROM projects WHERE id = ? ', [projectId], (err, project) => {
        if (err) return res.status(500).json({ error: err.message });
        project_json.project = project[0]
        // Get all summaries
        db.all('SELECT * FROM summaries WHERE obsolete = 0 AND project_id = ? ', [project[0].id], (err, summaryRows) => {
            if (err) return res.status(500).json({ error: err.message });
            project_json.summaries = summaryRows
            // Get all quizsets
            db.all('SELECT * FROM quizsets WHERE project_id = ? ', [project[0].id], (err, quizsetRows) => {
                if (err) return res.status(500).json({ error: err.message });
                project_json.quizsets = quizsetRows
                // For each quizset
                quizsetRows.forEach(e => {
                    // Get all quizzes
                    db.all('SELECT * FROM quizzes WHERE quizset = ? ', [e.id], (err, quizRows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    e.quizzes = quizRows
                    // For each quiz
                    e.quizzes.forEach(eq => {
                        // Parse options
                        eq.options = JSON.parse(eq.options);
                    });
                });
                });
                // Get all flashcards
                db.all('SELECT * FROM flashcards WHERE project_id = ? ', [project[0].id], (err, flashcardRows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    project_json.flashcards = flashcardRows
                    res.json(project_json);
                });
            });
        })
    });
});

// #endregion

// #region Summaries

// GET all summaries for a project
router.get('/summaries/:id', (req, res) => {
  const projectId = req.params.id;
  db.all('SELECT chapter, summary FROM summaries WHERE obsolete = 0 AND project_id = ? ', [projectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// #endregion

// #region Quizsets

// GET all quizsets for a project
router.get('/quizsets/:id', (req, res) => {
  const projectId = req.params.id;
  db.all('SELECT * FROM quizsets WHERE project_id = ? ', [projectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET all quizzes on all quizsets for a project
router.get('/quizsets/quizzes/:id', (req, res) => {
  const projectId = req.params.id;
  const jason = {};
  // Get all quizsets
  db.all('SELECT * FROM quizsets WHERE project_id = ? ', [projectId], (err, quizsetRows) => {
      if (err) return res.status(500).json({ error: err.message });
      jason.quizsets = quizsetRows
      // For each quizset
      quizsetRows.forEach(e => {
          // Get all quizzes
          db.all('SELECT * FROM quizzes WHERE quizset = ? ', [e.id], (err, quizRows) => {
            // console.log(quizRows)
            if (err) return res.status(500).json({ error: err.message });
            e.quizzes = quizRows
            // For each quiz
            e.quizzes.forEach(eq => {
                // Parse options
                eq.options = JSON.parse(eq.options);
            });
            
          });
        });
      db.all('', (err) => {
          res.json(jason);
        });
      })
});

// #endregion

// #region Quizzes

// GET all quizzes for a quizset
router.get('/quizzes/:id', (req, res) => {
  const quizsetId = req.params.id;
  db.all('SELECT * FROM quizzes WHERE quizset = ? ', [quizsetId], (err, quizRows) => {
    if (err) return res.status(500).json({ error: err.message });
    // For each quiz
    quizRows.forEach(eq => {
        // Parse options
        eq.options = JSON.parse(eq.options);
    });
    res.json(quizRows);
  });
});

// POST user attempts at quizzes
router.post('/attempt', (req, res) => {
  // Format attempts as [{ user_id, quiz_id, correct }]
  const { attempts } = req.body;

  
  attempts.forEach(attempt => {
    const { userId, quizId, correct } = attempt;
    // Update old entries to obsolete them
    db.run(
      "UPDATE attempts SET obsolete = 1 WHERE user_id = ? AND quiz_id = ? AND obsolete = 0",
      [userId, quizId],
      async function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run('INSERT INTO attempts (user_id, quiz_id, correct, obsolete) VALUES (?, ?, ?, ?)', [userId, quizId, correct, 0], (err) => {
          if (err) return res.status(500).json({ error: err.message });
        });
      })
  })

  db.all('', (err) => {
    res.json({ message: 'Attempt saved successfully' });
  })
});

// GET user quiz stats
router.get('/stats/:id', (req, res) => {
  const userId = req.params.id;
  // Get the percentage of correct attempts
  db.get('SELECT COUNT(*) AS total_attempts, SUM(correct) AS correct_attempts FROM attempts WHERE user_id = ? AND obsolete = 0', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const totalAttempts = row.total_attempts;
    const correctAttempts = row.correct_attempts;
    const percentage = (correctAttempts / totalAttempts) * 100;
    res.json({ totalAttempts, correctAttempts, percentage });
  });
});

// #endregion

// #region Flashcards

// GET all flashcards for a project
router.get('/flashcards/:id', (req, res) => {
  const projectId = req.params.id;
  db.all('SELECT * FROM flashcards WHERE project_id = ? ', [projectId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// #endregion

module.exports = router;
