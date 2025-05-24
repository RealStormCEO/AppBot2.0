const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'db1.tech2you.co.nz',
  user: 'root',
  password: 'qhxcNj5JoU', // your actual password if any
  database: 'appbot2c_application_bot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
