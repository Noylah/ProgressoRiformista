const SUPABASE_URL = 'https://ljqyjqgjeloceimeiayr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcXlqcWdqZWxvY2VpbWVpYXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjAxNTMsImV4cCI6MjA4Mzc5NjE1M30.dNvhvad9_mR64RqeNZyu4X_GdxSOFz23TuiLt33GXxk'; 
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let mioUsername = null;
let idInModifica = null;

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

        sessionStorage.setItem('userPermessi', profilo.permessi);
        sessionStorage.setItem('loggedUser', usernameDaCercare);

        const paginaCorrente = window.location.pathname.split('/').pop();
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
            if (usernameDaCercare.toLowerCase() !== 'zicli') {
                window.location.replace('login.html');
                return;
            }
        }

        nascondiVociSidebar(profilo.permessi);

        document.body.style.visibility = "visible";
        document.body.style.opacity = "1";
    } catch (err) {
        window.location.replace('login.html');
    }
})();

function nascondiVociSidebar(permessi) {
    if (sessionStorage.getItem('loggedUser')?.toLowerCase() === 'zicli') return;

    const mapping = {
        'nav-proposte': 'P',
        'nav-staff': 'C',
        'nav-riunioni': 'R',
        'nav-bilancio': 'E',
        'nav-notizie': 'N',
        'nav-credenziali': 'A',
        'nav-gestione': 'G'
    };

    Object.keys(mapping).forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            const letteraNecessaria = mapping[id];
            if (!permessi.includes(letteraNecessaria)) {
                elemento.style.display = 'none';
            }
        }
    });
}

(async function initPagina() {
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    if (sessionError || !session) { window.location.replace('login.html'); return; }

    try {
        mioUsername = session.user.email.split('@')[0];

        const { data: profilo, error: dbError } = await _supabase
            .from('staff_users')
            .select('permessi')
            .eq('username', mioUsername) 
            .single();

        if (dbError || !profilo || !profilo.permessi.includes('P')) {
            alert("Accesso negato: non hai i permessi necessari (P).");
            window.location.replace('staff.html');
            return;
        }

        document.body.style.opacity = "1";
        document.body.style.visibility = "visible";
        
        caricaPropostePersonali();

    } catch (err) {
        console.error("Errore Init:", err);
        window.location.replace('login.html');
    }
})();

