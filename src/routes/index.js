const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Note = require('../models/Note');
const auth = require('../middleware/auth'); // Middleware pro ověření JWT tokenu

const router = express.Router();

// --- Autentizace ---

// Registrace uživatele
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new User({ username, password });
    await user.save();
    res.status(201).json({ message: 'Uživatel úspěšně registrován!' });
  } catch (error) {
    if (error.code === 11000) { // Duplicitní username
      return res.status(400).json({ message: 'Uživatelské jméno již existuje.' });
    }
    res.status(500).json({ message: 'Chyba při registraci uživatele.', error: error.message });
  }
});

// Přihlášení uživatele
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
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
    res.status(500).json({ message: 'Chyba při přihlašování.', error: error.message });
  }
});

// --- Poznámky (Mega Note) ---

// Generování nového odkazu (poznámky) - vyžaduje autentizaci
router.post('/notes', auth, async (req, res) => {
  try {
    const note = new Note({ userId: req.user.id });
    await note.save();
    res.status(201).json({ noteCode: note.noteCode, message: 'Nový odkaz vygenerován!' });
  } catch (error) {
    res.status(500).json({ message: 'Chyba při generování odkazu.', error: error.message });
  }
});

// Získání všech poznámek uživatele - vyžaduje autentizaci
router.get('/notes', auth, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).select('noteCode createdAt');
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Chyba při načítání poznámek.', error: error.message });
  }
});

// Získání konkrétní poznámky (pro odesílatele a majitele)
router.get('/notes/:noteCode', async (req, res) => {
  try {
    const note = await Note.findOne({ noteCode: req.params.noteCode });
    if (!note) {
      return res.status(404).json({ message: 'Poznámka nenalezena.' });
    }
    // Pokud je uživatel autentizovaný a je majitelem poznámky, zobrazíme i zprávy
    if (req.user && note.userId.toString() === req.user.id) {
        return res.json({ noteCode: note.noteCode, messages: note.messages });
    }
    // Pro neautentizované uživatele nebo ne-majitele zobrazíme jen, že odkaz existuje
    res.json({ noteCode: note.noteCode }); // Jen potvrzení, že odkaz existuje
  } catch (error) {
    res.status(500).json({ message: 'Chyba při načítání poznámky.', error: error.message });
  }
});


// Posílání zpráv na daný odkaz
router.post('/notes/:noteCode/messages', async (req, res) => {
  const { content } = req.body;
  try {
    const note = await Note.findOne({ noteCode: req.params.noteCode });
    if (!note) {
      return res.status(404).json({ message: 'Poznámka nenalezena.' });
    }

    note.messages.push({ content });
    await note.save();
    res.status(201).json({ message: 'Zpráva úspěšně odeslána!' });
  } catch (error) {
    res.status(500).json({ message: 'Chyba při odesílání zprávy.', error: error.message });
  }
});

// Získání zpráv pro konkrétní poznámku (pouze pro majitele poznámky)
router.get('/notes/:noteCode/messages', auth, async (req, res) => {
    try {
        const note = await Note.findOne({ noteCode: req.params.noteCode });
        if (!note) {
            return res.status(404).json({ message: 'Poznámka nenalezena.' });
        }
        if (note.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Nemáte oprávnění k zobrazení těchto zpráv.' });
        }
        res.json(note.messages);
    } catch (error) {
        res.status(500).json({ message: 'Chyba při načítání zpráv.', error: error.message });
    }
});


module.exports = router;