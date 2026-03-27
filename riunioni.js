const _supabase = supabase.createClient('https://ljqyjqgjeloceimeiayr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcXlqcWdqZWxvY2VpbWVpYXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjAxNTMsImV4cCI6MjA4Mzc5NjE1M30.dNvhvad9_mR64RqeNZyu4X_GdxSOFz23TuiLt33GXxk');
const TELEGRAM_CHAT_ID = "-1003653282093";

(async function protezioneTotale() {
    const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
    if (sessionError || !session) { window.location.replace('login.html'); return; }
    try {
        const usernameDaCercare = session.user.email.split('@')[0];
        const { data: profilo } = await _supabase.from('staff_users').select('permessi').eq('username', usernameDaCercare).single();
        if (!profilo) { window.location.replace('login.html'); return; }
        const paginaCorrente = window.location.pathname.split('/').pop() || 'index.html';
        const mappePermessi = { 'proposte.html': 'P', 'staff.html': 'C', 'riunioni.html': 'R', 'bilancio.html': 'E', 'notizie.html': 'N', 'credenziali.html': 'A', 'gestioneproposte.html': 'G' };
        if (mappePermessi[paginaCorrente] && !profilo.permessi.includes(mappePermessi[paginaCorrente])) { window.location.replace('staff.html'); return; }
        sessionStorage.setItem('loggedUser', usernameDaCercare);
        sessionStorage.setItem('userPermessi', profilo.permessi);
        document.body.style.visibility = "visible";
        document.body.style.opacity = "1";
    } catch (err) { window.location.replace('login.html'); }
})();

