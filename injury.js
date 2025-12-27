const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;
let painChartInstance = null;
let activeLocationFilter = null;

const RED_MARKER = '#DA3E52'; 
const GOLD_COLOR = '#FFC72C'; 

const getToday = () => new Date().toISOString().split('T')[0];

// 1. АВТОРИЗАЦІЯ
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadInjuriesFromFirebase();
        } else {
            firebase.auth().signInAnonymously();
        }
    });
}

// 2. ЗАВАНТАЖЕННЯ ДАНИХ
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        refreshUI();
    } catch (e) { console.error("Помилка:", e); }
}

function refreshUI() {
    renderPoints();
    renderInjuryList();
    updatePainChart();
}

// 3. ТОЧКИ НА ТІЛІ
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(inj => {
        if (!inj.coordX || !inj.coordY) return;

        const el = document.createElement('div');
        el.className = 'injury-marker';
        
        // Беремо останній стан з масиву історії для кольору
        const lastEntry = inj.history[inj.history.length - 1];
        const isHealed = parseInt(lastEntry.pain) === 0;
        const markerColor = isHealed ? GOLD_COLOR : RED_MARKER;

        el.style.cssText = `
            position: absolute; width: 14px; height: 14px; 
            border-radius: 50%; border: 2px solid white; 
            background-color: ${markerColor}; 
            box-shadow: 0 0 10px ${markerColor};
            left: ${inj.coordX}%; top: ${inj.coordY}%; transform: translate(-50%, -50%);
            z-index: 100; cursor: pointer;
        `;
        
        el.onclick = (e) => { 
            e.stopPropagation(); 
            activeLocationFilter = inj.id; // Фільтруємо за конкретним ID травми
            refreshUI();
        };
        container.appendChild(el);
    });
}

// 4. ГРАФІК ДИНАМІКИ ВІДНОВЛЕННЯ
function updatePainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    if (painChartInstance) painChartInstance.destroy();

    // Якщо вибрана конкретна травма — показуємо її історію
    const selectedInjury = injuries.find(i => i.id === activeLocationFilter);
    if (!selectedInjury) return;

    const history = selectedInjury.history;

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.date),
            datasets: [{
                label: `Відновлення: ${selectedInjury.location}`,
                data: history.map(h => h.pain),
                borderColor: GOLD_COLOR,
                backgroundColor: 'rgba(255, 199, 44, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 10, ticks: { color: '#fff' } },
                x: { ticks: { color: '#888' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

// 5. СПИСОК (ЛОГІКА ХРОНОЛОГІЇ ВСЕРЕДИНІ ТРАВМИ)
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    if (activeLocationFilter) {
        const inj = injuries.find(i => i.id === activeLocationFilter);
        const historyRev = [...inj.history].reverse();

        listElement.innerHTML = `
            <div style="color: #FFC72C; font-weight: bold; margin-bottom: 10px; display: flex; justify-content: space-between;">
                <span>📍 ${inj.location} (Вся історія)</span>
                <span onclick="activeLocationFilter=null; refreshUI();" style="cursor:pointer; color:#888;">✖ Назад</span>
            </div>
            ${historyRev.map(h => `
                <div style="background: #111; padding: 10px; border-radius: 5px; margin-bottom: 5px; border-left: 3px solid ${parseInt(h.pain) === 0 ? GOLD_COLOR : RED_MARKER};">
                    <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #888;">
                        <span>${h.date}</span>
                        <span style="color: gold;">Біль: ${h.pain}/10</span>
                    </div>
                    <div style="color: #ccc; margin-top: 5px;">${h.notes || 'Без коментарів'}</div>
                </div>
            `).join('')}
            <button onclick="openUpdateForm('${inj.id}')" style="width: 100%; padding: 10px; background: #FFC72C; color: black; border: none; border-radius: 5px; margin-top: 10px; cursor: pointer; font-weight: bold;">
                + ДОДАТИ ОНОВЛЕННЯ СТАНУ
            </button>
        `;
    } else {
        listElement.innerHTML = injuries.map(inj => {
            const last = inj.history[inj.history.length - 1];
            return `
                <div onclick="activeLocationFilter='${inj.id}'; refreshUI();" style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 10px; cursor: pointer; border-left: 5px solid ${parseInt(last.pain) === 0 ? GOLD_COLOR : RED_MARKER};">
                    <div style="font-weight: bold; color: gold;">${inj.location}</div>
                    <div style="font-size: 0.8em; color: #888;">Останнє оновлення: ${last.date}</div>
                    <div style="margin-top: 5px;">Поточний біль: ${last.pain}/10</div>
                </div>
            `;
        }).join('') || '<p class="placeholder-text">Клікніть на мапу, щоб створити нову травму.</p>';
    }
}

// 6. ФОРМА ОНОВЛЕННЯ
window.openUpdateForm = (id) => {
    selectedId = id;
    const inj = injuries.find(i => i.id === id);
    document.getElementById('notes-section').style.display = 'block';
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-location').disabled = true; // Не даємо міняти назву
    document.getElementById('injury-date').value = getToday();
    document.getElementById('injury-notes').value = "";
    document.getElementById('save-injury-button').textContent = "Зберегти оновлення стану";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 7. ЗБЕРЕЖЕННЯ (Нова травма vs Оновлення існуючої)
document.addEventListener('DOMContentLoaded', () => {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');

    map.onclick = (e) => {
        if (e.target.classList.contains('injury-marker')) return;
        const rect = map.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        marker.style.display = 'block';
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        selectedId = null;
        document.getElementById('injury-location').disabled = false;
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
        document.getElementById('notes-section').style.display = 'block';
        document.getElementById('save-injury-button').textContent = "Зафіксувати нову травму";
    };

    document.getElementById('injury-form').onsubmit = async (e) => {
        e.preventDefault();
        
        const newEntry = {
            date: document.getElementById('injury-date').value,
            pain: parseInt(document.querySelector('input[name="pain"]:checked')?.value || 0),
            notes: document.getElementById('injury-notes').value
        };

        try {
            if (selectedId) {
                // ОНОВЛЕННЯ: додаємо новий стан у масив історії існуючої травми
                await db.collection(INJURY_COLLECTION).doc(selectedId).update({
                    history: firebase.firestore.FieldValue.arrayUnion(newEntry)
                });
            } else {
                // СТВОРЕННЯ: новий документ з початковим масивом історії
                await db.collection(INJURY_COLLECTION).add({
                    userId: currentUserId,
                    location: document.getElementById('injury-location').value,
                    coordX: document.getElementById('coordX').value,
                    coordY: document.getElementById('coordY').value,
                    history: [newEntry]
                });
            }
            alert("ProAtletCare: Оновлено!");
            loadInjuriesFromFirebase();
            document.getElementById('notes-section').style.display = 'none';
        } catch (err) { alert(err.message); }
    };
});
