const jwt = require('jsonwebtoken');
const pool = require('../database'); // Import PostgreSQL poolu

const auth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Místo User.findById použijeme pool.query pro PostgreSQL
      const userResult = await pool.query(
        'SELECT id, username FROM users WHERE id = $1',
        [decoded.id]
      );
      const user = userResult.rows[0];

      if (!user) {
        return res.status(401).json({ message: 'Uživatel nenalezen, neautorizovaný přístup.' });
      }

      req.user = user; // Přidáme uživatele do requestu
      next(); // Pokračujeme na další middleware/routě
    } catch (error) {
      console.error("Chyba při ověřování tokenu nebo načítání uživatele z DB:", error);
      res.status(401).json({ message: 'Neautorizovaný přístup, token selhal nebo vypršel.' });
    }
  } else {
    res.status(401).json({ message: 'Neautorizovaný přístup, žádný token.' });
  }
};

module.exports = auth;