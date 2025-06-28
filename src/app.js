const express = require('express');
const bcrypt = require('bcryptjs'); // Ačkoliv se přímo nepoužívá zde po refaktoringu, je dobré ho mít
const jwt = require('jsonwebtoken'); // Ačkoliv se přímo nepoužívá zde po refaktoringu, je dobré ho mít
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const pool = require('./database');
const apiRoutes = require('./routes/index'); // <--- OPRAVENÁ CESTA: Importuje router ze src/routes/index.js

const app = express();
app.use(express.json());
app.use(cors());

// Podávání statických souborů (frontend)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Použití API routeru z index.js s prefixem /api
app.use('/api', apiRoutes);

// Spuštění serveru
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server běží na portu ${PORT}`);
});