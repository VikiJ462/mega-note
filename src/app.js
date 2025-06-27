require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Připojení k MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Připojeno k MongoDB!'))
  .catch(err => console.error('Chyba při připojování k MongoDB:', err));

// Middleware
app.use(cors());
app.use(express.json()); // Pro parsování JSON požadavků
app.use(express.static(path.join(__dirname, '../public'))); // Servírování statických souborů

// Routy
app.use('/api', routes);

// Catch-all pro SPAs
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});