function escapeHTML(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function creaRigaPuntoGenerica(containerId, contenuto = "", stato = "") {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'odg-edit-row';
    div.style = "display:flex; align-items:center; gap:8px; margin-bottom:8px; background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.1);";
    
    div.innerHTML = `
        <input type="text" value="${contenuto}" class="minimal-input odg-text-input" style="flex:1; margin:0; font-size:0.85rem;" placeholder="Descrizione o Proposta...">
        <button type="button" onclick="promptLink(this)" style="background:none; border:1px solid #32a2e0; color:#32a2e0; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:0.7rem;">🔗</button>
        <div class="tag-selector" style="display:flex; gap:3px;">
            <span class="tag-opt ${stato === 'APPROVATA' ? 'active green' : ''}" onclick="setTag(this, 'APPROVATA')">A</span>
            <span class="tag-opt ${stato === 'RESPINTA' ? 'active red' : ''}" onclick="setTag(this, 'RESPINTA')">R</span>
            <span class="tag-opt ${stato === 'SOSPESA' ? 'active yellow' : ''}" onclick="setTag(this, 'SOSPESA')">S</span>
        </div>
        <button type="button" onclick="this.parentElement.remove()" style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:1.1rem; margin-left:5px;">&times;</button>
    `;
    container.appendChild(div);
}

function promptLink(btn) {
    const input = btn.parentElement.querySelector('.odg-text-input');
    const link = prompt("Inserisci l'URL del documento:");
    if (link) {
        const testo = input.value || "Documento";
        input.value = `<a href="${link}">${testo}</a>`;
    }
}

function setTag(el, status) {
    const parent = el.parentElement;
    const isAlreadyActive = el.classList.contains('active');
    parent.querySelectorAll('.tag-opt').forEach(opt => opt.classList.remove('active', 'green', 'red', 'yellow'));
    if (!isAlreadyActive) {
        if (status === 'APPROVATA') el.classList.add('active', 'green');
        if (status === 'RESPINTA') el.classList.add('active', 'red');
        if (status === 'SOSPESA') el.classList.add('active', 'yellow');
    }
}

function aggiungiPuntoNuovo() { creaRigaPuntoGenerica('nuovoOdgContainer'); }

function compilaOdGRaw(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} .odg-edit-row`)).map(r => {
        const t = r.querySelector('.odg-text-input').value.trim();
        const act = r.querySelector('.tag-opt.active');
        const st = act ? {'A':'APPROVATA','R':'RESPINTA','S':'SOSPESA'}[act.innerText] : '';
        return st ? `${t} | ${st}` : t;
    }).filter(p => p !== "").join('\n');
}

async function fetchProposteSuggerite() {
    const container = document.getElementById('suggerimentiProposte');
    if (!container) return;
    const { data: proposte } = await _supabase.from('proposte_consiglieri').select('titolo, link_documento').eq('stato', 'In Attesa');
    container.innerHTML = '';
    if (!proposte || proposte.length === 0) {
        container.innerHTML = '<span style="font-size:0.65rem; color:gray; text-transform:uppercase; letter-spacing:1px;">Nessuna proposta pendente</span>';
        return;
    }
    proposte.forEach(p => {
        const pill = document.createElement('div');
        pill.className = 'badge-tag yellow';
        pill.style = "cursor:pointer; padding:4px 10px; font-size:0.65rem; border: 1px solid rgba(241,196,15,0.3);";
        pill.innerHTML = `+ ${p.titolo}`;
        pill.onclick = () => creaRigaPuntoGenerica('nuovoOdgContainer', `<a href="${p.link_documento}">${p.titolo}</a>`);
        container.appendChild(pill);
    });
}

async function inviaOdGTelegram(data, presidiata, odgRaw) {
    const dObj = new Date(data);
    const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    const dataF = `${dObj.getDate()} ${mesi[dObj.getMonth()]} ${dObj.getFullYear()}`;
    const puntiPuntati = odgRaw.split('\n').filter(r => r.trim() !== "").map(r => `• ${r.trim()}`).join('\n');
    const messaggio = `🦅 <b>Progresso Riformista</b>\nᴏʀᴅɪɴᴇ ᴅᴇʟ ɢɪᴏʀɴᴏ\n\n🏛 <b>ᴅᴀᴛᴀ:</b> ${dataF}\n👤 <b>ᴘʀᴇꜱɪᴇᴅᴜᴛᴀ ᴅᴀ:</b> ${escapeHTML(presidiata)}\n\n📝 <b>ᴘᴜɴᴛɪ ᴅɪ ᴅɪꜱᴄᴜꜱꜱɪᴏɴᴇ:</b>\n${puntiPuntati}`;
    await _supabase.functions.invoke('send-telegram-messaggio', { body: { messaggio, parse_mode: 'HTML', chat_id: TELEGRAM_CHAT_ID } });
}

async function inviaResocontoTelegram(data, presidiata, odgRaw) {
    const dObj = new Date(data);
    const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    const dataF = `${dObj.getDate()} ${mesi[dObj.getMonth()]} ${dObj.getFullYear()}`;
    const punti = odgRaw.split('\n').filter(p => p.trim() !== "");
    let res = "";
    punti.forEach(p => {
        let [testo, stato] = p.split(' | ');
        let emoji = stato === 'APPROVATA' ? '🟢' : stato === 'RESPINTA' ? '🔴' : stato === 'SOSPESA' ? '🟡' : '🔹';
        res += `• ${emoji} ${testo}${stato ? ` (<b>${stato}</b>)` : ''}\n`;
    });
    const messaggio = `🦅 <b>Progresso Riformista</b>\nʀᴇꜱᴏᴄᴏɴᴛᴏ ʀɪᴜɴɪᴏɴᴇ\n\n🏛 <b>ᴅᴀᴛᴀ:</b> ${dataF}\n👤 <b>ᴘʀᴇꜱɪᴇᴅᴜᴛᴀ ᴅᴀ:</b> ${escapeHTML(presidiata)}\n\n📝 <b>ᴇꜱɪᴛᴏ ᴘᴜɴᴛɪ ᴅɪꜱᴄᴜꜱꜱɪ:</b>\n${res}`;
    await _supabase.functions.invoke('send-telegram-messaggio', { body: { messaggio, parse_mode: 'HTML', chat_id: TELEGRAM_CHAT_ID } });
}

async function salvaRiunione() {
    const dataVal = document.getElementById('dataRiunione').value;
    const chiVal = document.getElementById('presidiataDa').value;
    const odgVal = compilaOdGRaw('nuovoOdgContainer');
    const selezionati = Array.from(document.querySelectorAll('input[name="presenti"]:checked')).map(cb => cb.value);
    if (!dataVal || !chiVal || !odgVal) return alert("Compila i campi obbligatori.");
    const { error } = await _supabase.from('riunioni').insert([{ data: dataVal, presidiata_da: chiVal, odg: odgVal, presenti: selezionati, stato: 'conclusa' }]);
    if (!error) location.reload();
}

async function salvaComeOdG() {
    const dataVal = document.getElementById('dataRiunione').value;
    const chiVal = document.getElementById('presidiataDa').value;
    const odgVal = compilaOdGRaw('nuovoOdgContainer');
    if (!dataVal || !chiVal || !odgVal) return alert("Compila i campi obbligatori.");
    const { error } = await _supabase.from('riunioni').insert([{ data: dataVal, presidiata_da: chiVal, odg: odgVal, presenti: [], stato: 'odg' }]);
    if (!error) {
        if(confirm("Inviare su Telegram?")) await inviaOdGTelegram(dataVal, chiVal, odgVal);
        location.reload();
    }
}

async function fetchRiunioni() {
    const { data: consiglieriAttuali } = await _supabase.from('consiglieri').select('nome');
    const nomiAttuali = consiglieriAttuali ? consiglieriAttuali.map(c => c.nome) : [];
    const { data: riunioni } = await _supabase.from('riunioni').select('*').order('data', { ascending: false });
    const tbody = document.getElementById('riunioni-data-body');
    if (!tbody || !riunioni) return;
    tbody.innerHTML = '';
    riunioni.forEach(r => {
        const odgPunti = r.odg.split('\n').filter(p => p.trim() !== "");
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => toggleRow(`details-${r.id}`);
        tr.innerHTML = `
            <td><span style="color:${r.stato === 'odg' ? '#0088cc' : '#32a2e0'}; margin-right:5px;">●</span>${r.data}</td>
            <td>${r.presidiata_da}</td>
            <td style="text-align: center;">${r.stato === 'odg' ? '<span class="badge-tag blue">ODG</span>' : ''}</td>
            <td style="text-align: center; font-size:0.7rem; opacity:0.6;">Dettagli</td>
            <td style="text-align: right;">
                <button class="btn-action-dash edit" style="background:#0088cc; color:white; border:none;" onclick="event.stopPropagation(); ${r.stato === 'odg' ? `inviaOdGTelegram('${r.data}','${r.presidiata_da}','${r.odg.replace(/\n/g,'\\n')}')` : `inviaResocontoTelegram('${r.data}','${r.presidiata_da}','${r.odg.replace(/\n/g,'\\n')}')`}">✈️</button>
                <button class="btn-action-dash delete" onclick="event.stopPropagation(); eliminaRiunione(${r.id})">X</button>
            </td>`;
        
        const details = document.createElement('tr');
        details.id = `details-${r.id}`;
        details.className = 'row-details';
        details.style.display = 'none';
        details.innerHTML = `
            <td colspan="5">
                <div style="padding:15px; border-left:2px solid #32a2e0; background:rgba(0,0,0,0.2); margin:5px 0;">
                    <div style="margin-bottom:10px;"><strong style="color:#32a2e0; font-size:0.7rem;">PUNTI:</strong><br>
                        ${odgPunti.map(p => {
                            let [t, s] = p.split(' | ');
                            let tag = s ? ` <span class="badge-tag ${s === 'APPROVATA' ? 'green' : s === 'RESPINTA' ? 'red' : 'yellow'}">${s}</span>` : '';
                            return `<div style="margin:4px 0; font-size:0.8rem;">• ${t}${tag}</div>`;
                        }).join('')}
                    </div>
                    <div><strong style="color:#32a2e0; font-size:0.7rem;">PRESENTI:</strong><br>
                        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;">
                            ${r.presenti.map(n => `<span class="badge-status active" style="font-size:0.65rem;">${n}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </td>`;
        tbody.appendChild(tr); tbody.appendChild(details);
    });
}

