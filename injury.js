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

        // Сортуємо ВСІ записи за датою від найдавніших до найновіших для коректного графіка
        injuries.sort((a, b) => new Date(a.date) - new Date(b.date));

        refreshUI();
    } catch (e) { console.error("Помилка завантаження:", e); }
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

    // Відображаємо тільки ОСТАННІЙ стан для кожної точки на мапі
    const latestStatus = {};
    injuries.forEach(inj => { latestStatus[inj.location] = inj; });

    Object.values(latestStatus).forEach(inj => {
        if (!inj.coordX || !inj.coordY) return;
        const el = document.createElement('div');
        el.className = 'injury-marker';
        const isHealed = parseInt(inj.pain) === 0;
        
        el.style.cssText = `
            position: absolute; width: 14px; height: 14px; 
            border-radius: 50%; border: 2px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${isHealed ? GOLD_COLOR : RED_MARKER}; 
            box-shadow: 0 0 10px ${isHealed ? GOLD_COLOR : RED_MARKER};
            left: ${inj.coordX}%; top: ${inj.coordY}%; z-index: 100;
        `;
        
        el.onclick = (e) => { 
            e.stopPropagation(); 
            activeLocationFilter = inj.location; // Вмикаємо фільтр хронології для цієї точки
            refreshUI();
        };
        container.appendChild(el);
    });
}

// 4. ГРАФІК ДИНАМІКИ ВІДНОВЛЕННЯ (ХРОНОЛОГІЯ)
function updatePainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    if (painChartInstance) painChartInstance.destroy();

    // Якщо вибрана точка — показуємо динаміку саме по ній
    // Якщо нічого не вибрано — показуємо середню динаміку або всі точки
    const displayData = activeLocationFilter 
        ? injuries.filter(i => i.location === activeLocationFilter)
        : injuries;

    if (displayData.length === 0) return;

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayData.map(i => i.date), // Всі дати по черзі
            datasets: [{
                label: activeLocationFilter ? `Динаміка: ${activeLocationFilter}` : "Загальна динаміка болю",
                data: displayData.map(i => i.pain),
                borderColor: GOLD_COLOR,
                backgroundColor: 'rgba(255, 199, 44, 0.1)',
                borderWidth: 3,
                tension: 0.3, // Робить лінію плавною
                fill: true,
                pointBackgroundColor: displayData.map(i => parseInt(i.pain) === 0 ? GOLD_COLOR : RED_MARKER),
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    min: 0, max: 10, 
                    title: { display: true, text: 'Рівень болю', color: '#888' },
                    ticks: { color: '#fff' } 
                },
                x: { 
                    ticks: { color: '#888' } 
                }
            },
            plugins: {
                legend: { labels: { color: '#fff', font: { size: 14 } } }
            }
        }
    });
}

// 5. СПИСОК (СТРІЧКА ЧАСУ)
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    let html = activeLocationFilter 
        ? `<div style="background: #FFC72C; color: #000; padding: 5px 10px; border-radius: 4px; margin-bottom: 15px; display: flex; justify-content: space-between; font-weight: bold;">
            <span>📍 ${activeLocationFilter}</span>
            <span onclick="activeLocationFilter=null; refreshUI();" style="cursor:pointer;">✖ Скинути</span>
           </div>`
        : "";

    // У списку показуємо від нових до старих
    const filtered = activeLocationFilter 
        ? injuries.filter(i => i.location === activeLocationFilter).reverse()
        : [...injuries].reverse();

    html += filtered.map(inj => `
        <div style="background: #111; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 5px solid ${parseInt(inj.pain) === 0 ? GOLD_COLOR : RED_MARKER};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #888; font-size: 0.85em;">📅 ${inj.date}</span>
                <span style="background: #333; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.8em;">Біль: ${inj.pain}/10</span>
            </div>
            <div style="margin-top: 8px; color: ${GOLD_COLOR}; font-weight: bold;">${inj.location}</div>
            <div style="color: #ccc; font-size: 0.9em; margin-top: 4px;">${inj.notes || 'Без коментарів'}</div>
            <div style="margin-top: 10px; text-align: right;">
                <button onclick="editEntry('${inj.id}')" style="background:none; border:none; color:gold; cursor:pointer; font-size:0.8em; text-decoration: underline;">Редагувати</button>
            </div>
        </div>
    `).join('');

    listElement.innerHTML = html || '<p style="color: #666;">Записів ще немає.</p>';
}

// 6. РЕДАГУВАННЯ ТА ЗБЕРЕЖЕННЯ
window.editEntry = (id) => {
    const inj = injuries.find(i => i.id === id);
    if (!inj) return;
    selectedId = id;
    document.getElementById('notes-section').style.display = 'block';
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-notes').value = inj.notes || "";
    document.getElementById('injury-date').value = inj.date;
    document.getElementById('coordX').value = inj.coordX;
    document.getElementById('coordY').value = inj.coordY;
    const radio = document.querySelector(`input[name="pain"][value="${inj.pain}"]`);
    if (radio) radio.checked = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

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
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
        document.getElementById('notes-section').style.display = 'block';
    };

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
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try {
            if (selectedId) await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
            else await db.collection(INJURY_COLLECTION).add(data);
            loadInjuriesFromFirebase();
            document.getElementById('notes-section').style.display = 'none';
            marker.style.display = 'none';
        } catch (err) { alert(err.message); }
    };
});
