(function() {
    const isLogged = sessionStorage.getItem('staffAccess');
    if (isLogged !== 'true') {
        window.location.replace('login.html');
    }
})();

const SUPABASE_URL = 'https://ljqyjqgjeloceimeiayr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcXlqcWdqZWxvY2VpbWVpYXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjAxNTMsImV4cCI6MjA4Mzc5NjE1M30.dNvhvad9_mR64RqeNZyu4X_GdxSOFz23TuiLt33GXxk';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

async function inviaLog(azione, dettagli = "") {
    try {
        const { data: { session } } = await _supabase.auth.getSession();
        const username = session?.user?.email ? session.user.email.split('@')[0].toUpperCase() : "SISTEMA";
        const messaggioFormattato = `🦅 *Progresso Riformista*\nɴᴜᴏᴠᴏ ʟᴏɢ ꜱɪᴛᴏ\n\n👤 ᴏᴘᴇʀᴀᴛᴏʀᴇ: ${username}\n📝 ᴀᴢɪᴏɴᴇ: ${azione}\n\n📖 ᴅᴇᴛᴛᴀɢʟɪ: ${dettagli}`;
        await _supabase.functions.invoke('send-telegram-messaggio', {
            body: { messaggio: messaggioFormattato },
            headers: { Authorization: `Bearer ${session?.access_token}` }
        });
    } catch (err) {}
}

document.addEventListener('DOMContentLoaded', () => {
    gestisciAccessoPagina('C');
    fetchConsiglieri();
});

