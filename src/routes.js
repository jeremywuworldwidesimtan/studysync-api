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

module.exports = router;
