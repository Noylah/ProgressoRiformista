const SUPABASE_URL = 'https://ljqyjqgjeloceimeiayr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcXlqcWdqZWxvY2VpbWVpYXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjAxNTMsImV4cCI6MjA4Mzc5NjE1M30.dNvhvad9_mR64RqeNZyu4X_GdxSOFz23TuiLt33GXxk';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_AUTORIZZATO = 'Zicli'; 

(async function protezioneTotale() {
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    if (sessionError || !session) {
        window.location.replace('login.html');
        return;
    }
    try {
        const usernameDaCercare = session.user.email.split('@')[0];
        const { data: profilo, error: dbError } = await _supabase
            .from('staff_users')
            .select('permessi')
            .eq('username', usernameDaCercare) 
            .single();

        if (dbError || !profilo) {
            window.location.replace('login.html');
            return;
        }

        const paginaCorrente = window.location.pathname.split('/').pop() || 'index.html';
        const mappePermessi = { 
            'proposte.html': 'P',
            'staff.html': 'C',    
            'riunioni.html': 'R', 
            'bilancio.html': 'E',
            'notizie.html': 'N',
            'credenziali.html': 'A',
            'gestioneproposte.html': 'G'
        };
        
        const letteraNecessaria = mappePermessi[paginaCorrente];
        if (letteraNecessaria && !profilo.permessi.includes(letteraNecessaria)) {
            window.location.replace('staff.html');
            return;
        }

        sessionStorage.setItem('loggedUser', usernameDaCercare);
        sessionStorage.setItem('userPermessi', profilo.permessi);
        document.body.style.visibility = "visible";
        document.body.style.opacity = "1";
        
        inizializzaCredenziali();
    } catch (err) {
        window.location.replace('login.html');
    }
})();

async function inizializzaCredenziali() {
    const sessionUser = sessionStorage.getItem('loggedUser'); 
    const permessi = sessionStorage.getItem('userPermessi') || "";

    if (sessionUser === ADMIN_AUTORIZZATO || permessi.includes('A')) {
        fetchUtenti();
        gestisciMenuLaterale();
    } else {
        await inviaLog("Sicurezza: Accesso negato", "Tentativo accesso non autorizzato a Credenziali");
        window.location.href = 'staff.html';
    }
}

async function fetchUtenti() {
    const { data, error } = await _supabase.from('staff_users').select('*').order('username');
    if (error) return;

    const tbody = document.getElementById('credenziali-data-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    data.forEach(u => {
        const p = u.permessi || "";
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <input type="text" value="${u.username}" class="minimal-input" 
                    style="background:transparent; border:none; color:#32a2e0; font-weight:bold; width:100%;" 
                    onchange="aggiornaUsername(${u.id}, this.value, '${u.username}')">
            </td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                    ${creaBottone(u.id, 'P', p.includes('P'), 'Proposte Personali', u.username)}
                    ${creaBottone(u.id, 'G', p.includes('G'), 'Gestione Proposte', u.username)}
                    ${creaBottone(u.id, 'C', p.includes('C'), 'Consiglieri', u.username)}
                    ${creaBottone(u.id, 'R', p.includes('R'), 'Riunioni', u.username)}
                    ${creaBottone(u.id, 'E', p.includes('E'), 'Economia', u.username)}
                    ${creaBottone(u.id, 'N', p.includes('N'), 'Notizie', u.username)} 
                    ${creaBottone(u.id, 'A', p.includes('A'), 'Admin / Credenziali', u.username)}
                </div>
            </td>
            <td style="text-align: right;">
                <button class="btn-action-dash delete" onclick="rimuoviPermessi(${u.id}, '${u.username}')">
                    ELIMINA
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }); 
}