async function fetchConsiglieri() {
    const listElement = document.getElementById('staff-data-body');
    const tableHead = document.getElementById('table-head');
    if (!listElement || !tableHead) return;
    tableHead.innerHTML = `<th>Nome Consigliere</th><th style="text-align: center;">Presenze Totali</th><th style="text-align: right;">Operazioni</th>`;
    try {
        const { data: consiglieri } = await _supabase.from('consiglieri').select('*').order('nome', { ascending: true });
        const { data: riunioni } = await _supabase.from('riunioni').select('presenti');
        listElement.innerHTML = '';
        consiglieri.forEach(c => {
            const numPresenze = riunioni.reduce((acc, r) => {
                const lista = Array.isArray(r.presenti) ? r.presenti : [];
                return lista.includes(c.nome) ? acc + 1 : acc;
            }, 0);
            const tr = document.createElement('tr');
            tr.style.cursor = "pointer";
            tr.dataset.consigliere = JSON.stringify(c);
            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span id="nome-text-${c.id}" style="color: white; font-weight: 600;">${c.nome}</span>
                        <input type="text" id="edit-input-${c.id}" value="${c.nome}" style="display:none;" onclick="event.stopPropagation()">
                    </div>
                </td>
                <td style="text-align: center;"><span class="badge-count">${numPresenze} Sedute</span></td>
                <td style="text-align: right;">
                    <div style="display: flex; justify-content: flex-end; gap: 8px;">
                        <button id="btn-edit-${c.id}" class="btn-action-dash edit" onclick="event.stopPropagation(); abilitaModifica(${c.id})">MODIFICA</button>
                        <button id="btn-save-${c.id}" class="btn-action-dash save" style="display:none;" onclick="event.stopPropagation(); salvaModifica(${c.id})">SALVA</button>
                        <button class="btn-action-dash delete" onclick="event.stopPropagation(); eliminaConsigliere(${c.id}, '${c.nome}')">RIMUOVI</button>
                    </div>
                </td>`;
            tr.onclick = () => apriStatistiche(JSON.parse(tr.dataset.consigliere));
            listElement.appendChild(tr);
        });
    } catch (err) {}
}

async function eliminaConsigliere(id, nome) {
    if(confirm("Rimuovere permanentemente?")) {
        const { error } = await _supabase.from('consiglieri').delete().eq('id', id);
        if(!error) { fetchConsiglieri(); inviaLog("Rimozione Consigliere", nome); }
    }
}

async function aggiungiConsigliere() {
    const nomeInput = document.getElementById('nuovoNome');
    const nome = nomeInput.value.trim();
    if (!nome) return;
    const { error } = await _supabase.from('consiglieri').insert([{ nome }]);
    if (!error) { nomeInput.value = ''; toggleAddForm(); fetchConsiglieri(); inviaLog("Aggiunta Consigliere", nome); }
}

function toggleAddForm() {
    const form = document.getElementById('addFormContainer');
    form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
}

function abilitaModifica(id) {
    document.getElementById(`nome-text-${id}`).style.display = 'none';
    document.getElementById(`edit-input-${id}`).style.display = 'block';
    document.getElementById(`btn-edit-${id}`).style.display = 'none';
    document.getElementById(`btn-save-${id}`).style.display = 'block';
}

async function salvaModifica(id) {
    const vecchioNome = document.getElementById(`nome-text-${id}`).innerText.trim();
    const nuovoNome = document.getElementById(`edit-input-${id}`).value.trim();
    if (!nuovoNome || nuovoNome === vecchioNome) { fetchConsiglieri(); return; }
    await _supabase.from('consiglieri').update({ nome: nuovoNome }).eq('id', id);
    fetchConsiglieri();
    inviaLog("Modifica Nome Consigliere", `${vecchioNome} -> ${nuovoNome}`);
}

let nomeConsigliereSelezionato = null;

async function apriStatistiche(consigliere) {
    nomeConsigliereSelezionato = consigliere.nome; 
    const modal = document.getElementById('modalStatistiche');
    document.getElementById('statNomeConsigliere').innerText = consigliere.nome;
    document.getElementById('statDataInizio').innerText = consigliere.data_creazione ? new Date(consigliere.data_creazione).toLocaleDateString('it-IT') : "Inizio Tempi";
    modal.style.display = "flex";
    await calcolaPercentualePresenza(consigliere.nome, consigliere.data_creazione);
    await caricaProposte(consigliere.nome);
    const permessi = sessionStorage.getItem('userPermessi') || "";
    const areaAdmin = document.getElementById('areaAdminProposte');
    if (areaAdmin) areaAdmin.style.display = (permessi.includes('A') || permessi.includes('C')) ? 'block' : 'none';
}

function chiudiModalStatistiche() {
    document.getElementById('modalStatistiche').style.display = "none";
    const btn = document.getElementById('btn-proposta-azione');
    btn.innerText = "Aggiungi agli Atti";
    btn.onclick = aggiungiProposta;
    document.getElementById('nuovaPropostaTitolo').value = '';
    document.getElementById('nuovaPropostaLink').value = '';
}

async function calcolaPercentualePresenza(nome, dataCreazione) {
    const { data: riunioni } = await _supabase.from('riunioni').select('presenti, data');
    let totali = 0, presenze = 0;
    const inizio = dataCreazione ? new Date(dataCreazione) : null;
    riunioni.forEach(r => {
        if (!inizio || new Date(r.data) >= inizio) {
            totali++;
            if (Array.isArray(r.presenti) && r.presenti.includes(nome)) presenze++;
        }
    });
    document.getElementById('statPresenzaPerc').innerText = totali > 0 ? `${Math.round((presenze / totali) * 100)}%` : "0%";
}

async function caricaProposte(nome) {
    const lista = document.getElementById('listaProposte');
    const { data } = await _supabase.from('proposte_consiglieri').select('*').ilike('username', `%${nome.toLowerCase().replace(' ', '.')}%`).order('data_proposta', { ascending: false });
    lista.innerHTML = '';
    const perm = sessionStorage.getItem('userPermessi') || "";
    const haP = perm.includes('A') || perm.includes('C');
    
    if (!data || data.length === 0) {
        lista.innerHTML = '<li style="text-align:center; color:#555; font-size:0.8rem; margin:20px 0; list-style:none;">Nessuna proposta.</li>';
        return;
    }

    const col = { 'Approvata': '#2ecc71', 'Rifiutata': '#e74c3c', 'Sospesa': '#f1c40f', 'In Attesa': '#3498db' };
    
    data.forEach(p => {
        const c = col[p.stato] || '#888';
        const li = document.createElement('li');
        li.style.cssText = "background:rgba(255,255,255,0.02); border:1px solid rgba(50,162,224,0.08); padding:14px; border-radius:12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; list-style:none;";
        
        li.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px; flex-grow:1; min-width:0;">
                <div style="background:${c}15; width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; border: 1px solid ${c}30;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                </div>
                <div style="overflow:hidden; padding-right:10px;">
                    <a href="${p.link_documento}" target="_blank" style="color:#ffffff; text-decoration:none; font-weight:600; font-size:0.9rem; display:block; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; transition:0.2s;" onmouseover="this.style.color='#32a2e0'" onmouseout="this.style.color='#fff'">${p.titolo}</a>
                    <span style="font-size:0.65rem; color:#666; text-transform:uppercase; letter-spacing:0.8px; font-weight:700;">${new Date(p.data_proposta).toLocaleDateString('it-IT')}</span>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
                ${haP ? `
                    <select onchange="aggiornaStatoProposta(${p.id}, this.value)" style="background:rgba(10,10,10,0.6); color:${c}; border:1px solid ${c}40; padding:6px 30px 6px 12px; border-radius:8px; font-size:0.7rem; font-weight:800; cursor:pointer; appearance:none; -webkit-appearance:none; background-image: url('data:image/svg+xml;charset=US-ASCII,<svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"${encodeURIComponent(c)}\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 9l6 6 6-6\"/></svg>'); background-repeat: no-repeat; background-position: right 10px center; background-size: 10px; transition: 0.3s;">
                        <option value="In Attesa" ${p.stato === 'In Attesa' ? 'selected' : ''} style="background:#1a1a1a; color:#3498db;">IN ATTESA</option>
                        <option value="Approvata" ${p.stato === 'Approvata' ? 'selected' : ''} style="background:#1a1a1a; color:#2ecc71;">APPROVATA</option>
                        <option value="Sospesa" ${p.stato === 'Sospesa' ? 'selected' : ''} style="background:#1a1a1a; color:#f1c40f;">SOSPESA</option>
                        <option value="Rifiutata" ${p.stato === 'Rifiutata' ? 'selected' : ''} style="background:#1a1a1a; color:#e74c3c;">RIFIUTATA</option>
                    </select>
                    <div style="display:flex; gap:6px;">
                        <button onclick="preparaModificaProposta(${p.id}, '${p.titolo.replace(/'/g, "\\'")}', '${p.link_documento}', '${p.data_proposta}')" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); width:32px; height:32px; border-radius:8px; color:#888; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.2s;" onmouseover="this.style.color='#32a2e0'; this.style.borderColor='#32a2e0'" onmouseout="this.style.color='#888'; this.style.borderColor='rgba(255,255,255,0.1)'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg></button>
                        <button onclick="eliminaProposta(${p.id})" style="background:rgba(231,76,60,0.05); border:1px solid rgba(231,76,60,0.2); width:32px; height:32px; border-radius:8px; color:#e74c3c; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.2s;" onmouseover="this.style.background='rgba(231,76,60,0.15)'" onmouseout="this.style.background='rgba(231,76,60,0.05)'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                    </div>
                ` : `<span style="color:${c}; font-size:0.7rem; font-weight:900; text-transform:uppercase; border:1px solid ${c}40; padding:6px 14px; border-radius:8px; background:${c}10; letter-spacing:0.5px;">${p.stato}</span>`}
            </div>`;
        lista.appendChild(li);
    });
}

