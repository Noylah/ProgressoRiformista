const SUPABASE_URL = 'https://ljqyjqgjeloceimeiayr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcXlqcWdqZWxvY2VpbWVpYXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjAxNTMsImV4cCI6MjA4Mzc5NjE1M30.dNvhvad9_mR64RqeNZyu4X_GdxSOFz23TuiLt33GXxk';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function inviaLog(messaggio, utente = "Sistema", descrizione = "") {
    try {
        await _supabase.functions.invoke('send-telegram-messaggio', {
            body: { messaggio, utente, descrizione }
        });
    } catch (err) {
        console.error("Errore log:", err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();
    const errorDisplay = document.getElementById('errorMessage');

    errorDisplay.style.display = "none";

    try {
        const emailFinta = `${usernameInput}@pactum.it`;

        const { data: authData, error: authError } = await _supabase.auth.signInWithPassword({
            email: emailFinta,
            password: passwordInput
        });

        if (authError) {
            inviaLog("Sicurezza: Login fallito", usernameInput, "Credenziali errate");
            errorDisplay.innerText = "Username o Password errati.";
            errorDisplay.style.display = "block";
            return;
        }

        const { data: userData, error: userError } = await _supabase
            .from('staff_users')
            .select('username, permessi')
            .eq('username', usernameInput)
            .maybeSingle();

        if (userError || !userData) {
            inviaLog("Sicurezza: Login bloccato", usernameInput, "Utente autenticato ma non presente in staff_users");
            errorDisplay.innerText = "Profilo non trovato nel database staff.";
            errorDisplay.style.display = "block";
            return;
        }

        sessionStorage.setItem('staffAccess', 'true');
        sessionStorage.setItem('loggedUser', userData.username);
        sessionStorage.setItem('userPermessi', userData.permessi || "");

        inviaLog("Sistema: Login effettuato", userData.username, `Permessi: ${userData.permessi || "Nessuno"}`);

        const p = userData.permessi || "";
        if (userData.username === 'Zicli' || p.includes('C')) {
            window.location.replace('staff.html');
        } else if (p.includes('R')) {
            window.location.replace('riunioni.html');
        } else if (p.includes('E')) {
            window.location.replace('bilancio.html');
        } else if (p.includes('N')) {
            window.location.replace('notizie.html');
        } else if (p.includes('A')) {
            window.location.replace('credenziali.html');
        } else if (p.includes('N')) {
            window.location.replace('notizie.html');
        } else if (p.includes('P')) {
            window.location.replace('proposte.html');
        } else if (p.includes('G')) {
            window.location.replace('gestioneproposte.html');
        } else {
            errorDisplay.innerText = "Account senza permessi di accesso.";
            errorDisplay.style.display = "block";
        }

    } catch (err) {
        console.error("Errore imprevisto:", err);
        errorDisplay.innerText = "Connessione fallita.";
        errorDisplay.style.display = "block";
    }
}