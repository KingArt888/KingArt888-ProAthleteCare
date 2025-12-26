// ==========================================================
// 1. СТАН ТА КОНСТАНТИ
// ==========================================================
const INJURY_COLLECTION = 'injuries';
let currentUserId = null;
let injuries = [];
let selectedId = null; // Для відстеження обраної травми (редагування/видалення)

const getToday = () => new Date().toISOString().split('T')[0];

// СЛУХАЧ АВТОРИЗАЦІЇ (Виправлено для анонімного входу)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Атлет авторизований:", currentUserId);
            loadInjuriesFromFirebase();
        } else {
            // Якщо користувач не увійшов, пробуємо анонімний вхід (як у Wellness)
            try {
                await firebase.auth().signInAnonymously();
            } catch (e) {
                console.error("Помилка анонімного входу:", e);
            }
        }
    });
}

// ==========================================================
// 2. ФУНКЦІЇ FIREBASE
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
        console.error("Помилка завантаження травм:", e); 
    }
}

// Функція видалення травми
async function deleteInjury(id) {
    if (!confirm("Видалити цей запис про травму?")) return;
    try {
        await db.collection(INJURY_COLLECTION).doc(id).delete();
        loadInjuriesFromFirebase(); // Оновлюємо карту
        document.getElementById('injury-form').reset();
        selectedId = null;
        alert("Запис видалено");
    } catch (e) {
        console.error("Помилка видалення:", e);
    }
}

// ==========================================================
// 3. ІНТЕРФЕЙС
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
        
        selectedId = null; // Нова травма
        document.getElementById('injury-form').reset();
        document.getElementById('injury-date').value = getToday();
        
        // Змінюємо текст кнопки
        const submitBtn = document.querySelector('#injury-form .gold-button');
        if (submitBtn) submitBtn.textContent = "Записати травму";
    };
}

function renderInjuryMarkers() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;

    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(injury => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        // Колір залежить від рівня болю
        const markerColor = injury.pain >= 7 ? '#FF0000' : (injury.pain >= 4 ? '#FFA500' : '#DA3E52');
        
        el.style.cssText = `
            position: absolute; width: 16px; height: 16px;
            border-radius: 50%; border: 2px solid white;
            transform: translate(-50%, -50%); cursor: pointer;
            background-color: ${markerColor}; 
            left: ${injury.coordX}%; top: ${injury.coordY}%;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            z-index: 10;
        `;

        el.onclick = (e) => {
            e.stopPropagation();
            selectedId = injury.id;
            
            document.getElementById('injury-location').value = injury.location;
            document.getElementById('injury-notes').value = injury.notes || "";
            document.getElementById('injury-date').value = injury.date;
            document.getElementById('coordX').value = injury.coordX;
            document.getElementById('coordY').value = injury.coordY;
            
            const radio = document.querySelector(`input[name="pain"][value="${injury.pain}"]`);
            if (radio) radio.checked = true;

            // Ховаємо тимчасовий маркер кліку
            const clickMarker = document.getElementById('click-marker');
            if (clickMarker) clickMarker.style.display = 'none';

            // Оновлюємо кнопку для можливості видалення (опціонально)
            const submitBtn = document.querySelector('#injury-form .gold-button');
            if (submitBtn) submitBtn.textContent = "Оновити дані (або видалити кнопкою)";
            
            alert(`Обрано: ${injury.location}. Можна переглянути або змінити дані.`);
        };
        container.appendChild(el);
    });
}

// ==========================================================
// 4. ЗАПУСК
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    setupBodyMap();
    document.getElementById('injury-date').value = getToday();

    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentUserId) return alert("Помилка авторизації! Спробуйте оновити сторінку.");

            const data = {
                userId: currentUserId,
                location: document.getElementById('injury-location').value,
                date: document.getElementById('injury-date').value,
                pain: parseInt(form.querySelector('input[name="pain"]:checked')?.value || 1),
                notes: document.getElementById('injury-notes').value,
                coordX: document.getElementById('coordX').value,
                coordY: document.getElementById('coordY').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                if (selectedId) {
                    // Оновлення існуючої
                    await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
                    alert("Дані оновлено!");
                } else {
                    // Створення нової
                    await db.collection(INJURY_COLLECTION).add(data);
                    alert("Травму записано в ProAtletCare!");
                }
                
                loadInjuriesFromFirebase();
                form.reset();
                document.getElementById('injury-date').value = getToday();
                selectedId = null;
                const clickMarker = document.getElementById('click-marker');
                if (clickMarker) clickMarker.style.display = 'none';
            } catch (err) { 
                console.error("Firebase Error:", err);
                alert("Помилка доступу. Перевірте правила безпеки в консолі Firebase.");
            }
        };
    }
});
