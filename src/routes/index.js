const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // PŘIDEJTE TENTO ŘÁDEK pro hashování hesel
const auth = require('../middleware/auth'); // Cesta je správná: Z routes do middleware
const { v4: uuidv4 } = require('uuid');
const pool = require('../database'); // Cesta je správná: Z routes do database

const router = express.Router();

// --- Autentizace ---

// Registrace uživatele (PŘEPSÁNO PRO PostgreSQL)
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Zkontrolujeme, zda uživatel již existuje
    const checkUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: 'Uživatelské jméno již existuje.' });
    }

    // Hashování hesla
    const hashedPassword = await bcrypt.hash(password, 10);

    // Vložení nového uživatele do PostgreSQL
    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    res.status(201).json({ message: 'Uživatel úspěšně registrován!' });
  } catch (error) {
    console.error('Chyba při registraci uživatele (PostgreSQL):', error);
    res.status(500).json({ message: 'Chyba při registraci uživatele.', error: error.message });
  }
});

// Přihlášení uživatele (PŘEPSÁNO PRO PostgreSQL)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Najdeme uživatele podle uživatelského jména
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Neplatné uživatelské jméno nebo heslo.' });
    }

    // Porovnáme zadané heslo s hashovaným heslem z DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Neplatné uživatelské jméno nebo heslo.' });
    }

    // Generujeme JWT token. Důležité: do tokenu dáváme user.id z PostgreSQL!
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Chyba při přihlašování (PostgreSQL):', error);
    res.status(500).json({ message: 'Chyba při přihlašování.', error: error.message });
  }
});

// --- Poznámky (Mega Note) ---

// Generování nového odkazu (poznámky) - již přepsáno pro PostgreSQL
router.post('/notes', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const noteCode = uuidv4();

    const result = await pool.query(
      'INSERT INTO notes (user_id, note_code) VALUES ($1, $2) RETURNING id, note_code',
      [userId, noteCode]
    );
    const newNote = result.rows[0];

    res.status(201).json({ noteCode: newNote.note_code, message: 'Nový odkaz vygenerován!' });
  } catch (error) {
    console.error('Chyba při generování odkazu v PostgreSQL:', error);
    res.status(500).json({ message: 'Chyba při generování odkazu.', error: error.message });
  }
});

// Získání všech poznámek uživatele (PŘEPSÁNO PRO PostgreSQL)
router.get('/notes', auth, async (req, res) => {
  try {
    // Načteme poznámky pro přihlášeného uživatele
    const notesResult = await pool.query(
      'SELECT id, note_code, created_at FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(notesResult.rows);
  } catch (error) {
    console.error('Chyba při načítání poznámek (PostgreSQL):', error);
    res.status(500).json({ message: 'Chyba při načítání poznámek.', error: error.message });
  }
});

// Získání konkrétní poznámky (PŘEPSÁNO PRO PostgreSQL)
router.get('/notes/:noteCode', async (req, res) => {
  try {
    const noteCode = req.params.noteCode;
    const noteResult = await pool.query(
      'SELECT id, user_id, note_code, created_at FROM notes WHERE note_code = $1',
      [noteCode]
    );
    const note = noteResult.rows[0];

    if (!note) {
      return res.status(404).json({ message: 'Poznámka nenalezena.' });
    }

    // Pokud je uživatel autentizovaný a je majitelem poznámky, zobrazíme detaily (bez zpráv prozatím)
    // Důležité: req.user.id je z auth middleware, musí být typu number/integer
    // Porovnání user_id (z DB) a req.user.id (z tokenu)
    if (req.user && note.user_id === req.user.id) {
        // Zde by se načítaly i zprávy, pokud byste je měli v samostatné tabulce
        return res.json({ noteCode: note.note_code, owner: true /*, messages: [] */ });
    }
    // Pro neautentizované uživatele nebo ne-majitele zobrazíme jen, že odkaz existuje
    res.json({ noteCode: note.note_code, owner: false });
  } catch (error) {
    console.error('Chyba při načítání poznámky (PostgreSQL):', error);
    res.status(500).json({ message: 'Chyba při načítání poznámky.', error: error.message });
  }
});

// Posílání zpráv na daný odkaz (PŘEPSÁNO PRO PostgreSQL)
router.post('/notes/:noteCode/messages', async (req, res) => {
  const { content } = req.body;
  const noteCode = req.params.noteCode;
  try {
    // Najdeme ID poznámky podle noteCode
    const noteResult = await pool.query('SELECT id FROM notes WHERE note_code = $1', [noteCode]);
    const note = noteResult.rows[0];

    if (!note) {
      return res.status(404).json({ message: 'Poznámka nenalezena.' });
    }

    // Vložení zprávy do nové tabulky 'messages'
    // TATO FUNKČNOST VYŽADUJE NOVOU TABULKU 'messages' V PostgreSQL!
    await pool.query(
      'INSERT INTO messages (note_id, content) VALUES ($1, $2)',
      [note.id, content]
    );
    res.status(201).json({ message: 'Zpráva úspěšně odeslána!' });
  } catch (error) {
    console.error('Chyba při odesílání zprávy (PostgreSQL):', error);
    res.status(500).json({ message: 'Chyba při odesílání zprávy.', error: error.message });
  }
});

// Získání zpráv pro konkrétní poznámku (pouze pro majitele poznámky) (PŘEPSÁNO PRO PostgreSQL)
router.get('/notes/:noteCode/messages', auth, async (req, res) => {
    try {
        const noteCode = req.params.noteCode;
        const noteResult = await pool.query('SELECT id, user_id FROM notes WHERE note_code = $1', [noteCode]);
        const note = noteResult.rows[0];

        if (!note) {
            return res.status(404).json({ message: 'Poznámka nenalezena.' });
        }
        // Zkontrolujeme, zda je přihlášený uživatel majitelem poznámky
        if (note.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Nemáte oprávnění k zobrazení těchto zpráv.' });
        }

        // Načteme zprávy z nové tabulky 'messages'
        const messagesResult = await pool.query(
            'SELECT content, created_at FROM messages WHERE note_id = $1 ORDER BY created_at ASC',
            [note.id]
        );
        res.json(messagesResult.rows);
    } catch (error) {
        console.error('Chyba při načítání zpráv (PostgreSQL):', error);
        res.status(500).json({ message: 'Chyba při načítání zpráv.', error: error.message });
    }
});

module.exports = router;