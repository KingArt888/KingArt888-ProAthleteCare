// ==========================================================
// КОНФІГУРАЦІЯ ТА ГЛОБАЛЬНІ ЗМІННІ
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUser = null;
let injuries = [];
let selectedInjury = null;
let currentPainChart = null;

const db = firebase.firestore();

// Функція-хелпер для дати
function getTodayDateString() { 
    return new Date().toISOString().split('T')[0]; 
}

// ==========================================================
// FIREBASE АВТОРИЗАЦІЯ ТА ЗАВАНТАЖЕННЯ
// ==========================================================
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        console.log("Injury Story: Авторизовано", user.uid);
        loadInjuriesFromFirebase();
    } else {
        console.warn("Injury Story: Користувач не увійшов!");
    }
});

async function loadInjuriesFromFirebase() {
    if (!currentUser) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUser.uid)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => {
            injuries.push({ id: doc.id, ...doc.data() });
        });
        
        renderInjuryMarkers();
        displayInjuryList();
        updateAthleteStatus();
    } catch (e) { 
        console.error("Помилка завантаження травм:", e); 
    }
}

// ==========================================================
// ЛОГІКА КАРТИ ТРАВМ (КЛІКИ ТА МАРКЕРИ)
// ==========================================================
function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const notesSection = document.getElementById('notes-section');
    
    if (!mapContainer || !marker) return;

    mapContainer.addEventListener('click', function(e) {
        // Якщо клікнули на існуючий маркер — нічого не робимо (це обробить el.onclick)
        if (e.target.classList.contains('injury-marker')) return;

        const rect = mapContainer.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        // Позиціонуємо тимчасовий маркер вибору
        marker.style.left = `${xPercent}%`;
        marker.style.top = `${yPercent}%`;
        
        // Записуємо координати в приховані поля
        document.getElementById('coordX').value = xPercent.toFixed(2);
        document.getElementById('coordY').value = yPercent.toFixed(2);
        
        // Скидаємо вибір для нової травми
        selectedInjury = null;
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getTodayDateString();
        if (notesSection) notesSection.style.display = 'block';
        
        console.log(`Вибрано точку: X:${xPercent.toFixed(2)} Y:${yPercent.toFixed(2)}`);
    });
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;

    // Очищуємо старі маркери
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        // Стилізація через JS для надійності
        el.style.cssText = `
            position: absolute;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid white;
            transform: translate(-50%, -50%);
            cursor: pointer;
            z-index: 10;
        `;
        el.style.left = `${injury.coordX}%`;
        el.style.top = `${injury.coordY}%`;
        
        // Колір залежно від статусу
        el.style.backgroundColor = injury.status === 'closed' ? '#50C878' : '#DA3E52';
        if (selectedInjury && selectedInjury.id === injury.id) {
            el.style.border = "3px solid #FFC72C";
            el.style.boxShadow = "0 0 10px #FFC72C";
        }

        el.onclick = (e) => {
            e.stopPropagation();
            selectedInjury = injury;
            displayInjuryDetails(injury);
            renderInjuryMarkers(); // Оновити підсвітку
        };
        
        container.appendChild(el);
    });
}

// ==========================================================
// ВІДОБРАЖЕННЯ ДЕТАЛЕЙ ТА ГРАФІКА
// ==========================================================
function displayInjuryDetails(injury) {
    const detailBox = document.getElementById('injury-list');
    if (!detailBox) return;

    const latestPain = injury.painHistory?.length > 0 
        ? injury.painHistory[injury.painHistory.length - 1].pain 
        : injury.pain;

    detailBox.innerHTML = `
        <div class="injury-info-box" style="background:#111; padding:15px; border-radius:8px; border-left:4px solid #FFC72C; margin-bottom:15px;">
            <h4 style="color:#FFC72C; margin:0;">${injury.location}</h4>
            <p style="font-size:0.9em;">Статус: <strong>${injury.status === 'active' ? 'Активна' : 'Закрита'}</strong></p>
            <p style="font-size:0.9em;">Біль: <span style="color:#DA3E52; font-weight:bold;">${latestPain}/10</span></p>
            <p style="font-style:italic; font-size:0.85em;">"${injury.notes || ''}"</p>
            <button onclick="deleteInjury('${injury.id}')" style="background:#DA3E52; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; margin-top:10px; font-size:0.8em;">Видалити кейс</button>
        </div>
    `;

    renderPainChart(injury.painHistory || [], injury.location);
}

