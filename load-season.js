const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null; 
let painChartInstance = null;
let activeLocationFilter = null;

const RED_MARKER = '#DA3E52'; 
const GOLD_COLOR = '#FFC72C'; 

const getToday = () => new Date().toISOString().split('T')[0];

// 1. АВТОРИЗАЦИЯ
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

// 2. ЗАГРУЗКА ДАННЫХ И ПРЕОБРАЗОВАНИЕ В ИСТОРИЮ
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Если записи старые (без массива history), создаем его
            if (!data.history) {
                data.history = [{
                    date: data.date || getToday(),
                    pain: data.pain || 0,
                    notes: data.notes || ""
                }];
            }
            injuries.push({ id: doc.id, ...data });
        });
        refreshUI();
    } catch (e) { console.error("Ошибка загрузки:", e); }
}

function refreshUI() {
    renderPoints();
    renderInjuryList();
    updatePainChart();
}

// 3. ТОЧКИ НА ТЕЛЕ
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(inj => {
        if (!inj.coordX || !inj.coordY) return;

        const el = document.createElement('div');
        el.className = 'injury-marker';
        
        // Последняя запись в истории определяет цвет точки
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
            activeLocationFilter = inj.id; // Фокус на этой травме
            refreshUI();
        };
        container.appendChild(el);
    });
}

// 4. ГРАФИК КОНТРОЛЯ БОЛИ (МНОГО ТОЧЕК)
function updatePainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    if (painChartInstance) painChartInstance.destroy();

    const selectedInjury = injuries.find(i => i.id === activeLocationFilter);
    if (!selectedInjury) return;

    // Сортируем историю по датам для правильной линии графика
    const history = [...selectedInjury.history].sort((a, b) => new Date(a.date) - new Date(b.date));

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.date), // Все даты (сколько бы их ни было)
            datasets: [{
                label: `Динамика восстановления: ${selectedInjury.location}`,
                data: history.map(h => h.pain), // Все значения боли
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
                y: { min: 0, max: 10, ticks: { color: '#fff' } },
                x: { ticks: { color: '#888' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

// 5. СПИСОК ИСТОРИИ
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    if (activeLocationFilter) {
        const inj = injuries.find(i => i.id === activeLocationFilter);
        const historyRev = [...inj.history].reverse(); // Последние записи сверху

        listElement.innerHTML = `
            <div style="color: #FFC72C; font-weight: bold; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span>📍 ${inj.location}</span>
                <button onclick="activeLocationFilter=null; refreshUI();" style="background:#333; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Назад</button>
            </div>
            ${historyRev.map(h => `
                <div style="background: #111; padding: 10px; border-radius: 5px; margin-bottom: 5px; border-left: 3px solid ${parseInt(h.pain) === 0 ? GOLD_COLOR : RED_MARKER};">
                    <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #888;">
                        <span>${h.date}</span>
                        <span style="color: gold; font-weight:bold;">Боль: ${h.pain}/10</span>
                    </div>
                    <div style="color: #ccc; margin-top: 5px;">${h.notes || 'Без описания'}</div>
                </div>
            `).join('')}
            <button onclick="openUpdateForm('${inj.id}')" style="width: 100%; padding: 12px; background: #FFC72C; color: black; border: none; border-radius: 5px; margin-top: 10px; cursor: pointer; font-weight: bold;">
                + ЗАПИСАТЬ НОВОЕ СОСТОЯНИЕ
            </button>
        `;
    } else {
        listElement.innerHTML = injuries.map(inj => {
            const last = inj.history[inj.history.length - 1];
            return `
                <div onclick="activeLocationFilter='${inj.id}'; refreshUI();" style="background: #1a1a1a; padding: 15px; border-radius: 8px; margin-bottom: 10px; cursor: pointer; border-left: 5px solid ${parseInt(last.pain) === 0 ? GOLD_COLOR : RED_MARKER};">
                    <div style="font-weight: bold; color: gold;">${inj.location}</div>
                    <div style="font-size: 0.8em; color: #888;">Последнее обновление: ${last.date}</div>
                    <div style="margin-top: 5px;">Текущая боль: <strong>${last.pain}/10</strong></div>
                </div>
            `;
        }).join('') || '<p class="placeholder-text">Кликните на силуэт, чтобы добавить травму.</p>';
    }
}

// 6. УПРАВЛЕНИЕ ФОРМОЙ
window.openUpdateForm = (id) => {
    selectedId = id;
    const inj = injuries.find(i => i.id === id);
    document.getElementById('notes-section').style.display = 'block';
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-location').disabled = true; // Название не меняем
    document.getElementById('injury-date').value = getToday();
    document.getElementById('injury-notes').value = "";
    document.getElementById('save-injury-button').textContent = "Сохранить в историю";
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
        document.getElementById('injury-location').disabled = false;
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
        document.getElementById('notes-section').style.display = 'block';
        document.getElementById('save-injury-button').textContent = "Зафиксировать новую травму";
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
                // Добавляем точку в историю существующей травмы
                await db.collection(INJURY_COLLECTION).doc(selectedId).update({
                    history: firebase.firestore.FieldValue.arrayUnion(newEntry)
                });
            } else {
                // Новая травма
                await db.collection(INJURY_COLLECTION).add({
                    userId: currentUserId,
                    location: document.getElementById('injury-location').value,
                    coordX: document.getElementById('coordX').value,
                    coordY: document.getElementById('coordY').value,
                    history: [newEntry]
                });
            }
            alert("Состояние обновлено!");
            loadInjuriesFromFirebase();
            document.getElementById('notes-section').style.display = 'none';
        } catch (err) { alert(err.message); }
    };
});
