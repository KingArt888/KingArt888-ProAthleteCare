// ==========================================================
// 1. КОНСТАНТИ ТА СТИЛЬ ProAtletCare
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;

const GOLD_COLOR = 'rgb(255, 215, 0)';
const getToday = () => new Date().toISOString().split('T')[0];

// АВТОРИЗАЦІЯ
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

// ==========================================================
// 2. РОБОТА З ДАНИМИ (ДИНАМІКА)
// ==========================================================
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .orderBy("date", "desc") // Сортуємо для динаміки
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        renderInjuryMarkers();
        renderInjuryList(); // Показуємо текстову динаміку під картою
    } catch (e) { 
        console.error("Помилка завантаження:", e);
    }
}

// ==========================================================
// 3. КАРТА ТА ФОРМА
// ==========================================================
function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const notesSection = document.getElementById('notes-section'); 
    
    if (!mapContainer || !marker) return;

    mapContainer.onclick = function(e) {
        if (e.target.classList.contains('injury-marker')) return;
        
        const rect = mapContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        marker.style.display = 'block';
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        marker.style.borderColor = GOLD_COLOR;
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        // ВІДКРИВАЄМО ВІКНО ДОПИСУ
        if (notesSection) notesSection.style.display = 'block';
        
        selectedId = null; 
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
        document.querySelector('.gold-button').textContent = "Записати травму";
    };
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        
        // Твій стиль маркерів
        const color = injury.pain >= 7 ? '#FF0000' : (injury.pain >= 4 ? '#FFA500' : GOLD_COLOR);
        
        el.style.cssText = `
            position: absolute; width: 16px; height: 16px; 
            border-radius: 50%; border: 2px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${color}; left: ${injury.coordX}%; top: ${injury.coordY}%; 
            z-index: 10; box-shadow: 0 0 10px rgba(0,0,0,0.8);
        `;

        el.onclick = (e) => {
            e.stopPropagation();
            selectedId = injury.id;
            document.getElementById('notes-section').style.display = 'block';
            document.getElementById('injury-location').value = injury.location;
            document.getElementById('injury-notes').value = injury.notes || "";
            document.getElementById('injury-date').value = injury.date;
            const radio = document.querySelector(`input[name="pain"][value="${injury.pain}"]`);
            if (radio) radio.checked = true;
            document.querySelector('.gold-button').textContent = "Оновити стан";
        };
        container.appendChild(el);
    });
}

// Функція для відображення списку динаміки під картою
function renderInjuryList() {
    const listContainer = document.getElementById('injury-history-list');
    if (!listContainer) return;

    if (injuries.length === 0) {
        listContainer.innerHTML = '<p style="color: #666;">Історія травм порожня</p>';
        return;
    }

    listContainer.innerHTML = injuries.map(inj => `
        <div style="border-left: 3px solid ${GOLD_COLOR}; background: #111; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between;">
                <strong style="color: ${GOLD_COLOR}">${inj.location}</strong>
                <small style="color: #888;">${inj.date}</small>
            </div>
            <p style="margin: 5px 0; font-size: 0.9em;">Біль: ${inj.pain}/10 | Лікування: ${inj.notes || 'не вказано'}</p>
        </div>
    `).join('');
}

// ==========================================================
// 4. ЗБЕРЕЖЕННЯ
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
                if (selectedId) {
                    await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
                } else {
                    await db.collection(INJURY_COLLECTION).add(data);
                }
                loadInjuriesFromFirebase();
                alert("Дані ProAtletCare оновлено!");
            } catch (err) { alert("Помилка: " + err.message); }
        };
    }
});
