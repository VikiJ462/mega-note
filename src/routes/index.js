const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth'); // <--- OPRAVENÁ CESTA: Z routes do middleware
const { v4: uuidv4 } = require('uuid');
const pool = require('../database'); // <--- OPRAVENÁ CESTA: Z routes do database

const router = express.Router();

// --- Autentizace ---
// POZNÁMKA: Tyto routy stále používají Mongoose logiku a budou muset být přepsány pro PostgreSQL!

// Registrace uživatele
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const User = require('../models/User'); // <--- OPRAVENÁ CESTA: Z routes do models
    const user = new User({ username, password });
    await user.save();
    res.status(201).json({ message: 'Uživatel úspěšně registrován!' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Uživatelské jméno již existuje.' });
    }
    console.error('Chyba při registraci uživatele (Mongoose logika):', error);
    res.status(500).json({ message: 'Chyba při registraci uživatele.', error: error.message });
  }
});

// Přihlášení uživatele
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const User = require('../models/User'); // <--- OPRAVENÁ CESTA
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Neplatné uživatelské jméno nebo heslo.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Neplatné uživatelské jméno nebo heslo.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Chyba při přihlašování (Mongoose logika):', error);
    res.status(500).json({ message: 'Chyba při přihlašování.', error: error.message });
  }
});

// --- Poznámky (Mega Note) ---

// Generování nového odkazu (poznámky) - vyžaduje autentizaci
router.post('/notes', auth, async (req, res) => {
  try {
    // POZNÁMKA: Auth middleware (auth.js) také potřebuje být přepsán pro PostgreSQL
    // v auth.js: `req.user = await User.findById(decoded.id).select('-password');`
    // musí být změněno na `req.user = (await pool.query('SELECT id, username FROM users WHERE id = $1', [decoded.id])).rows[0];`
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

// Získání všech poznámek uživatele - vyžaduje autentizaci
// TATO LOGIKA POTŘEBUJE BÝT PŘEPSÁNA PRO PostgreSQL!
router.get('/notes', auth, async (req, res) => {
  try {
    const Note = require('../models/Note'); // <--- OPRAVENÁ CESTA
    const notes = await Note.find({ userId: req.user.id }).select('noteCode createdAt');
    res.json(notes);
  } catch (error) {
    console.error('Chyba při načítání poznámek (Mongoose logika):', error);
    res.status(500).json({ message: 'Chyba při načítání poznámek.', error: error.message });
  }
});

// Získání konkrétní poznámky (pro odesílatele a majitele)
// TATO LOGIKA POTŘEBUJE BÝT PŘEPSÁNA PRO PostgreSQL!
router.get('/notes/:noteCode', async (req, res) => {
  try {
    const Note = require('../models/Note'); // <--- OPRAVENÁ CESTA
    const note = await Note.findOne({ noteCode: req.params.noteCode });
    if (!note) {
      return res.status(404).json({ message: 'Poznámka nenalezena.' });
    }
    if (req.user && note.userId.toString() === req.user.id) {
        return res.json({ noteCode: note.noteCode, messages: note.messages });
    }
    res.json({ noteCode: note.noteCode });
  } catch (error) {
    console.error('Chyba při načítání poznámky (Mongoose logika):', error);
    res.status(500).json({ message: 'Chyba při načítání poznámky.', error: error.message });
  }
});

// Posílání zpráv na daný odkaz
// TATO LOGIKA POTŘEBUJE BÝT PŘEPSÁNA PRO PostgreSQL!
router.post('/notes/:noteCode/messages', async (req, res) => {
  const { content } = req.body;
  try {
    const Note = require('../models/Note'); // <--- OPRAVENÁ CESTA
    const note = await Note.findOne({ noteCode: req.params.noteCode });
    if (!note) {
      return res.status(404).json({ message: 'Poznámka nenalezena.' });
    }

    note.messages.push({ content });
    await note.save();
    res.status(201).json({ message: 'Zpráva úspěšně odeslána!' });
  } catch (error) {
    console.error('Chyba při odesílání zprávy (Mongoose logika):', error);
    res.status(500).json({ message: 'Chyba při odesílání zprávy.', error: error.message });
  }
});

// Získání zpráv pro konkrétní poznámku (pouze pro majitele poznámky)
// TATO LOGIKA POTŘEBUJE BÝT PŘEPSÁNA PRO PostgreSQL!
router.get('/notes/:noteCode/messages', auth, async (req, res) => {
    try {
        const Note = require('../models/Note'); // <--- OPRAVENÁ CESTA
        const note = await Note.findOne({ noteCode: req.params.noteCode });
        if (!note) {
            return res.status(404).json({ message: 'Poznámka nenalezena.' });
        }
        if (note.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Nemáte oprávnění k zobrazení těchto zpráv.' });
        }
        res.json(note.messages);
    } catch (error) {
        console.error('Chyba při načítání zpráv (Mongoose logika):', error);
        res.status(500).json({ message: 'Chyba při načítání zpráv.', error: error.message });
    }
});


module.exports = router;