async function caricaPropostePersonali() {
    const tableBody = document.getElementById('listaProposte-body');
    const counter = document.getElementById('counter-proposte');
    if (!tableBody || !mioUsername) return;

    const { data, error } = await _supabase
        .from('proposte_consiglieri')
        .select('*')
        .eq('username', mioUsername)
        .order('id', { ascending: false });

    if (error) return;
    counter.innerText = `${data.length} PROPOSTE DEPOSITATE`;
    tableBody.innerHTML = '';

    const colorMap = { 
        'Approvata': { bg: 'rgba(46, 204, 113, 0.1)', text: '#2ecc71' }, 
        'Rifiutata': { bg: 'rgba(231, 76, 60, 0.1)', text: '#e74c3c' }, 
        'Sospesa':   { bg: 'rgba(241, 196, 15, 0.1)', text: '#f1c40f' }, 
        'In Attesa': { bg: 'rgba(52, 152, 219, 0.1)', text: '#3498db' } 
    };

    data.forEach(p => {
        const style = colorMap[p.stato] || { bg: '#222', text: '#888' };
        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.onclick = () => toggleFeedback(p.id); 

        const ops = p.stato === 'In Attesa' 
            ? `<div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button class="btn-action-dash edit" onclick="event.stopPropagation(); preparaModifica(${p.id}, '${p.titolo.replace(/'/g, "\\'")}', '${p.link_documento}')">EDIT</button>
                <button class="btn-action-dash delete" onclick="event.stopPropagation(); ritiraProposta(${p.id}, '${p.titolo.replace(/'/g, "\\'")}')">RITIRA</button>
               </div>`
            : `<span style="font-size:0.55rem; color:#555; font-weight:700; letter-spacing:1px;">LOCK</span>`;

        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color:#32a2e0; font-size:0.7rem;">${p.feedback_direzione ? '▼' : '○'}</span>
                    <span class="proposta-link-table">${p.titolo}</span>
                </div>
            </td>
            <td style="text-align: center; color: #888; font-size: 0.8rem;">${new Date(p.data_proposta).toLocaleDateString('it-IT')}</td>
            <td style="text-align: center;">
                <span class="status-badge" style="background:${style.bg}; color:${style.text}; border: 1px solid ${style.text}40;">
                    ${p.stato}
                </span>
            </td>
            <td style="text-align: right;">${ops}</td>
        `;

        const fTr = document.createElement('tr');
        fTr.id = `feedback-${p.id}`;
        fTr.className = 'feedback-row';
        fTr.innerHTML = `
            <td colspan="4" style="padding: 0; vertical-align: top; border-top: none;"> 
                <div class="feedback-content" style="padding: 20px 25px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                        <strong style="color:#32a2e0; font-size:0.65rem; letter-spacing:1.5px; text-transform:uppercase; opacity: 0.9;">✧ Riscontro Direzione</strong>
                        <a href="${p.link_documento}" target="_blank" class="btn-gold-action" 
                           style="text-decoration:none; font-size: 0.6rem; padding: 6px 15px; height: auto; line-height: 1; border-radius: 4px; box-shadow: 0 2px 10px rgba(50,162,224,0.2);">APRI DOCUMENTO ↗</a>
                    </div>
                    <div style="color:#bbb; font-size: 0.85rem; line-height: 1.5; margin: 0;">
                        ${p.feedback_direzione ? p.feedback_direzione.trim() : "<i>Nessun commento aggiuntivo registrato.</i>"}
                    </div>
                </div>
            </td>
        `;

        tableBody.appendChild(tr);
        tableBody.appendChild(fTr);
    });
}

function toggleFeedback(id) {
    const row = document.getElementById(`feedback-${id}`);
    const isVisible = row.classList.contains('active');
    document.querySelectorAll('.feedback-row').forEach(r => r.classList.remove('active'));
    if (!isVisible) row.classList.add('active');
}

async function aggiungiProposta() {
    const t = document.getElementById('nuovaPropostaTitolo').value.trim();
    let l = document.getElementById('nuovaPropostaLink').value.trim();
    
    if (!t || !l) return alert("Compila tutti i campi.");
    if (!/^https?:\/\//i.test(l)) l = 'https://' + l;

    const { error } = await _supabase.from('proposte_consiglieri').insert([{
        username: mioUsername,
        titolo: t, 
        link_documento: l,
        data_proposta: new Date().toISOString().split('T')[0], 
        stato: 'In Attesa'
    }]);

    if (error) {
        console.error(error);
        alert("Errore durante il deposito: " + error.message);
    } else {
        resetFormProposta(); 
        caricaPropostePersonali(); 
    }
}

async function salvaModificaProposta() {
    const t = document.getElementById('nuovaPropostaTitolo').value.trim();
    let l = document.getElementById('nuovaPropostaLink').value.trim();
    const { error } = await _supabase.from('proposte_consiglieri').update({ titolo: t, link_documento: l }).eq('id', idInModifica).eq('stato', 'In Attesa');
    if (!error) { resetFormProposta(); caricaPropostePersonali(); }
}

function preparaModifica(id, titolo, link) {
    idInModifica = id;
    document.getElementById('nuovaPropostaTitolo').value = titolo;
    document.getElementById('nuovaPropostaLink').value = link;
    const btn = document.getElementById('btn-deposito-main');
    btn.innerText = "CONFERMA MODIFICHE";
    btn.style.background = "#2ecc71";
    btn.onclick = salvaModificaProposta;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormProposta() {
    idInModifica = null;
    document.getElementById('nuovaPropostaTitolo').value = '';
    document.getElementById('nuovaPropostaLink').value = '';
    const btn = document.getElementById('btn-deposito-main');
    btn.innerText = "DEPOSITA PROPOSTA";
    btn.style.background = "";
    btn.onclick = aggiungiProposta;
}

async function ritiraProposta(id, titolo) {
    if (!confirm(`Ritirare la proposta "${titolo}"?`)) return;
    const { error } = await _supabase.from('proposte_consiglieri').delete().eq('id', id).eq('stato', 'In Attesa');
    if (!error) caricaPropostePersonali();
}

function logout() { sessionStorage.clear(); _supabase.auth.signOut(); window.location.replace('login.html'); }