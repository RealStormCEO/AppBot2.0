const express = require('express');
const router = express.Router();
const passport = require('passport');
const db = require('../database/db');
const moment = require('moment-timezone');

// Guild you're managing applications for
function getSelectedGuildId(req) {
    return req.session.guildId || '1296323796281856041'; // default fallback
  }  

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Middleware to check if user is an admin in the target guild
function isStaff(req, res, next) {
    const selectedGuildId = getSelectedGuildId(req);
    const guild = req.user.guilds?.find(g =>
      g.id === selectedGuildId && (g.permissions & 0x8)
    );    

  if (guild) return next();
  return res.status(403).send('❌ You are not authorized to access this dashboard.');
}

// Routes
router.get('/', (req, res) => res.render('home', { user: req.user }));

router.get('/login', passport.authenticate('discord'));

router.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => res.redirect('/servers')
);

router.get('/logout', (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.redirect('/');
      });
    });
  });  

// 🌐 Show list of servers
router.get('/servers', isAuthenticated, (req, res) => {
    const adminGuilds = req.user.guilds?.filter(g => g.permissions & 0x8) || [];
    res.render('servers', { user: req.user, guilds: adminGuilds });
  });
  
  // 🔁 Handle server selection
  router.post('/select-server', isAuthenticated, (req, res) => {
    const selected = req.body.guild_id;
    const match = req.user.guilds?.find(g => g.id === selected && (g.permissions & 0x8));
  
    if (match) {
      req.session.guildId = selected;
      return res.redirect('/dashboard');
    }
  
    return res.status(403).send('❌ Invalid server selection.');
  });  

// 🚧 Admin Dashboard for Managing Application Questions
router.get('/dashboard', isAuthenticated, isStaff, async (req, res) => {
    const guildId = getSelectedGuildId(req);

    if (!guildId) {
        return res.redirect('/servers');
    }

  const [questions] = await db.execute(
    'SELECT id, question FROM application_questions WHERE guild_id = ? ORDER BY position ASC',
    [getSelectedGuildId(req)]
  );

  res.render('dashboard', {
    user: req.user,
    questions,
    guildId
  });
});

// ➕ Add new question
router.post('/dashboard/add-question', isAuthenticated, isStaff, async (req, res) => {
  const question = req.body.question;
  if (!question || question.trim().length === 0) {
    return res.redirect('/dashboard');
  }

  const [rows] = await db.execute(
    'SELECT MAX(position) AS max FROM application_questions WHERE guild_id = ?',
    [getSelectedGuildId(req)]
  );
  const position = (rows[0]?.max || 0) + 1;

  await db.execute(
    'INSERT INTO application_questions (guild_id, question, position) VALUES (?, ?, ?)',
    [getSelectedGuildId(req), question.trim(), position]
  );

  (req, res) => res.redirect('/servers')
});

// 🗑️ Delete question
router.post('/dashboard/delete-question', isAuthenticated, isStaff, async (req, res) => {
  const questionId = req.body.id;
  if (!questionId) return res.redirect('/dashboard');

  await db.execute(
    'DELETE FROM application_questions WHERE id = ?',
    [questionId]
  );
  
  res.redirect('/dashboard');
});

router.post('/dashboard/reorder-questions', isAuthenticated, isStaff, async (req, res) => {
    const updates = req.body.order; // [{ id: "123", position: 1 }, ...]
  
    const updatePromises = updates.map(({ id, position }) =>
      db.execute(
        'UPDATE application_questions SET position = ? WHERE id = ? AND guild_id = ?',
        [position, id, getSelectedGuildId(req)]
      )
    );
  
    try {
      await Promise.all(updatePromises);
      res.sendStatus(200);
    } catch (err) {
      console.error('❌ Error reordering:', err);
      res.sendStatus(500);
    }
  });

// List all applications
router.get('/applications', isAuthenticated, isStaff, async (req, res) => {
    const [apps] = await db.execute(
      'SELECT id, username, ai_score, created_at FROM applications WHERE guild_id = ? ORDER BY created_at DESC',
      [getSelectedGuildId(req)]
    );
  
    // Convert to NY time
    const appsWithTime = apps.map(app => ({
      ...app,
      nyTime: moment(app.created_at).tz('America/New_York').format('MMM D, YYYY h:mm A')
    }));
  
    res.render('applications', { user: req.user, apps: appsWithTime });
  });
  
  // View single application
  router.get('/applications/:id', isAuthenticated, isStaff, async (req, res) => {
    const appId = req.params.id;
    const [rows] = await db.execute('SELECT * FROM applications WHERE id = ?', [appId]);
    if (!rows.length) return res.status(404).send('❌ Not found');
    res.render('application_detail', { app: rows[0] });
  });
  

// Server switch view
router.get('/switch-server', isAuthenticated, (req, res) => {
    const adminGuilds = req.user.guilds?.filter(g => (g.permissions & 0x8)); // Admin in these
    res.render('servers', { user: req.user, guilds: adminGuilds });
  });
  

module.exports = router;
