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
        if (createErr) {
            console.error('Chyba při vytváření tabulky users:', createErr.message);
        } else {
            console.log('Tabulka users je připravena v PostgreSQL.');
        }

        // Vytvoření tabulky notes
        client.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                note_code VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `, (createNotesErr, notesRes) => {
            if (createNotesErr) {
                console.error('Chyba při vytváření tabulky notes:', createNotesErr.message);
            } else {
                console.log('Tabulka notes je připravena v PostgreSQL.');
            }

            // NOVÁ ČÁST, KTERÁ CHYBĚLA: Vytvoření tabulky messages
            client.query(`
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `, (createMessagesErr, messagesRes) => {
                done(); // Důležité: uvolněte klienta po všech operacích
                if (createMessagesErr) {
                    console.error('Chyba při vytváření tabulky messages:', createMessagesErr.message);
                } else {
                    console.log('Tabulka messages je připravena v PostgreSQL.');
                }
            });
        });
    });
});

module.exports = pool;