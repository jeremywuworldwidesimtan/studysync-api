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

module.exports = router;