function creaBottone(userId, lettera, attivo, label, username) {
    const stileBase = `width: 35px; height: 35px; border-radius: 6px; cursor: pointer; font-weight: 800; border: 1px solid; transition: all 0.2s;`;
    const stileStato = attivo 
        ? `background: #32a2e0; color: #1a1a1a; border-color: #32a2e0;` 
        : `background: transparent; color: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.1);`;
    
    return `<button title="${label}" onclick="togglePermesso(${userId}, '${lettera}', '${username}')" style="${stileBase} ${stileStato}">${lettera}</button>`;
}

async function togglePermesso(id, lettera, username) {
    const { data } = await _supabase.from('staff_users').select('permessi').eq('id', id).single();
    let p = data.permessi || "";
    p = p.includes(lettera) ? p.replace(lettera, "") : p + lettera;
    
    const { error } = await _supabase.from('staff_users').update({ permessi: p }).eq('id', id);
    if (!error) {
        await inviaLog("Sicurezza: Permessi modificati", `Utente: ${username} | ${lettera} -> ${p.includes(lettera) ? 'ON' : 'OFF'}`);
        fetchUtenti();
    }
}

function gestisciMenuLaterale() {
    const permessi = sessionStorage.getItem('userPermessi') || "";
    const sessionUser = sessionStorage.getItem('loggedUser');
    const mappe = { 
        'proposte.html': 'P', 
        'gestioneproposte.html': 'G',
        'staff.html': 'C', 
        'riunioni.html': 'R', 
        'bilancio.html': 'E', 
        'notizie.html': 'N',
        'credenziali.html': 'A' 
    };

    document.querySelectorAll('.panel-link').forEach(link => {
        const href = link.getAttribute('href');
        const letteraNecessaria = mappe[href];
        if (sessionUser !== ADMIN_AUTORIZZATO && letteraNecessaria && !permessi.includes(letteraNecessaria)) {
            link.style.display = 'none';
        }
    });
}

function toggleUserForm() {
    const container = document.getElementById('userFormContainer');
    if (container) container.style.display = (container.style.display === 'none') ? 'block' : 'none';
}

async function creaAccount() {
    const user = document.getElementById('newUsername').value.trim();
    if (!user) return;
    const { error } = await _supabase.from('staff_users').insert([{ username: user, permessi: 'P' }]); 
    if (!error) {
        await inviaLog("Sicurezza: Nuovo account", `User: ${user}`);
        document.getElementById('newUsername').value = '';
        toggleUserForm();
        fetchUtenti();
    }
}

async function aggiornaUsername(id, nuovoNome, vecchioNome) {
    if (!nuovoNome.trim()) return fetchUtenti();
    const { error } = await _supabase.from('staff_users').update({ username: nuovoNome.trim() }).eq('id', id);
    if (!error) await inviaLog("Sicurezza: Username modificato", `${vecchioNome} -> ${nuovoNome}`);
    fetchUtenti();
}

async function rimuoviPermessi(id, username) {
    if (username === ADMIN_AUTORIZZATO) return;
    if (!confirm(`Rimuovere definitivamente l'account di ${username}?`)) return;
    const { error } = await _supabase.from('staff_users').delete().eq('id', id);
    if (!error) {
        await inviaLog("Sicurezza: Account rimosso", `User: ${username}`);
        fetchUtenti();
    }
}

async function inviaLog(azione, dettagli = "") {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const username = session?.user?.email ? session.user.email.split('@')[0].toUpperCase() : "SISTEMA";
        const messaggioFormattato = `🦅 *Progresso Riformista*\nɴᴜᴏᴠᴏ ʟᴏɢ ꜱɪᴛᴏ\n\n👤 ᴏᴘᴇʀᴀᴛᴏʀᴇ: ${username}\n📝 ᴀᴢɪᴏɴᴇ: ${azione}\n\n📖 ᴅᴇᴛᴛᴀɢʟɪ: ${dettagli}`;
        await _supabase.functions.invoke('send-telegram-messaggio', {
            body: { messaggio: messaggioFormattato }
        });
    } catch (err) { console.error(err); }
}

function logout() {
    _supabase.auth.signOut().then(() => {
        sessionStorage.clear();
        window.location.replace('login.html');
    });
}