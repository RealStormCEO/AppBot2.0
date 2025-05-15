require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('./auth/discord');
const routes = require('./routes');

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

app.use('/', routes);

app.listen(3000, () => console.log('🌐 Web app listening on http://localhost:3000'));
