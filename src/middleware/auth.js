const jwt = require('jsonwebtoken');
const pool = require('../database'); // Importujte pool pro PostgreSQL

const auth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Místo User.findById(decoded.id) použijte pool.query pro PostgreSQL
      const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [decoded.id]);
      const user = userResult.rows[0];

      if (!user) {
        throw new Error('Uživatel nenalezen.');
      }

      req.user = user; // Nyní req.user má id a username z PostgreSQL
      next();
    } catch (error) {
      console.error('Chyba ověření tokenu:', error.message); // Logujte chybu pro ladění
      res.status(401).json({ message: 'Neautorizovaný přístup, token selhal nebo uživatel nenalezen.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Neautorizovaný přístup, žádný token.' });
  }
};

module.exports = auth;