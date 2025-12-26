// ==========================================================
// 1. НАЛАШТУВАННЯ ТА КОЛЬОРИ
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;
let painChartInstance = null;

const RED_MARKER = '#DA3E52'; 
const GOLD_COLOR = '#FFC72C';

// АВТОРИЗАЦІЯ
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Атлет ідентифікований:", currentUserId);
            loadInjuriesFromFirebase();
        } else {
            firebase.auth().signInAnonymously().catch(e => console.error("Помилка входу:", e));
        }
    });
}

// ==========================================================
// 2. ЗАВАНТАЖЕННЯ ДАНИХ ТА ОКРЕМІ ГРАФІКИ
// ==========================================================
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        
        // Сортуємо за датою
        injuries.sort((a, b) => new Date(a.date) - new Date(b.date));

        renderPoints();      // Маленькі червоні точки
        initPainChart();    // Графік (окремі лінії)
        renderInjuryList(); // Історія з кнопками
    } catch (e) { 
        console.error("Помилка завантаження травм:", e); //
    }
}

function initPainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx || injuries.length === 0) return;
    if (painChartInstance) painChartInstance.destroy();

    // ГРУПУЄМО ТРАВМИ ДЛЯ ОКРЕМИХ ЛІНІЙ
    const grouped = injuries.reduce((acc, inj) => {
        const loc = inj.location || "Травма";
        if (!acc[loc]) acc[loc] = [];
        acc[loc].push(inj);
        return acc;
    }, {});

    const chartColors = [RED_MARKER, GOLD_COLOR, '#00FF7F', '#1E90FF', '#FF8C00'];
    let colorIdx = 0;

    const datasets = Object.keys(grouped).map(loc => {
        const color = chartColors[colorIdx % chartColors.length];
        colorIdx++;
        return {
            label: loc,
            data: grouped[loc].map(i => ({ x: i.date, y: i.pain })),
            borderColor: color,
            backgroundColor: color + '33',
            tension: 0.3,
            fill: false,
            pointRadius: 5
        };
    });

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: { datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, max: 10, ticks: { color: '#fff' }, grid: { color: '#333' } },
                x: { ticks: { color: '#fff' }, grid: { display: false } }
            },
            plugins: {
                legend: { display: true, labels: { color: '#fff' } }
            }
        }
    });
}

// ==========================================================
// 3. КЕРУВАННЯ ТОЧКАМИ ТА ВІКНОМ ДОПИСУ
// ==========================================================
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        el.style.cssText = `
            position: absolute; width: 8px; height: 8px; 
            border-radius: 50%; border: 1px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${RED_MARKER}; left: ${inj.coordX}%; top: ${inj.coordY}%; 
            z-index: 100;
        `;
        el.onclick = (e) => { 
            e.stopPropagation(); 
            editEntry(inj.id); 
        };
        container.appendChild(el);
    });
}

function setupBodyMap() {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const notes = document.getElementById('notes-section');

    if (!map || !marker) return;

    map.onclick = (e) => {
        if (e.target.classList.contains('injury-marker')) return;
        const rect = map.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        marker.style.display = 'block';
        marker.style.border = `2px solid ${RED_MARKER}`;
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        // ПРИМУСОВО ПОКАЗУЄМО ВІКНО ДОПИСУ
        if (notes) notes.style.display = 'block';
        
        selectedId = null;
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
        document.getElementById('save-injury-button').textContent = "Записати травму";
    };
}

// ==========================================================
// 4. ІСТОРІЯ, ОНОВЛЕННЯ ТА ВИДАЛЕННЯ
// ==========================================================
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    if (injuries.length === 0) {
        listElement.innerHTML = '<p class="placeholder-text">Записів ще немає.</p>';
        return;
    }

    listElement.innerHTML = injuries.slice().reverse().map(inj => `
        <div style="background: #1a1a1a; padding: 12px; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid ${RED_MARKER};">
            <div style="display: flex; justify-content: space-between;">
                <strong style="color: ${GOLD_COLOR}">${inj.location}</strong>
                <div style="display: flex; gap: 10px;">
                    <span onclick="editEntry('${inj.id}')" style="color: ${GOLD_COLOR}; cursor: pointer; font-size: 0.8em; border-bottom: 1px solid;">Оновити</span>
                    <span onclick="deleteEntry('${inj.id}')" style="color: ${RED_MARKER}; cursor: pointer; font-size: 0.8em; border-bottom: 1px solid;">Видалити</span>
                </div>
            </div>
            <div style="color: #ccc; font-size: 0.9em; margin-top: 5px;">
                Біль: ${inj.pain}/10 | ${inj.date}<br>
                <span style="color: #888;">${inj.notes || ''}</span>
            </div>
        </div>
    `).join('');
}

window.editEntry = function(id) {
    const inj = injuries.find(i => i.id === id);
    if (!inj) return;

    selectedId = id;
    document.getElementById('notes-section').style.display = 'block'; // ПРИМУСОВО ПОКАЗАТИ
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-notes').value = inj.notes || "";
    document.getElementById('injury-date').value = inj.date;
    
    const radio = document.querySelector(`input[name="pain"][value="${inj.pain}"]`);
    if (radio) radio.checked = true;

    document.getElementById('save-injury-button').textContent = "Зберегти зміни";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteEntry = async function(id) {
    if (!confirm("Видалити цей запис?")) return;
    try {
        await db.collection(INJURY_COLLECTION).doc(id).delete();
        loadInjuriesFromFirebase();
    } catch (e) { alert("Помилка видалення: " + e.message); }
};

// ==========================================================
// 5. ЗБЕРЕЖЕННЯ
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                userId: currentUserId,
                location: document.getElementById('injury-location').value,
                date: document.getElementById('injury-date').value,
                pain: parseInt(form.querySelector('input[name="pain"]:checked')?.value || 1),
                notes: document.getElementById('injury-notes').value,
                coordX: document.getElementById('coordX').value,
                coordY: document.getElementById('coordY').value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            try {
                if (selectedId) await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
                else await db.collection(INJURY_COLLECTION).add(data);
                
                loadInjuriesFromFirebase();
                alert("ProAthleteCare: Дані збережено!");
                form.reset();
                document.getElementById('click-marker').style.display = 'none';
            } catch (err) { console.error("Помилка запису:", err); } //
        };
    }
});
