const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;
let painChartInstance = null;
let activeLocationFilter = null;

const RED_MARKER = '#DA3E52'; // Активна травма
const GOLD_COLOR = '#FFC72C'; // Вилікувана травма / Стиль ProAtletCare

// Автоматична дата (сьогодні)
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
        injuries.sort((a, b) => new Date(a.date) - new Date(b.date));

        refreshUI();
    } catch (e) { console.error("Помилка:", e); }
}

function refreshUI() {
    renderPoints();
    renderInjuryList();
    updatePainChart();
}

// 3. ТОЧКИ НА ТІЛІ (Логіка кольору)
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    // Групуємо, щоб знайти останній стан кожної точки
    const latestStatus = {};
    injuries.forEach(inj => {
        latestStatus[inj.location] = inj;
    });

    Object.values(latestStatus).forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        
        // ЛОГІКА КОЛЬОРУ: Якщо біль > 0 — червона, якщо 0 — жовта
        const isHealed = parseInt(inj.pain) === 0;
        const markerColor = isHealed ? GOLD_COLOR : RED_MARKER;

        el.style.cssText = `
            position: absolute; width: 10px; height: 10px; 
            border-radius: 50%; border: 1px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${markerColor}; 
            box-shadow: 0 0 8px ${markerColor};
            left: ${inj.coordX}%; top: ${inj.coordY}%; z-index: 100;
        `;
        el.onclick = (e) => { e.stopPropagation(); selectFilter(inj.location); editEntry(inj.id); };
        container.appendChild(el);
    });
}

// 4. ГРАФІК ТА ІСТОРІЯ
function updatePainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx || injuries.length === 0) return;
    if (painChartInstance) painChartInstance.destroy();

    const displayData = activeLocationFilter 
        ? injuries.filter(i => i.location === activeLocationFilter)
        : injuries;

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayData.map(i => i.date),
            datasets: [{
                label: activeLocationFilter || "Динаміка болю",
                data: displayData.map(i => i.pain),
                borderColor: activeLocationFilter ? RED_MARKER : GOLD_COLOR,
                backgroundColor: 'rgba(218, 62, 82, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 10, ticks: { color: '#fff' } },
                x: { ticks: { color: '#fff' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    const sorted = injuries.slice().reverse();
    listElement.innerHTML = sorted.map(inj => `
        <div style="background: #1a1a1a; padding: 12px; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid ${parseInt(inj.pain) === 0 ? GOLD_COLOR : RED_MARKER}; cursor: pointer;" onclick="selectFilter('${inj.location}')">
            <div style="display: flex; justify-content: space-between;">
                <strong style="color: ${GOLD_COLOR}">${inj.location}</strong>
                <span style="color: #888; font-size: 0.8em;">${inj.date}</span>
            </div>
            <div style="color: #ccc; font-size: 0.9em; margin-top: 5px;">Біль: ${inj.pain}/10. ${inj.notes || ''}</div>
            <div style="margin-top: 5px;">
                <button onclick="event.stopPropagation(); editEntry('${inj.id}')" style="background:none; border:none; color:gold; cursor:pointer; font-size:0.8em;">Оновити</button>
                <button onclick="event.stopPropagation(); deleteEntry('${inj.id}')" style="background:none; border:none; color:${RED_MARKER}; cursor:pointer; font-size:0.8em; margin-left:10px;">Видалити</button>
            </div>
        </div>
    `).join('');
}

window.selectFilter = (loc) => { activeLocationFilter = loc; refreshUI(); };

// 5. КЕРУВАННЯ ФОРМОЮ
window.editEntry = (id) => {
    const inj = injuries.find(i => i.id === id);
    if (!inj) return;
    selectedId = id;
    document.getElementById('notes-section').style.display = 'block';
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-notes').value = inj.notes || "";
    document.getElementById('injury-date').value = inj.date;
    const radio = document.querySelector(`input[name="pain"][value="${inj.pain}"]`);
    if (radio) radio.checked = true;
    document.getElementById('save-injury-button').textContent = "Оновити стан";
};

window.deleteEntry = async (id) => {
    if (confirm("Видалити запис?")) {
        await db.collection(INJURY_COLLECTION).doc(id).delete();
        loadInjuriesFromFirebase();
    }
};

// 6. ІНІЦІАЛІЗАЦІЯ
document.addEventListener('DOMContentLoaded', () => {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    
    // Встановлюємо дату на сьогодні
    document.getElementById('injury-date').value = getToday();

    if (map) {
        map.onclick = (e) => {
            if (e.target.classList.contains('injury-marker')) return;
            const rect = map.getBoundingClientRect();
            marker.style.display = 'block';
            marker.style.left = ((e.clientX - rect.left) / rect.width) * 100 + '%';
            marker.style.top = ((e.clientY - rect.top) / rect.height) * 100 + '%';
            document.getElementById('coordX').value = (((e.clientX - rect.left) / rect.width) * 100).toFixed(2);
            document.getElementById('coordY').value = (((e.clientY - rect.top) / rect.height) * 100).toFixed(2);
            
            selectedId = null;
            document.getElementById('injury-form').reset();
            document.getElementById('injury-date').value = getToday();
            document.getElementById('notes-section').style.display = 'block';
        };
    }

    document.getElementById('injury-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            userId: currentUserId,
            location: document.getElementById('injury-location').value,
            date: document.getElementById('injury-date').value,
            pain: parseInt(document.querySelector('input[name="pain"]:checked')?.value || 0),
            notes: document.getElementById('injury-notes').value,
            coordX: document.getElementById('coordX').value,
            coordY: document.getElementById('coordY').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Для тренера
        };
        
        try {
            if (selectedId) await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
            else await db.collection(INJURY_COLLECTION).add(data);
            loadInjuriesFromFirebase();
            alert("ProAtletCare: Дані оновлено!");
        } catch (err) { alert(err.message); }
    };
});