function renderPainChart(history, location) {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    
    if (currentPainChart) currentPainChart.destroy();
    
    const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

    currentPainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedHistory.map(h => h.date),
            datasets: [{
                label: `Динаміка болю: ${location}`,
                data: sortedHistory.map(h => h.pain),
                borderColor: '#FFC72C',
                backgroundColor: 'rgba(255, 199, 44, 0.2)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            scales: {
                y: { min: 0, max: 10, ticks: { color: '#fff' } },
                x: { ticks: { color: '#fff' } }
            },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

function displayInjuryList() {
    const listContainer = document.getElementById('injury-list-all');
    if (!listContainer) return; // Виправлення помилки з вашого скріншоту

    if (injuries.length === 0) {
        listContainer.innerHTML = '<p class="placeholder-text">Список порожній.</p>';
        return;
    }

    listContainer.innerHTML = injuries.map(injury => `
        <div class="injury-item" style="padding:8px; border-bottom:1px solid #333; cursor:pointer;" onclick="selectInjuryFromList('${injury.id}')">
            <span style="color:${injury.status === 'closed' ? '#50C878' : '#FFC72C'}">●</span> ${injury.location}
        </div>
    `).join('');
}

window.selectInjuryFromList = (id) => {
    selectedInjury = injuries.find(i => i.id === id);
    displayInjuryDetails(selectedInjury);
    renderInjuryMarkers();
};

// ==========================================================
// ЗБЕРЕЖЕННЯ ТА ВИДАЛЕННЯ
// ==========================================================
async function deleteInjury(id) {
    if (!confirm("Видалити цю травму назавжди?")) return;
    try {
        await db.collection(INJURY_COLLECTION).doc(id).delete();
        alert("Видалено!");
        loadInjuriesFromFirebase();
    } catch (e) { console.error(e); }
}

function updateAthleteStatus() {
    const el = document.getElementById('athlete-status-display');
    if (!el) return;
    const hasActive = injuries.some(i => i.status === 'active');
    el.innerHTML = `Статус: <span style="color:${hasActive ? '#FFC72C' : '#50C878'}">${hasActive ? 'Відновлення' : 'Здоровий'}</span>`;
}

// Ініціалізація форми
document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    
    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const pain = form.querySelector('input[name="pain"]:checked')?.value;
            const date = document.getElementById('injury-date').value;
            const coordX = document.getElementById('coordX').value;
            
            if (!coordX) {
                alert("Будь ласка, спочатку клікніть на чоловічка!");
                return;
            }

            const data = {
                userId: currentUser.uid,
                location: document.getElementById('injury-location').value,
                date: date,
                pain: pain,
                notes: document.getElementById('injury-notes').value,
                coordX: coordX,
                coordY: document.getElementById('coordY').value,
                status: 'active'
            };

            try {
                if (selectedInjury) {
                    const newHistory = [...(selectedInjury.painHistory || []), {date, pain}];
                    await db.collection(INJURY_COLLECTION).doc(selectedInjury.id).update({
                        ...data,
                        painHistory: newHistory
                    });
                } else {
                    await db.collection(INJURY_COLLECTION).add({
                        ...data,
                        painHistory: [{date, pain}]
                    });
                }
                alert("Дані збережено!");
                loadInjuriesFromFirebase();
                form.reset();
            } catch (e) { console.error(e); }
        };
    }
});