function toggleRow(id) {
    const r = document.getElementById(id);
    const isVisible = r.style.display === 'table-row';
    document.querySelectorAll('.row-details').forEach(x => x.style.display = 'none');
    r.style.display = isVisible ? 'none' : 'table-row';
}

function toggleRiunioneForm() {
    const f = document.getElementById('riunioneFormContainer');
    f.style.display = f.style.display === 'none' ? 'block' : 'none';
    if(f.style.display === 'block') {
        fetchConsiglieriPerAppello();
        fetchProposteSuggerite();
        document.getElementById('nuovoOdgContainer').innerHTML = '';
        aggiungiPuntoNuovo();
    }
}

async function fetchConsiglieriPerAppello() {
    const { data } = await _supabase.from('consiglieri').select('nome');
    const container = document.getElementById('listaAppello');
    if (!container) return;
    container.innerHTML = '';
    data.forEach(c => {
        const lbl = document.createElement('label');
        lbl.className = 'pill-checkbox';
        lbl.innerHTML = `
            <input type="checkbox" name="presenti" value="${c.nome}">
            <span class="pill-content">
                <span class="pill-text" style="color: white !important;">${c.nome}</span>
            </span>`;
        container.appendChild(lbl);
    });
}

async function eliminaRiunione(id) {
    if (confirm("Eliminare definitivamente?")) {
        await _supabase.from('riunioni').delete().eq('id', id);
        fetchRiunioni();
    }
}

document.addEventListener('DOMContentLoaded', fetchRiunioni);