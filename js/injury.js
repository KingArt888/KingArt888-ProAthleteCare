// Константи та ініціалізація
const INJURY_COLLECTION = 'injuries';
const RED_MARKER = '#DA3E52'; 
const GOLD_COLOR = '#FFC72C'; 

let injuries = [];
let currentUserId = null;
let selectedId = null; 
let activeLocationFilter = null; 
let painChartInstance = null;

const getToday = () => new Date().toISOString().split('T')[0];

// 1. АВТОРИЗАЦІЯ ТА ВИЗНАЧЕННЯ USER_ID
// Додано підтримку перегляду адміном через URL (?userId=...)
const urlParams = new URLSearchParams(window.location.search);
const viewUserId = urlParams.get('userId');

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // Якщо є userId в URL - ми в режимі адміна, якщо ні - беремо ID поточного юзера
        currentUserId = viewUserId || user.uid;
        console.log("Працюємо з ID:", currentUserId);
        loadInjuriesFromFirebase();
    } else {
        // Якщо юзер не залогінений - логінимо анонімно для тестів
        firebase.auth().signInAnonymously().catch(e => console.error("Auth error:", e));
    }
});

// 2. ЗАВАНТАЖЕННЯ ДАНИХ З FIREBASE
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Перевірка наявності історії
            if (!data.history) {
                data.history = [{ date: data.date || getToday(), pain: data.pain || 0, notes: data.notes || "" }];
            }
            injuries.push({ id: doc.id, ...data });
        });
        refreshUI();
    } catch (e) { 
        console.error("Помилка завантаження:", e); 
    }
}

function refreshUI() {
    renderPoints();
    renderInjuryList();
    updatePainChart();
}

// 3. ВІДОБРАЖЕННЯ ТОЧОК НА СИЛУЕТІ
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        const lastEntry = inj.history[inj.history.length - 1];
        const isHealed = parseInt(lastEntry.pain) === 0;
        
        el.style.cssText = `
            position: absolute; width: 14px; height: 14px; 
            border-radius: 50%; border: 2px solid white; 
            background-color: ${isHealed ? GOLD_COLOR : RED_MARKER}; 
            left: ${inj.coordX}%; top: ${inj.coordY}%; transform: translate(-50%, -50%);
            z-index: 100; cursor: pointer;
            box-shadow: 0 0 8px ${isHealed ? GOLD_COLOR : RED_MARKER};
        `;
        
        el.onclick = (e) => { 
            e.stopPropagation(); 
            activeLocationFilter = inj.id; 
            refreshUI();

            // Автоскрол до аналітики
            const chartSection = document.querySelector('.chart-card') || document.getElementById('painChart');
            if (chartSection) {
                chartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
        container.appendChild(el);
    });
}

