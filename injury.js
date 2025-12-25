
// 1. КОНФІГУРАЦІЯ ТА БЕЗПЕЧНА ІНІЦІАЛІЗАЦІЯ DB
// ==========================================================
// Використовуємо var або перевірку, щоб уникнути помилки "already been declared"
if (typeof db === 'undefined') {
    var db = firebase.firestore();
}

const INJURY_COLLECTION = 'injuries';
let currentUser = null;
let injuries = [];
let selectedInjury = null;
let currentPainChart = null;

// Функція-хелпер для дати
function getTodayDateString() { 
    return new Date().toISOString().split('T')[0]; 
}

// Слухач авторизації (виправляє помилку firebase.auth)
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadInjuriesFromFirebase();
    } else {
        console.warn("Injury Story: Користувач не авторизований");
    }
});

// ==========================================================
// 2. ЗАВАНТАЖЕННЯ ДАНИХ
// ==========================================================
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
// 3. ЛОГІКА КАРТИ (ВІДНОВЛЕННЯ КЛІКІВ)
// ==========================================================
function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const notesSection = document.getElementById('notes-section');
    
    if (!mapContainer || !marker) return;

    mapContainer.addEventListener('click', function(e) {
        // Якщо клікнули на існуючий маркер — не ставимо нову точку
        if (e.target.classList.contains('injury-marker')) return;

        const rect = mapContainer.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        // Позиціонуємо маркер вибору
        marker.style.left = `${xPercent}%`;
        marker.style.top = `${yPercent}%`;
        
        // Записуємо координати в приховані поля
        const cx = document.getElementById('coordX');
        const cy = document.getElementById('coordY');
        if(cx) cx.value = xPercent.toFixed(2);
        if(cy) cy.value = yPercent.toFixed(2);
        
        selectedInjury = null;
        const form = document.getElementById('injury-form');
        if (form) {
            form.reset();
            const dateInput = document.getElementById('injury-date');
            if (dateInput) dateInput.value = getTodayDateString();
        }
        
        if (notesSection) notesSection.style.display = 'block';
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
        el.style.cssText = `
            position: absolute; width: 14px; height: 14px;
            border-radius: 50%; border: 2px solid white;
            transform: translate(-50%, -50%); cursor: pointer; z-index: 10;
        `;
        el.style.left = `${injury.coordX}%`;
        el.style.top = `${injury.coordY}%`;
        
        // Колір статусу
        el.style.backgroundColor = injury.status === 'closed' ? '#50C878' : '#DA3E52';

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
// 4. ВІДОБРАЖЕННЯ ТА СПИСОК
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
            <p>Статус: <strong>${injury.status === 'active' ? 'Активна' : 'Закрита'}</strong></p>
            <p>Біль: <span style="color:#DA3E52; font-weight:bold;">${latestPain}/10</span></p>
            <button onclick="deleteInjuryFromFirebase('${injury.id}')" style="background:#DA3E52; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px; margin-top:10px;">Видалити</button>
        </div>
    `;
}

// Захист від помилки innerHTML of null
function displayInjuryList() {
    const listContainer = document.getElementById('injury-list-all');
    if (!listContainer) return;

    if (injuries.length === 0) {
        listContainer.innerHTML = '<p class="placeholder-text">Список порожній.</p>';
        return;
    }

    listContainer.innerHTML = injuries.map(injury => `
        <div class="injury-item" style="padding:8px; border-bottom:1px solid #333; cursor:pointer;" onclick="selectInjuryById('${injury.id}')">
            <span style="color:${injury.status === 'closed' ? '#50C878' : '#FFC72C'}">●</span> ${injury.location}
        </div>
    `).join('');
}

window.selectInjuryById = (id) => {
    selectedInjury = injuries.find(i => i.id === id);
    if (selectedInjury) {
        displayInjuryDetails(selectedInjury);
        renderInjuryMarkers();
    }
};

// ==========================================================
// 5. ЗБЕРЕЖЕННЯ ТА СТАТУС
// ==========================================================
async function deleteInjuryFromFirebase(id) {
    if (!confirm("Видалити цю травму?")) return;
    try {
        await db.collection(INJURY_COLLECTION).doc(id).delete();
        loadInjuriesFromFirebase();
    } catch (e) { console.error(e); }
}

function updateAthleteStatus() {
    const el = document.getElementById('athlete-status-display');
    if (!el) return;
    const hasActive = injuries.some(i => i.status === 'active');
    el.innerHTML = `Статус: <span style="color:${hasActive ? '#FFC72C' : '#50C878'}">${hasActive ? 'Відновлення' : 'Здоровий'}</span>`;
}

// Запуск при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    
    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const painRadio = form.querySelector('input[name="pain"]:checked');
            const coordX = document.getElementById('coordX')?.value;
            
            if (!coordX || coordX === "") {
                alert("Спочатку натисніть на силует!");
                return;
            }

            const data = {
                userId: currentUser.uid,
                location: document.getElementById('injury-location').value,
                date: document.getElementById('injury-date').value,
                pain: painRadio ? painRadio.value : 0,
                notes: document.getElementById('injury-notes').value,
                coordX: coordX,
                coordY: document.getElementById('coordY').value,
                status: 'active'
            };

            try {
                if (selectedInjury) {
                    const newHistory = [...(selectedInjury.painHistory || []), {date: data.date, pain: data.pain}];
                    await db.collection(INJURY_COLLECTION).doc(selectedInjury.id).update({...data, painHistory: newHistory});
                } else {
                    await db.collection(INJURY_COLLECTION).add({...data, painHistory: [{date: data.date, pain: data.pain}]});
                }
                loadInjuriesFromFirebase();
                form.reset();
                alert("Збережено!");
            } catch (e) { console.error(e); }
        };
    }
});
