const express = require('express');
const router = express.Router();
const db = require('../database/db');
const moment = require('moment'); // or use native Date if you prefer

async function isDevUser(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }

  const [devs] = await db.execute('SELECT user_id FROM dev_panel_users');
  const devIds = devs.map(row => row.user_id);

  if (devIds.includes(req.user.id)) {
    return next();
  }

  return res.status(403).send('❌ Not authorized.');
}

// 🔹 Developer Dashboard
router.get('/dashboard', isDevUser, async (req, res) => {
  const [plans] = await db.execute(
    'SELECT plan, COUNT(*) as count FROM users GROUP BY plan'
  );
  const [guilds] = await db.execute(
    'SELECT COUNT(*) AS count FROM guilds'
  );

  res.render('developer/dashboard', {
    user: req.user,
    plans,
    guildCount: guilds[0].count
  });
});

// 🔹 Users Page (View)
router.get('/users', isDevUser, async (req, res) => {
  const [users] = await db.execute('SELECT * FROM users ORDER BY start_date DESC');

  res.render('developer/users', {
    user: req.user,
    users
  });
});

router.get('/users/add', isDevUser, (req, res) => {
  res.render('developer/add-user', { user: req.user });
});


// 🔹 Add User (Form Handler)
router.post('/users/add', isDevUser, async (req, res) => {
  const { user_id, plan, expiration } = req.body;
  const now = new Date();
  const expDate = new Date(now.getTime() + (parseInt(expiration) * 24 * 60 * 60 * 1000));

  await db.execute(
    'INSERT INTO users (user_id, plan, start_date, expiration_date) VALUES (?, ?, ?, ?)',
    [user_id, plan, now, expDate]
  );

  res.redirect('/developer/users');
});

// GET Edit User Page
router.get('/users/:id/edit', isDevUser, async (req, res) => {
  const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
  const user = rows[0];
  if (!user) return res.status(404).send('User not found');
  res.render('developer/edit-user', { user });
});

// POST Update User
router.post('/users/:id/edit', isDevUser, async (req, res) => {
  const { user_id, server_id, plan, expiration } = req.body;

  // Calculate new expiration date
  const now = new Date();
  const expirationDate = new Date(now.getTime() + parseInt(expiration) * 24 * 60 * 60 * 1000);

  try {
    await db.execute(
      `UPDATE users SET user_id = ?, server_id = ?, plan = ?, expiration_date = ? WHERE id = ?`,
      [user_id, server_id || null, plan, expirationDate, req.params.id]
    );

    res.redirect('/developer/users');
  } catch (err) {
    console.error(err);
    res.status(500).send('❌ Error updating user');
  }
});

// POST Delete User
router.post('/users/:id/delete', isDevUser, async (req, res) => {
  await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.redirect('/developer/users');
});

module.exports = router;
