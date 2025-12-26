// ==========================================================
// 1. КОНСТАНТИ ТА КОЛЬОРИ ProAtletCare
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null;

const RED_MARKER = '#DA3E52'; // Твій фірмовий червоний для травм
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
// 2. ДИНАМІКА ТА ВІДОБРАЖЕННЯ
// ==========================================================
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .orderBy("date", "desc")
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));
        renderInjuryMarkers();
        renderInjuryHistory(); // Оновлюємо блок динаміки
    } catch (e) { 
        console.error("Помилка динаміки:", e);
    }
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        
        // ТОЧКА ТЕПЕР МЕНША (10px замість 16px) ТА ЗАВЖДИ ЧЕРВОНА
        el.style.cssText = `
            position: absolute; 
            width: 10px; height: 10px; 
            border-radius: 50%; 
            border: 1px solid white; 
            transform: translate(-50%, -50%); 
            cursor: pointer; 
            background-color: ${RED_MARKER}; 
            left: ${injury.coordX}%; 
            top: ${injury.coordY}%; 
            z-index: 10; 
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
        `;

        el.onclick = (e) => {
            e.stopPropagation();
            selectedId = injury.id;
            
            const notesSection = document.getElementById('notes-section');
            if (notesSection) notesSection.style.display = 'block';

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

// ФУНКЦІЯ ДИНАМІКИ ВІДНОВЛЕННЯ
function renderInjuryHistory() {
    const historyList = document.getElementById('injury-history-list');
    if (!historyList) return;

    if (injuries.length === 0) {
        historyList.innerHTML = '<p style="color: #666; font-size: 0.9em;">Історія порожня</p>';
        return;
    }

    // Виводимо список останніх записів
    historyList.innerHTML = injuries.map(inj => `
        <div style="border-bottom: 1px solid rgba(255,215,0,0.2); padding: 8px 0; font-size: 0.85em; color: white;">
            <span style="color: ${GOLD_COLOR}">${inj.date}</span> — 
            <strong>${inj.location}</strong> 
            (Біль: ${inj.pain}/10)
            <div style="color: #aaa; font-style: italic;">${inj.notes || ''}</div>
        </div>
    `).join('');
}

// ==========================================================
// 3. УПРАВЛІННЯ КАРТОЮ
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

        // КРУЖОК КЛІКУ (ЧЕРВОНИЙ)
        marker.style.display = 'block';
        marker.style.width = '12px';
        marker.style.height = '12px';
        marker.style.backgroundColor = 'transparent';
        marker.style.border = `2px solid ${RED_MARKER}`;
        marker.style.left = x + '%';
        marker.style.top = y + '%';
        
        document.getElementById('coordX').value = x.toFixed(2);
        document.getElementById('coordY').value = y.toFixed(2);
        
        if (notesSection) notesSection.style.display = 'block';
        
        selectedId = null; 
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
        document.querySelector('.gold-button').textContent = "Записати травму";
    };
}

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
                alert("Дані збережено");
            } catch (err) { console.error(err); }
        };
    }
});
