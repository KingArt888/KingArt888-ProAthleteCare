// ==========================================================
// 1. ІНІЦІАЛІЗАЦІЯ ТА СТАН
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedInjury = null;
let currentPainChart = null;

// Функція для поточної дати
const getToday = () => new Date().toISOString().split('T')[0];

// СЛУХАЧ АВТОРИЗАЦІЇ
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUserId = user.uid; // Отримуємо унікальний ID користувача
        console.log("Авторизовано як:", currentUserId);
        loadInjuriesFromFirebase();
    } else {
        console.warn("Користувач не увійшов в систему");
        // Тут можна перенаправити на сторінку логіну: window.location.href = 'login.html';
    }
});

// ==========================================================
// 2. РОБОТА З ДАНИМИ (FIREBASE)
// ==========================================================

async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        // Фільтруємо дані: завантажуємо ТІЛЬКИ ті, де userId збігається
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => {
            injuries.push({ id: doc.id, ...doc.data() });
        });
        renderInjuryMarkers();
    } catch (e) { 
        console.error("Помилка завантаження:", e); 
    }
}

async function saveInjury(data) {
    try {
        if (selectedInjury) {
            // Оновлюємо існуючу травму
            await db.collection(INJURY_COLLECTION).doc(selectedInjury.id).update(data);
        } else {
            // Створюємо нову
            await db.collection(INJURY_COLLECTION).add(data);
        }
        alert("Збережено успішно!");
        loadInjuriesFromFirebase();
        resetInjuryForm();
    } catch (e) {
        console.error("Помилка збереження:", e);
    }
}

// ==========================================================
// 3. ІНТЕРФЕЙС ТА КАРТА
// ==========================================================

function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    
    if (!mapContainer || !marker) return;

    mapContainer.onclick = function(e) {
        if (e.target.classList.contains('injury-marker')) return;

        const rect = mapContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        marker.style.display = 'block';
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        selectedInjury = null; // Скидаємо вибір для нового запису
    };
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;

    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        el.style.cssText = `
            position: absolute; width: 16px; height: 16px;
            border-radius: 50%; border: 2px solid white;
            transform: translate(-50%, -50%); cursor: pointer; z-index: 100;
            background-color: ${injury.status === 'closed' ? '#50C878' : '#DA3E52'};
            left: ${injury.coordX}%; top: ${injury.coordY}%;
        `;

        el.onclick = (e) => {
            e.stopPropagation();
            selectedInjury = injury;
            fillFormWithInjury(injury);
        };
        container.appendChild(el);
    });
}

function fillFormWithInjury(injury) {
    document.getElementById('injury-location').value = injury.location;
    document.getElementById('injury-date').value = injury.date;
    document.getElementById('injury-notes').value = injury.notes || "";
    document.getElementById('coordX').value = injury.coordX;
    document.getElementById('coordY').value = injury.coordY;

    const painRadio = document.querySelector(`input[name="pain"][value="${injury.pain}"]`);
    if (painRadio) painRadio.checked = true;

    renderPainChart(injury);
}

function resetInjuryForm() {
    document.getElementById('injury-form').reset();
    document.getElementById('click-marker').style.display = 'none';
    document.getElementById('coordX').value = "";
    document.getElementById('injury-date').value = getToday();
    selectedInjury = null;
}

// ==========================================================
// 4. ГРАФІК ТА ЗАПУСК
// ==========================================================

function renderPainChart(injury) {
    const ctx = document.getElementById('painChart');
    if (!ctx) return;
    if (currentPainChart) currentPainChart.destroy();
    
    const history = injury.painHistory || [{date: injury.date, pain: injury.pain}];
    currentPainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.date),
            datasets: [{
                label: `Біль: ${injury.location}`,
                data: history.map(h => h.pain),
                borderColor: '#FFC72C',
                tension: 0.3,
                fill: false
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    document.getElementById('injury-date').value = getToday();

    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            if (!currentUserId) return alert("Помилка: ви не авторизовані!");
            
            const x = document.getElementById('coordX').value;
            if (!x) return alert("Клікніть на силует!");

            const data = {
                userId: currentUserId, // Прив'язка до конкретного користувача
                location: document.getElementById('injury-location').value,
                date: document.getElementById('injury-date').value,
                pain: parseInt(form.querySelector('input[name="pain"]:checked')?.value || 1),
                notes: document.getElementById('injury-notes').value,
                coordX: x,
                coordY: document.getElementById('coordY').value,
                status: 'active'
            };
            saveInjury(data);
        };
    }
});
