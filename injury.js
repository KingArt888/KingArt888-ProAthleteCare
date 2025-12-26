ТЕПЕР ДАВАЙ ДОРОБИМО INJYRY STORY // ==========================================================
// 1. СТАН ТА КОНСТАНТИ
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedInjury = null;

const getToday = () => new Date().toISOString().split('T')[0];

// СЛУХАЧ АВТОРИЗАЦІЇ
// Перевіряємо, чи підключена бібліотека Auth
if (typeof firebase.auth === "function") {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUserId = user.uid;
            loadInjuriesFromFirebase();
        } else {
            console.warn("Атлет не авторизований");
        }
    });
} else {
    console.error("Бібліотека Firebase Auth не знайдена! Додайте її в HTML.");
}

// ==========================================================
// 2. ФУНКЦІЇ ДЛЯ FIREBASE
// ==========================================================

async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
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

// ==========================================================
// 3. ІНТЕРФЕЙС (КАРТА ТА ФОРМА)
// ==========================================================

function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const notesSection = document.getElementById('notes-section'); // Поле коментаря з HTML
    
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
        
        // ПЕРЕКОНУЄМОСЯ, ЩО ПОЛЕ КОМЕНТАРЯ ВИДИМЕ
        if (notesSection) notesSection.style.display = 'block';

        selectedInjury = null;
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
    };
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    const notesSection = document.getElementById('notes-section');
    if (!container) return;

    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        el.style.cssText = `
            position: absolute; width: 14px; height: 14px;
            border-radius: 50%; border: 2px solid white;
            transform: translate(-50%, -50%); cursor: pointer;
            background-color: #DA3E52; left: ${injury.coordX}%; top: ${injury.coordY}%;
        `;

        el.onclick = (e) => {
            e.stopPropagation();
            selectedInjury = injury;
            
            // Показуємо коментар
            if (notesSection) notesSection.style.display = 'block';

            document.getElementById('injury-location').value = injury.location;
            document.getElementById('injury-notes').value = injury.notes || "";
            document.getElementById('injury-date').value = injury.date;
            
            const radio = document.querySelector(`input[name="pain"][value="${injury.pain}"]`);
            if (radio) radio.checked = true;
        };
        container.appendChild(el);
    });
}

// ==========================================================
// 4. ЗАПУСК
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    
    // ПРИМУСОВО ПОКАЗУЄМО ПОЛЕ ПРИ ЗАВАНТАЖЕННІ
    const notesSection = document.getElementById('notes-section');
    if (notesSection) notesSection.style.display = 'block';

    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUserId) return alert("Ви не авторизовані!");

            const data = {
                userId: currentUserId,
                location: document.getElementById('injury-location').value,
                date: document.getElementById('injury-date').value,
                pain: parseInt(form.querySelector('input[name="pain"]:checked')?.value || 1),
                notes: document.getElementById('injury-notes').value, // Зчитуємо ваш коментар
                coordX: document.getElementById('coordX').value,
                coordY: document.getElementById('coordY').value,
                status: 'active'
            };

            try {
                await db.collection(INJURY_COLLECTION).add(data);
                alert("Травму записано в ProAthleteCare!");
                loadInjuriesFromFirebase();
                form.reset();
                document.getElementById('injury-date').value = getToday();
            } catch (err) { console.error(err); }
        };
    }
});  
