const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Chyba: Proměnná prostředí DATABASE_URL není nastavena!');
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false // Důležité pro Render a Neon.tech
    }
});

pool.connect((err, client, done) => {
    if (err) {
        console.error('Chyba při připojování k PostgreSQL:', err.message);
        return;
    }
    console.log('Připojeno k PostgreSQL databázi!');

    client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        );
    `, (createErr, res) => {
        done();
        if (createErr) {
            console.error('Chyba při vytváření tabulky users:', createErr.message);
        } else {
            console.log('Tabulka users je připravena v PostgreSQL.');
        }
    });
});

module.exports = pool;