(function() {
    const isLogged = sessionStorage.getItem('staffAccess');
    if (isLogged !== 'true') {
        window.location.replace('login.html');
    }
})();

const SUPABASE_URL = 'https://ljqyjqgjeloceimeiayr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcXlqcWdqZWxvY2VpbWVpYXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjAxNTMsImV4cCI6MjA4Mzc5NjE1M30.dNvhvad9_mR64RqeNZyu4X_GdxSOFz23TuiLt33GXxk';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.closeModal = closeModal;
window.apriAnteprima = openDynamicModal;
let currentEditId = null;

(async function protezioneTotale() {
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    if (sessionError || !session) {
        window.location.replace('login.html');
        return;
    }
    try {
        const emailUtente = session.user.email;
        const usernameDaCercare = emailUtente.split('@')[0];
        const { data: profilo, error: dbError } = await _supabase
            .from('staff_users')
            .select('permessi')
            .eq('username', usernameDaCercare) 
            .single();
        if (dbError || !profilo) {
            window.location.replace('login.html');
            return;
        }
        if (!profilo.permessi.includes('N') && usernameDaCercare !== 'Zicli') {
            alert("Accesso negato: non hai i permessi per gestire le notizie.");
            window.location.replace('staff.html');
            return;
        }
        document.body.style.visibility = "visible";
        document.body.style.opacity = "1";
    } catch (err) {
        window.location.replace('login.html');
    }
})();

async function inviaLog(azione, dettagli = "") {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const username = session?.user?.email ? session.user.email.split('@')[0].toUpperCase() : "Sistema/Sconosciuto";

        const messaggioFormattato = `🦅 *Progresso Riformista*\nɴᴜᴏᴠᴏ ʟᴏɢ ꜱɪᴛᴏ\n\n👤 ᴏᴘᴇʀᴀᴛᴏʀᴇ: ${username}\n📝 ᴀᴢɪᴏɴᴇ: ${azione}\n\n📖 ᴅᴇᴛᴛᴀɢʟɪ: ${dettagli}`;

        await _supabase.functions.invoke('send-telegram-messaggio', {
            body: { messaggio: messaggioFormattato },
            headers: { Authorization: `Bearer ${session?.access_token}` }
        });
    } catch (err) {
        console.error("Errore log:", err.message);
    }
}

