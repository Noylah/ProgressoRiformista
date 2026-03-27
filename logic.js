const TARGET_CHAT_ID = "-1003526824346"; 
const SUPABASE_URL = 'https://ljqyjqgjeloceimeiayr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqcXlqcWdqZWxvY2VpbWVpYXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjAxNTMsImV4cCI6MjA4Mzc5NjE1M30.dNvhvad9_mR64RqeNZyu4X_GdxSOFz23TuiLt33GXxk';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

document.addEventListener('DOMContentLoaded', () => {
    const formAffiliati = document.querySelector('.affiliati-form');

    if (formAffiliati) {
        formAffiliati.addEventListener('submit', async function(e) {
            e.preventDefault();

            let nickname = document.getElementById('nickname').value;
            let telegram = document.getElementById('telegram').value;
            const submitBtn = this.querySelector('button');

            if (telegram && !telegram.startsWith('@')) {
                telegram = '@' + telegram;
            }

            submitBtn.disabled = true;
            submitBtn.innerText = "Recupero IP...";

            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                const userIP = ipData.ip;

                submitBtn.innerText = "Invio in corso...";

                const { data, error } = await _supabase.functions.invoke('send-telegram-affiliazione', {
                    body: { 
                        nickname: nickname,
                        telegram: telegram,
                        userIP: userIP
                    }
                });

                if (error) throw error;

                const formBox = document.querySelector('.affiliati-form-box');
                formBox.innerHTML = `
                    <div class="success-message-container">
                        <div class="success-card">
                            <div class="success-icon">✓</div>
                            <h3>Richiesta Inviata!</h3>
                            <p>I dati sono stati inviati con successo.</p>
                        </div>
                    </div>`;

            } catch (error) {
                console.error(error);
                alert("Errore durante l'operazione.");
                submitBtn.disabled = false;
                submitBtn.innerText = "Invia Richiesta";
            }
        });
    }
});

async function caricaNotizieHome() {
    const { data: notizie, error } = await _supabase
        .from('notizie')
        .select('*')
        .order('ordine', { ascending: true });

    if (error) {
        console.error("Errore caricamento notizie:", error);
        return;
    }

    const grid = document.getElementById('news-grid');
    if (!grid) return;

    grid.innerHTML = ''; 

    notizie.forEach(n => {
        const article = document.createElement('article');
        article.className = 'news-card';
        
        article.onclick = () => openDynamicModal(n);

        const imageHTML = n.immagine_url 
            ? `<img src="${n.immagine_url}" alt="${n.titolo}" class="news-img-top">`
            : `<div class="news-placeholder"></div>`;

        const dataComunicato = n.data_comunicato
            ? new Date(n.data_comunicato).toLocaleDateString('it-IT') 
            : "";

        article.innerHTML = `
            <div class="news-image-container">
                ${imageHTML}
            </div>
            <div class="news-info">
                <h3>${n.titolo}</h3>
                <p>${n.sottotitolo || ''}</p>
                <div class="news-date-tag" style="margin-top: 10px; font-size: 0.7rem; color: #32a2e0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8;">
                    ${dataComunicato}
                </div>
            </div>
        `;
        
        grid.appendChild(article);
    });
}

document.addEventListener('DOMContentLoaded', caricaNotizieHome);