// 4. ГРАФІК ДИНАМІКИ БОЛЮ (Chart.js)
function updatePainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    if (painChartInstance) painChartInstance.destroy();

    const selectedInjury = injuries.find(i => i.id === activeLocationFilter);
    if (!selectedInjury) return;

    const history = [...selectedInjury.history].sort((a, b) => new Date(a.date) - new Date(b.date));

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.date),
            datasets: [{
                label: `Біль: ${selectedInjury.location}`,
                data: history.map(h => h.pain),
                borderColor: GOLD_COLOR,
                backgroundColor: 'rgba(255, 199, 44, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 6,
                pointBackgroundColor: history.map(h => parseInt(h.pain) === 0 ? GOLD_COLOR : RED_MARKER)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 10, ticks: { color: '#fff' }, grid: { color: '#333' } },
                x: { ticks: { color: '#888' }, grid: { display: false } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

// 5. РЕДАГУВАННЯ ТА ВИДАЛЕННЯ ЗАПИСІВ
window.editEntry = (injuryId, index) => {
    const inj = injuries.find(i => i.id === injuryId);
    const entry = inj.history[index];
    
    selectedId = injuryId;
    document.getElementById('notes-section').style.display = 'block';
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-location').disabled = true;
    document.getElementById('injury-date').value = entry.date;
    document.getElementById('injury-notes').value = entry.notes || "";
    
    const painRadio = document.querySelector(`input[name="pain"][value="${entry.pain}"]`);
    if (painRadio) painRadio.checked = true;

    // Перевизначаємо сабміт форми для редагування
    document.getElementById('injury-form').onsubmit = async (e) => {
        e.preventDefault();
        const updatedHistory = [...inj.history];
        updatedHistory[index] = {
            date: document.getElementById('injury-date').value,
            pain: parseInt(document.querySelector('input[name="pain"]:checked')?.value || 0),
            notes: document.getElementById('injury-notes').value
        };

        try {
            await db.collection(INJURY_COLLECTION).doc(injuryId).update({ history: updatedHistory });
            alert("Запис оновлено!");
            location.reload(); 
        } catch (err) { alert("Помилка оновлення"); }
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteEntry = async (injuryId, index) => {
    if (!confirm("Видалити цей запис?")) return;
    const inj = injuries.find(i => i.id === injuryId);
    const updatedHistory = inj.history.filter((_, i) => i !== index);

    try {
        if (updatedHistory.length === 0) {
            await db.collection(INJURY_COLLECTION).doc(injuryId).delete();
            activeLocationFilter = null;
        } else {
            await db.collection(INJURY_COLLECTION).doc(injuryId).update({ history: updatedHistory });
        }
        loadInjuriesFromFirebase();
    } catch (e) { alert("Помилка видалення"); }
};

async function deleteFullInjury(id) {
    if (confirm("Видалити всю травму та історію?")) {
        try {
            await db.collection(INJURY_COLLECTION).doc(id).delete();
            activeLocationFilter = null;
            loadInjuriesFromFirebase();
        } catch (e) { alert("Помилка видалення"); }
    }
}

// 6. РЕНДЕРИНГ СПИСКУ ТРАВМ / ІСТОРІЇ
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    if (activeLocationFilter) {
        const inj = injuries.find(i => i.id === activeLocationFilter);
        const historySorted = inj.history.map((h, i) => ({...h, idx: i})).reverse();

        listElement.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="color:gold; margin:0;">📍 ${inj.location}</h3>
                <button onclick="activeLocationFilter=null; refreshUI();" class="gold-button" style="width:auto; padding:5px 15px;">Назад</button>
            </div>
            <div style="max-height: 300px; overflow-y: auto; padding-right:5px;">
                ${historySorted.map(h => `
                    <div style="background:#111; padding:12px 40px 12px 12px; border-radius:8px; margin-bottom:10px; border-left:4px solid ${parseInt(h.pain) === 0 ? GOLD_COLOR : RED_MARKER}; position:relative;">
                        <div style="display:flex; justify-content:space-between; font-size:0.85em; margin-bottom:5px;">
                            <span style="color:#888;">${h.date}</span>
                            <span style="color:gold; font-weight:bold;">Біль: ${h.pain}</span>
                        </div>
                        <div style="font-size:0.9em; color:#ddd;">${h.notes || ''}</div>
                        <div style="position:absolute; right:8px; top:50%; transform:translateY(-50%); display:flex; flex-direction:column; gap:10px;">
                            <button onclick="editEntry('${inj.id}', ${h.idx})" style="background:none; border:none; cursor:pointer;">✏️</button>
                            <button onclick="deleteEntry('${inj.id}', ${h.idx})" style="background:none; border:none; cursor:pointer;">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button onclick="openUpdateMode('${inj.id}')" style="width:100%; padding:12px; background:gold; border:none; border-radius:5px; font-weight:bold; margin-top:10px; cursor:pointer; color:black;">+ НОВИЙ ЗАПИС</button>
            <button onclick="deleteFullInjury('${inj.id}')" style="width:100%; padding:8px; background:none; border:1px solid #DA3E52; color:#DA3E52; border-radius:5px; margin-top:8px; cursor:pointer; font-size:0.8em;">ВИДАЛИТИ ВСЮ ТРАВМУ</button>
        `;
    } else {
        listElement.innerHTML = injuries.map(inj => {
            const last = inj.history[inj.history.length - 1];
            return `
                <div onclick="activeLocationFilter='${inj.id}'; refreshUI();" style="background:#1a1a1a; padding:15px; border-radius:8px; margin-bottom:12px; cursor:pointer; border-left:5px solid ${parseInt(last.pain) === 0 ? GOLD_COLOR : RED_MARKER}; transition: 0.2s;" onmouseover="this.style.background='#222'" onmouseout="this.style.background='#1a1a1a'">
                    <div style="color:gold; font-weight:bold; font-size:1.1em;">${inj.location}</div>
                    <div style="font-size:0.85em; color:#888; margin-top:5px;">Останній запис: ${last.date} | Біль: ${last.pain}</div>
                </div>
            `;
        }).join('') || '<p style="color:#666; text-align:center;">Клікніть на силует тіла, щоб додати травму</p>';
    }
}

// 7. РОБОТА З ФОРМОЮ
window.openUpdateMode = (id) => {
    selectedId = id;
    const inj = injuries.find(i => i.id === id);
    document.getElementById('notes-section').style.display = 'block';
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-location').disabled = true; 
    document.getElementById('injury-date').value = getToday();
    document.getElementById('injury-notes').value = "";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.addEventListener('DOMContentLoaded', () => {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');

    if (map) {
        map.onclick = (e) => {
            if (e.target.classList.contains('injury-marker')) return;
            const rect = map.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            marker.style.left = x + '%'; marker.style.top = y + '%';
            document.getElementById('coordX').value = x.toFixed(2);
            document.getElementById('coordY').value = y.toFixed(2);
            
            selectedId = null; // Нова травма
            document.getElementById('injury-location').disabled = false;
            document.getElementById('injury-form').reset();
            document.getElementById('injury-date').value = getToday();
            document.getElementById('notes-section').style.display = 'block';
        };
    }

    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const updateData = {
                date: document.getElementById('injury-date').value,
                pain: parseInt(document.querySelector('input[name="pain"]:checked')?.value || 0),
                notes: document.getElementById('injury-notes').value
            };

            try {
                if (selectedId) {
                    // Додаємо новий запис в існуючу історію
                    await db.collection(INJURY_COLLECTION).doc(selectedId).update({
                        history: firebase.firestore.FieldValue.arrayUnion(updateData)
                    });
                } else {
                    // Створюємо нову травму
                    await db.collection(INJURY_COLLECTION).add({
                        userId: currentUserId,
                        location: document.getElementById('injury-location').value,
                        coordX: document.getElementById('coordX').value,
                        coordY: document.getElementById('coordY').value,
                        history: [updateData]
                    });
                }
                loadInjuriesFromFirebase();
                document.getElementById('notes-section').style.display = 'none';
                marker.style.left = '-100px'; // Ховаємо маркер вибору
            } catch (err) { alert("Помилка збереження: " + err.message); }
        };
    }
});