async function aggiornaStatoProposta(id, stato) {
    await _supabase.from('proposte_consiglieri').update({ stato }).eq('id', id);
    caricaProposte(nomeConsigliereSelezionato);
}

async function eliminaProposta(id) {
    if (confirm("Eliminare la proposta?")) {
        await _supabase.from('proposte_consiglieri').delete().eq('id', id);
        caricaProposte(nomeConsigliereSelezionato);
    }
}

function preparaModificaProposta(id, titolo, link, dataP) {
    document.getElementById('nuovaPropostaTitolo').value = titolo;
    document.getElementById('nuovaPropostaLink').value = link;
    document.getElementById('nuovaPropostaData').value = dataP;
    
    const btn = document.getElementById('btn-proposta-azione');
    btn.innerText = "SALVA MODIFICHE";
    btn.style.background = "#2ecc71";
    btn.onclick = () => salvaModificaProposta(id);
}

async function salvaModificaProposta(id) {
    const t = document.getElementById('nuovaPropostaTitolo').value.trim();
    let l = document.getElementById('nuovaPropostaLink').value.trim();
    const d = document.getElementById('nuovaPropostaData').value;

    if (l && !/^https?:\/\//i.test(l)) {
        l = 'https://' + l;
    }
    
    await _supabase.from('proposte_consiglieri').update({ 
        titolo: t, 
        link_documento: l, 
        data_proposta: d 
    }).eq('id', id);

    const btn = document.getElementById('btn-proposta-azione');
    btn.innerText = "AGGIUNGI PROPOSTA";
    btn.style.background = "#32a2e0";
    btn.onclick = aggiungiProposta;
    
    document.getElementById('nuovaPropostaTitolo').value = '';
    document.getElementById('nuovaPropostaLink').value = '';
    document.getElementById('nuovaPropostaData').value = '';
    caricaProposte(nomeConsigliereSelezionato);
}

async function aggiungiProposta() {
    const t = document.getElementById('nuovaPropostaTitolo').value.trim();
    let l = document.getElementById('nuovaPropostaLink').value.trim(); 
    const s = document.getElementById('nuovaPropostaStato').value;
    const d = document.getElementById('nuovaPropostaData').value;
    
    if (!nomeConsigliereSelezionato || !t || !l) return;

    if (!/^https?:\/\//i.test(l)) {
        l = 'https://' + l;
    }

    const dataInserimento = d || new Date().toISOString().split('T')[0];
    const usernameGenerato = nomeConsigliereSelezionato.toLowerCase().replace(' ', '.');

    const { error } = await _supabase.from('proposte_consiglieri').insert([{ 
        username: usernameGenerato, 
        titolo: t, 
        link_documento: l, 
        stato: s,
        data_proposta: dataInserimento 
    }]);

    if (!error) {
        document.getElementById('nuovaPropostaTitolo').value = '';
        document.getElementById('nuovaPropostaLink').value = '';
        document.getElementById('nuovaPropostaData').value = '';
        caricaProposte(nomeConsigliereSelezionato);
        inviaLog("Proposta", `Aggiunta: ${t}`);
    }
}

function logout() {
    _supabase.auth.signOut();
    sessionStorage.clear();
    window.location.replace('login.html');
}

function gestisciAccessoPagina(lettera) {
    const p = sessionStorage.getItem('userPermessi') || "";
    if (sessionStorage.getItem('loggedUser') === 'Zicli') return;
    if (!p.includes(lettera)) window.location.replace('login.html');
}