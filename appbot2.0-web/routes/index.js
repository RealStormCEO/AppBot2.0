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
  
    const [forms] = await db.execute(
      'SELECT * FROM application_forms WHERE guild_id = ? ORDER BY created_at DESC',
      [guildId]
    );
  
    let formId = req.query.form_id;
    if (!formId && forms.length > 0) formId = forms[0].id;
  
    if (!formId) {
      return res.render('dashboard', {
        user: req.user,
        forms: [],
        questions: [],
        currentForm: null,
        guildId
      });
    }
  
    const [questions] = await db.execute(
      'SELECT id, question FROM application_questions WHERE form_id = ? ORDER BY position ASC',
      [formId]
    );
  
    res.render('dashboard', {
      user: req.user,
      forms,
      questions,
      currentForm: forms.find(f => f.id == formId),
      guildId
    });
  });  

// ➕ Add new question
router.post('/dashboard/add-question', isAuthenticated, isStaff, async (req, res) => {
    const formId = req.body.form_id;
    const question = req.body.question;
  
    if (!question || !formId) return res.redirect('/dashboard');
  
    const [rows] = await db.execute(
      'SELECT MAX(position) AS max FROM application_questions WHERE form_id = ?',
      [formId]
    );
  
    const position = (rows[0]?.max || 0) + 1;
  
    await db.execute(
      'INSERT INTO application_questions (form_id, question, position) VALUES (?, ?, ?)',
      [formId, question.trim(), position]
    );
  
    res.redirect(`/dashboard?form_id=${formId}`);
  });  

// 🗑️ Delete question
router.post('/dashboard/delete-question', isAuthenticated, isStaff, async (req, res) => {
    const questionId = req.body.id;
  
    const [[form]] = await db.execute(
      'SELECT form_id FROM application_questions WHERE id = ?',
      [questionId]
    );
  
    await db.execute(
      'DELETE FROM application_questions WHERE id = ?',
      [questionId]
    );
  
    res.redirect(`/dashboard?form_id=${form.form_id}`);
  });  

  router.post('/dashboard/reorder-questions', isAuthenticated, isStaff, async (req, res) => {
    const updates = req.body.order;
  
    try {
      await Promise.all(updates.map(({ id, position }) =>
        db.execute(
          'UPDATE application_questions SET position = ? WHERE id = ?',
          [position, id]
        )
      ));
  
      res.sendStatus(200);
    } catch (err) {
      console.error('❌ Error reordering:', err);
      res.sendStatus(500);
    }
  });

  router.post('/dashboard/forms/new', isAuthenticated, isStaff, async (req, res) => {
    const title = req.body.title.trim();
    if (!title) return res.redirect('/dashboard');
  
    await db.execute(
      'INSERT INTO application_forms (guild_id, title) VALUES (?, ?)',
      [getSelectedGuildId(req), title]
    );
  
    res.redirect('/dashboard');
  });

  router.get('/dashboard/forms/:formId', isAuthenticated, isStaff, async (req, res) => {
    const formId = req.params.formId;
  
    // Fetch form details
    const [[form]] = await db.execute(
      'SELECT * FROM application_forms WHERE id = ? AND guild_id = ?',
      [formId, getSelectedGuildId(req)]
    );
  
    if (!form) return res.status(404).send('❌ Form not found');
  
    // Fetch its questions
    const [questions] = await db.execute(
      'SELECT id, question, position FROM application_questions WHERE form_id = ? ORDER BY position ASC',
      [formId]
    );
  
    res.render('form_builder', {
      user: req.user,
      form,
      questions
    });
  });

  router.get('/dashboard/forms', isAuthenticated, isStaff, async (req, res) => {
    const [forms] = await db.execute(
      'SELECT * FROM application_forms WHERE guild_id = ? ORDER BY created_at DESC',
      [getSelectedGuildId(req)]
    );
    res.render('form_list', { user: req.user, forms });
  });

  router.post('/dashboard/forms/create', isAuthenticated, isStaff, async (req, res) => {
    const title = req.body.title;
    if (!title || title.trim().length === 0) return res.redirect('/dashboard/forms');
  
    const [insert] = await db.execute(
      'INSERT INTO application_forms (guild_id, title) VALUES (?, ?)',
      [getSelectedGuildId(req), title.trim()]
    );
  
    res.redirect(`/dashboard/forms/${insert.insertId}`);
  });

  router.post('/dashboard/forms/:formId/add-question', isAuthenticated, isStaff, async (req, res) => {
    const formId = req.params.formId;
    const question = req.body.question;
  
    const [rows] = await db.execute(
      'SELECT MAX(position) AS max FROM application_questions WHERE form_id = ?',
      [formId]
    );
    const position = (rows[0]?.max || 0) + 1;
  
    await db.execute(
      'INSERT INTO application_questions (form_id, question, position) VALUES (?, ?, ?)',
      [formId, question.trim(), position]
    );
  
    res.redirect(`/dashboard/forms/${formId}`);
  });

  router.post('/dashboard/forms/:formId/delete-question', isAuthenticated, isStaff, async (req, res) => {
    const { formId } = req.params;
    const { id } = req.body;
  
    await db.execute('DELETE FROM application_questions WHERE id = ? AND form_id = ?', [id, formId]);
    res.redirect(`/dashboard/forms/${formId}`);
  });

  router.post('/dashboard/forms/:formId/reorder-questions', isAuthenticated, isStaff, async (req, res) => {
    const { formId } = req.params;
    const updates = req.body.order;
  
    const promises = updates.map(({ id, position }) =>
      db.execute(
        'UPDATE application_questions SET position = ? WHERE id = ? AND form_id = ?',
        [position, id, formId]
      )
    );
  
    try {
      await Promise.all(promises);
      res.sendStatus(200);
    } catch (err) {
      console.error('❌ Error updating positions:', err);
      res.sendStatus(500);
    }
  });  

  router.post('/dashboard/forms/:formId/delete', isAuthenticated, isStaff, async (req, res) => {
    const { formId } = req.params;
  
    try {
      await db.execute(
        'DELETE FROM application_forms WHERE id = ? AND guild_id = ?',
        [formId, getSelectedGuildId(req)]
      );
      res.redirect('/dashboard');
    } catch (err) {
      console.error('❌ Failed to delete form:', err);
      res.status(500).send('Failed to delete form.');
    }
  });  

// List all applications
router.get('/applications', isAuthenticated, isStaff, async (req, res) => {
    const [apps] = await db.execute(
      'SELECT id, username, ai_score, created_at, application_status FROM applications WHERE guild_id = ? ORDER BY created_at DESC',
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
