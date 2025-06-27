document.addEventListener('DOMContentLoaded', () => {
    // Navigační prvky
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Sekce
    const registerSection = document.getElementById('registerSection');
    const loginSection = document.getElementById('loginSection');
    const userDashboard = document.getElementById('userDashboard');
    const sendMessageSection = document.getElementById('sendMessageSection');
    const viewMessagesSection = document.getElementById('viewMessagesSection');

    // Formuláře a zprávy
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const sendMessageForm = document.getElementById('sendMessageForm');

    const registerMessage = document.getElementById('registerMessage');
    const loginMessage = document.getElementById('loginMessage');
    const generatedNoteLink = document.getElementById('generatedNoteLink');
    const sendMessageMessage = document.getElementById('sendMessageMessage');
    const viewMessagesMessage = document.getElementById('viewMessagesMessage');

    // Ostatní prvky
    const welcomeUsername = document.getElementById('welcomeUsername');
    const generateNoteBtn = document.getElementById('generateNoteBtn');
    const userNotesList = document.getElementById('userNotesList');
    const currentNoteCode = document.getElementById('currentNoteCode');
    const messageContent = document.getElementById('messageContent');
    const messagesContainer = document.getElementById('messagesContainer');
    const viewMessagesNoteCodeSpan = document.getElementById('viewMessagesNoteCode');

    let currentNoteCodeForSending = null;

    // --- Funkce pro zobrazení/skrytí sekcí ---
    function showSection(sectionToShow) {
        const sections = [registerSection, loginSection, userDashboard, sendMessageSection, viewMessagesSection];
        sections.forEach(section => {
            section.style.display = 'none';
        });
        sectionToShow.style.display = 'block';
    }

    function updateNavButtons() {
        const token = localStorage.getItem('token');
        if (token) {
            showRegisterBtn.style.display = 'none';
            showLoginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            showSection(userDashboard);
            const username = localStorage.getItem('username');
            if (username) {
                welcomeUsername.textContent = username;
            }
            fetchUserNotes();
        } else {
            showRegisterBtn.style.display = 'block';
            showLoginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            showSection(loginSection); // Defaultní zobrazení pro nepřihlášené
        }
    }

    // --- Autentizace ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                registerMessage.className = 'message success';
                registerMessage.textContent = data.message;
                registerForm.reset();
                setTimeout(() => {
                    showSection(loginSection); // Po registraci přesměrovat na přihlášení
                    registerMessage.textContent = '';
                }, 2000);
            } else {
                registerMessage.className = 'message error';
                registerMessage.textContent = data.message || 'Chyba při registraci.';
            }
        } catch (error) {
            registerMessage.className = 'message error';
            registerMessage.textContent = 'Došlo k chybě sítě.';
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                loginMessage.className = 'message success';
                loginMessage.textContent = 'Přihlášení úspěšné!';
                loginForm.reset();
                updateNavButtons();
            } else {
                loginMessage.className = 'message error';
                loginMessage.textContent = data.message || 'Chyba při přihlášení.';
            }
        } catch (error) {
            loginMessage.className = 'message error';
            loginMessage.textContent = 'Došlo k chybě sítě.';
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        updateNavButtons();
        generatedNoteLink.textContent = '';
        userNotesList.innerHTML = '';
        showSection(loginSection);
    });

    // --- Generování a správa poznámek ---
    generateNoteBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            generatedNoteLink.className = 'message error';
            generatedNoteLink.textContent = 'Nejste přihlášeni.';
            return;
        }

        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (res.ok) {
                const noteUrl = `${window.location.origin}/?note=${data.noteCode}`;
                generatedNoteLink.className = 'message success';
                generatedNoteLink.innerHTML = `Váš nový odkaz: <a href="${noteUrl}" target="_blank">${noteUrl}</a>`;
                fetchUserNotes(); // Aktualizovat seznam poznámek
            } else {
                generatedNoteLink.className = 'message error';
                generatedNoteLink.textContent = data.message || 'Chyba při generování odkazu.';
            }
        } catch (error) {
            generatedNoteLink.className = 'message error';
            generatedNoteLink.textContent = 'Došlo k chybě sítě.';
        }
    });

    async function fetchUserNotes() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch('/api/notes', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const notes = await res.json();
            if (res.ok) {
                userNotesList.innerHTML = '';
                if (notes.length === 0) {
                    userNotesList.innerHTML = '<li>Zatím nemáte žádné poznámky.</li>';
                    return;
                }
                notes.forEach(note => {
                    const listItem = document.createElement('li');
                    const noteUrl = `${window.location.origin}/?note=${note.noteCode}`;
                    listItem.innerHTML = `
                        <a href="${noteUrl}" target="_blank">${note.noteCode}</a>
                        <span> (Vytvořeno: ${new Date(note.createdAt).toLocaleDateString()}) </span>
                        <button class="view-messages-btn" data-note-code="${note.noteCode}">Zobrazit zprávy</button>
                    `;
                    userNotesList.appendChild(listItem);
                });

                document.querySelectorAll('.view-messages-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const noteCode = e.target.dataset.noteCode;
                        displayNoteMessages(noteCode);
                    });
                });

            } else {
                userNotesList.innerHTML = `<li class="error">${notes.message || 'Chyba při načítání poznámek.'}</li>`;
            }
        } catch (error) {
            userNotesList.innerHTML = `<li class="error">Došlo k chybě sítě při načítání poznámek.</li>`;
        }
    }

    // --- Posílání zpráv ---
    sendMessageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = messageContent.value;

        if (!currentNoteCodeForSending) {
            sendMessageMessage.className = 'message error';
            sendMessageMessage.textContent = 'Není vybrán žádný odkaz pro odeslání zprávy.';
            return;
        }

        try {
            const res = await fetch(`/api/notes/${currentNoteCodeForSending}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            const data = await res.json();
            if (res.ok) {
                sendMessageMessage.className = 'message success';
                sendMessageMessage.textContent = data.message;
                messageContent.value = ''; // Vyčistit textarea
                // Pokud je uživatel majitelem poznámky a je na stránce zpráv, aktualizujeme je
                if (localStorage.getItem('token') && viewMessagesSection.style.display === 'block' && viewMessagesNoteCodeSpan.textContent === currentNoteCodeForSending) {
                     displayNoteMessages(currentNoteCodeForSending);
                }
            } else {
                sendMessageMessage.className = 'message error';
                sendMessageMessage.textContent = data.message || 'Chyba při odesílání zprávy.';
            }
        } catch (error) {
            sendMessageMessage.className = 'message error';
            sendMessageMessage.textContent = 'Došlo k chybě sítě.';
        }
    });

    // --- Zobrazení zpráv pro majitele poznámky ---
    async function displayNoteMessages(noteCode) {
        showSection(viewMessagesSection);
        viewMessagesNoteCodeSpan.textContent = noteCode;
        messagesContainer.innerHTML = ''; // Vyčistit před načtením nových

        const token = localStorage.getItem('token');
        if (!token) {
            viewMessagesMessage.className = 'message error';
            viewMessagesMessage.textContent = 'Pro zobrazení zpráv se musíte přihlásit.';
            return;
        }

        try {
            const res = await fetch(`/api/notes/${noteCode}/messages`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const messages = await res.json();
            if (res.ok) {
                if (messages.length === 0) {
                    messagesContainer.innerHTML = '<p>Zatím žádné zprávy.</p>';
                    return;
                }
                messages.forEach(msg => {
                    const messageItem = document.createElement('div');
                    messageItem.classList.add('message-item');
                    messageItem.innerHTML = `
                        <p>${msg.content}</p>
                        <small>${new Date(msg.createdAt).toLocaleString()}</small>
                    `;
                    messagesContainer.appendChild(messageItem);
                });
                viewMessagesMessage.textContent = '';
            } else {
                viewMessagesMessage.className = 'message error';
                viewMessagesMessage.textContent = messages.message || 'Chyba při načítání zpráv.';
            }
        } catch (error) {
            viewMessagesMessage.className = 'message error';
            viewMessagesMessage.textContent = 'Došlo k chybě sítě při načítání zpráv.';
        }
    }


    // --- Inicializace na základě URL a přihlášení ---
    const urlParams = new URLSearchParams(window.location.search);
    const noteCodeParam = urlParams.get('note');

    if (noteCodeParam) {
        currentNoteCodeForSending = noteCodeParam;
        currentNoteCode.textContent = noteCodeParam;
        showSection(sendMessageSection);
    } else {
        updateNavButtons(); // Zobrazí buď login, nebo dashboard
    }

    // Navigace
    showRegisterBtn.addEventListener('click', () => {
        showSection(registerSection);
        registerMessage.textContent = '';
    });
    showLoginBtn.addEventListener('click', () => {
        showSection(loginSection);
        loginMessage.textContent = '';
    });
});