const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config(); // Pro načtení JWT_SECRET z .env souboru lokálně (na Renderu to bude z Environment Variables)

// Import PostgreSQL poolu
// Ujistěte se, že soubor src/database.js existuje s kódem pro PostgreSQL připojení.
const pool = require('./database');

const app = express();
app.use(express.json());

// Podávání statických souborů (frontend)
// Předpokládá, že vaše statické soubory jsou ve složce 'public' v kořenovém adresáři projektu
app.use(express.static(path.join(__dirname, '..', 'public')));

// Registrační routa
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Uživatelské jméno a heslo jsou povinné.' });
        }

        // Hledání existujícího uživatele v databázi PostgreSQL
        // Používá pool.query pro SQL dotaz
        const checkUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (checkUser.rows.length > 0) {
            return res.status(409).json({ message: 'Uživatelské jméno již existuje.' });
        }

        // Hashování hesla pomocí bcryptjs
        const hashedPassword = await bcrypt.hash(password, 10);

        // Vložení nového uživatele do tabulky 'users'
        // 'RETURNING id, username' vrátí ID a uživatelské jméno nově vloženého řádku
        const insertUser = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );
        const newUser = insertUser.rows[0]; // Nově vytvořený uživatel

        // Generování JWT tokenu
        // JWT_SECRET musí být nastaveno jako Environment Variable na Renderu (nebo v .env lokálně)
        const token = jwt.sign({ id: newUser.id, username: newUser.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ message: 'Uživatel úspěšně registrován.', token });

    } catch (error) {
        // Záznam chyby pro ladění
        console.error('Neočekávaná chyba při registraci:', error);
        res.status(500).json({ message: 'Chyba serveru při registraci.' });
    }
});

// Přihlašovací routa
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Uživatelské jméno a heslo jsou povinné.' });
        }

        // Hledání uživatele v databázi PostgreSQL
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = userResult.rows[0]; // Získání prvního řádku (uživatele)

        if (!user) {
            return res.status(401).json({ message: 'Neplatné uživatelské jméno nebo heslo.' });
        }

        // Porovnání zadaného hesla s hashovaným heslem z databáze
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Neplatné uživatelské jméno nebo heslo.' });
        }

        // Generování JWT tokenu
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: 'Přihlášení úspěšné.', token });

    } catch (error) {
        // Záznam chyby pro ladění
        console.error('Neočekávaná chyba při přihlášení:', error);
        res.status(500).json({ message: 'Chyba serveru.' });
    }
});

// Spuštění serveru
// Render poskytuje port v proměnné prostředí PORT
const PORT = process.env.PORT || 10000; // Použijte port od Renderu nebo 10000 lokálně
app.listen(PORT, () => {
    console.log(`Server běží na portu ${PORT}`);
});