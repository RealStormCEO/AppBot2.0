const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: '3306',
  user: 'root',
  password: '', // or your actual password
  database: 'appbot2c_application_bot'
});

module.exports = pool;
