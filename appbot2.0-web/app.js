require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('./auth/discord');
const routes = require('./routes');
const db = require('./database/db');
const developerRoutes = require('./developer/index');

const app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 Day
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' // true if HTTPS
    }
  }));  
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Add this after session middleware
  app.use(async (req, res, next) => {
    if (req.isAuthenticated?.() && req.user) {
      try {
        const [rows] = await db.execute('SELECT user_id FROM dev_panel_users');
        res.locals.showDevPanel = rows.some(row => row.user_id === req.user.id);
      } catch (err) {
        console.error('❌ Failed to check dev access:', err);
        res.locals.showDevPanel = false;
      }
    } else {
      res.locals.showDevPanel = false;
    }
    next();
  });

app.use('/developer', developerRoutes);

app.use('/', routes);

app.listen(3000, () => console.log('🌐 Web app listening on http://localhost:3000'));