function gestisciAccessoPagina() {
    const permessi = sessionStorage.getItem('userPermessi') || "";
    const sessionUser = (sessionStorage.getItem('loggedUser') || "").trim();
    if (sessionUser === 'Zicli') return;
    const mappePermessi = { 
            'proposte.html': 'P',
            'staff.html': 'C',    
            'riunioni.html': 'R', 
            'bilancio.html': 'E',
            'notizie.html': 'N',
            'credenziali.html': 'A',
        };
    document.querySelectorAll('.panel-link').forEach(link => {
        const href = link.getAttribute('href').split('/').pop();
        const letteraRichiesta = mappePermessi[href];
        if (letteraRichiesta && !permessi.includes(letteraRichiesta)) {
            link.style.display = 'none';
        } else {
            link.style.display = 'flex';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    gestisciAccessoPagina();
    caricaNotizie();
});

async function caricaNotizie() {
    const { data: notizie, error } = await _supabase
        .from('notizie')
        .select('*')
        .order('ordine', { ascending: true }); 
    if (error) return;
    window.listaNotizie = notizie;
    const tbody = document.getElementById('news-data-body');
    tbody.innerHTML = notizie.map(n => {
        return `
            <tr data-id="${n.id}" class="draggable-row" onclick="openDynamicModal('${n.id}')">
                <td style="cursor: grab; width: 40px; text-align: center; color: #32a2e0; font-size: 1.2rem;">☰</td>
                <td style="text-align: left; font-weight: 600;">${n.titolo}</td>
                <td style="text-align: center;"><span class="badge-mini">${n.badge || '-'}</span></td>
                <td style="text-align: right;">
                    <button class="btn-action-dash edit" onclick="event.stopPropagation(); apriModifica('${n.id}')">MODIFICA</button>
                    <button class="btn-action-dash delete" onclick="event.stopPropagation(); eliminaNotizia('${n.id}', '${n.titolo.replace(/'/g, "\\'")}')">X</button>
                </td>
            </tr>
        `;
    }).join('');
    inizializzaDragAndDrop();
}

function inizializzaDragAndDrop() {
    const el = document.getElementById('news-data-body');
    Sortable.create(el, {
        animation: 150,
        handle: '.draggable-row', 
        ghostClass: 'sortable-ghost',
        onEnd: async function () {
            const rows = Array.from(el.querySelectorAll('tr'));
            const updates = rows.map((row, index) => ({
                id: row.getAttribute('data-id'),
                ordine: index 
            }));
            for (const item of updates) {
                await _supabase
                    .from('notizie')
                    .update({ ordine: item.ordine })
                    .eq('id', item.id);
            }
            await inviaLog("Notizie: Nuovo ordine salvato", "L'ordine delle notizie è stato modificato tramite drag & drop.");
        }
    });
}

function openDynamicModal(id) {
    const data = window.listaNotizie.find(item => item.id === id);
    if (!data) return;
    document.getElementById('modalName').innerText = data.titolo;
    document.getElementById('modalBadge').innerText = data.badge || "COMUNICATO";
    const contenutoProcessato = data.contenuto
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    document.getElementById('modalBody').innerHTML = contenutoProcessato;
    const imgContainer = document.getElementById('modalImageContainer');
    const imgTag = document.getElementById('modalImage');
    let url = data.immagine_url || data.image;
    if (url) {
        if (url.includes('imgur.com')) {
            url = url.replace('imgur.com', 'i.imgur.com');
            if (!url.match(/\.(jpg|jpeg|png|gif)$/)) {
                url += '.jpg';
            }
        }
        imgTag.src = url;
        imgContainer.style.display = 'block';
    } else {
        imgContainer.style.display = 'none';
    }
    const modal = document.getElementById('dynamicModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('dynamicModal');
    if(modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

async function salvaNotizia() {
    const titolo = document.getElementById('newsTitle').value.trim();
    const badge = document.getElementById('newsBadge').value.trim();
    const sottotitolo = document.getElementById('newsSubtitle').value.trim();
    const contenuto = document.getElementById('newsContent').value.trim();
    const immagine_url = document.getElementById('newsImageUrl').value.trim();
    if (!titolo || !contenuto) return alert("Inserisci Titolo e Contenuto.");
    const { error } = await _supabase.from('notizie').insert([{ titolo, badge, sottotitolo, contenuto, immagine_url }]);
    if (error) {
        alert("Errore: " + error.message);
    } else {
        await inviaLog("Notizie: Nuovo comunicato creato", `Titolo: ${titolo}\nBadge: ${badge}`);
        location.reload(); 
    }
}

function apriModifica(id) {
    const n = window.listaNotizie.find(item => item.id === id);
    if (!n) return;
    currentEditId = n.id;
    document.getElementById('edit-titolo').value = n.titolo || '';
    document.getElementById('edit-badge').value = n.badge || '';
    document.getElementById('edit-sottotitolo').value = n.sottotitolo || '';
    document.getElementById('edit-contenuto').value = n.contenuto || '';
    document.getElementById('edit-immagine').value = n.immagine_url || '';
    document.getElementById('editModal').style.display = 'flex';
}

async function salvaModificaCompleta() {
    const updates = {
        titolo: document.getElementById('edit-titolo').value,
        badge: document.getElementById('edit-badge').value,
        sottotitolo: document.getElementById('edit-sottotitolo').value,
        contenuto: document.getElementById('edit-contenuto').value,
        immagine_url: document.getElementById('edit-immagine').value
    };
    const { error } = await _supabase.from('notizie').update(updates).eq('id', currentEditId);
    if (error) {
        alert("Errore: " + error.message);
    } else {
        await inviaLog("Notizie: Comunicato modificato", `ID: ${currentEditId}\nNuovo Titolo: ${updates.titolo}`);
        location.reload();
    }
}

async function eliminaNotizia(id, titolo) {
    if (confirm(`Eliminare definitivamente la notizia "${titolo}"?`)) {
        const { error } = await _supabase.from('notizie').delete().eq('id', id);
        if (!error) {
            await inviaLog("Notizie: Comunicato rimosso", `Titolo: ${titolo}\nID: ${id}`);
            location.reload();
        }
    }
}

function toggleAddForm() {
    const container = document.getElementById('addFormContainer');
    if(container) container.style.display = (container.style.display === 'none') ? 'block' : 'none';
}

function chiudiModal() {
    document.getElementById('editModal').style.display = 'none';
}

function applicaGrassetto(textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const testo = textarea.value;
    const selezionato = testo.substring(start, end);
    if (selezionato.length > 0) {
        const nuovoTesto = testo.substring(0, start) + "**" + selezionato + "**" + testo.substring(end);
        textarea.value = nuovoTesto;
        textarea.focus();
        textarea.setSelectionRange(start + 2, end + 2);
    }
}

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        const attivo = document.activeElement;
        if (attivo.id === 'newsContent' || attivo.id === 'edit-contenuto') {
            e.preventDefault(); 
            applicaGrassetto(attivo);
        }
    }
});

function logout() {
    inviaLog("Sistema: Logout effettuato");
    _supabase.auth.signOut();
    sessionStorage.clear();
    window.location.replace('login.html');
}

window.addEventListener('click', (e) => {
    const dynModal = document.getElementById('dynamicModal');
    if (e.target === dynModal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") { closeModal(); chiudiModal(); }
});