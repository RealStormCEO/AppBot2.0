const express = require('express');
const router = express.Router();
const db = require('../database/db');

async function isDevUser(req, res, next) {
    if (!req.user) {
      return res.redirect('/login'); // or return res.status(401).send('❌ Not logged in.')
    }
  
    const [devs] = await db.execute('SELECT user_id FROM dev_panel_users');
    const devIds = devs.map(row => row.user_id);
  
    if (devIds.includes(req.user.id)) {
      return next();
    }
  
    return res.status(403).send('❌ Not authorized.');
  }  

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

module.exports = router;
