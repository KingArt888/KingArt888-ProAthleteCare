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
            console.log("Авторизовано:", currentUserId);
            loadInjuriesFromFirebase();
        } else {
            firebase.auth().signInAnonymously();
        }
    });
}

// 2. ЗАВАНТАЖЕННЯ ДАНИХ (БЕЗ orderBy у запиті, щоб уникнути помилок індексів)
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => injuries.push({ id: doc.id, ...doc.data() }));

        // Сортуємо дані в коді (це надійніше для Firebase)
        injuries.sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log("Завантажено травм:", injuries.length);
        refreshUI();
    } catch (e) { 
        console.error("Помилка завантаження Firebase:", e);
        alert("Помилка завантаження даних. Перевірте консоль.");
    }
}

function refreshUI() {
    renderPoints();
    renderInjuryList();
    updatePainChart();
}

// 3. ТОЧКИ НА ТІЛІ (Хронологічна логіка)
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    // Визначаємо ОСТАННІЙ стан для кожної локації
    const latestStatusPerLocation = {};
    injuries.forEach(inj => {
        // Оскільки ми вже відсортували injuries за датою, 
        // кожна наступна травма з тією ж локацією буде перезаписувати попередню
        latestStatusPerLocation[inj.location] = inj; 
    });

    Object.values(latestStatusPerLocation).forEach(inj => {
        if (!inj.coordX || !inj.coordY) return;

        const el = document.createElement('div');
        el.className = 'injury-marker';
        
        const isHealed = parseInt(inj.pain) === 0;
        const markerColor = isHealed ? GOLD_COLOR : RED_MARKER;

        el.style.cssText = `
            position: absolute; width: 12px; height: 12px; 
            border-radius: 50%; border: 2px solid white; 
            transform: translate(-50%, -50%); cursor: pointer; 
            background-color: ${markerColor}; 
            box-shadow: 0 0 10px ${markerColor};
            left: ${inj.coordX}%; top: ${inj.coordY}%; z-index: 100;
        `;
        
        el.onclick = (e) => { 
            e.stopPropagation(); 
            activeLocationFilter = inj.location;
            refreshUI();
        };
        container.appendChild(el);
    });
}

// 4. ГРАФІК
function updatePainChart() {
    const canvas = document.getElementById('painChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (painChartInstance) painChartInstance.destroy();

    const displayData = activeLocationFilter 
        ? injuries.filter(i => i.location === activeLocationFilter)
        : injuries;

    if (displayData.length === 0) return;

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayData.map(i => i.date),
            datasets: [{
                label: activeLocationFilter || "Загальна історія",
                data: displayData.map(i => i.pain),
                borderColor: GOLD_COLOR,
                backgroundColor: 'rgba(255, 199, 44, 0.1)',
                tension: 0.3,
                fill: true
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

// 5. СПИСОК (ХРОНОЛОГІЯ)
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    let html = activeLocationFilter 
        ? `<div style="color: #FFC72C; margin-bottom: 10px; font-weight: bold; display:flex; justify-content: space-between;">
            <span>Історія: ${activeLocationFilter}</span>
            <span onclick="activeLocationFilter=null; refreshUI();" style="color: #888; cursor:pointer; font-size: 0.8em;">✖ Скинути фільтр</span>
           </div>`
        : "";

    // У списку показуємо від найновіших до найстаріших
    const sortedDesc = [...injuries].reverse();
    const filtered = activeLocationFilter 
        ? sortedDesc.filter(i => i.location === activeLocationFilter)
        : sortedDesc;

    if (filtered.length === 0) {
        listElement.innerHTML = '<p class="placeholder-text">Записів не знайдено.</p>';
        return;
    }

    html += filtered.map(inj => `
        <div style="background: #1a1a1a; padding: 12px; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid ${parseInt(inj.pain) === 0 ? GOLD_COLOR : RED_MARKER};">
            <div style="display: flex; justify-content: space-between;">
                <strong style="color: ${GOLD_COLOR}">${inj.location}</strong>
                <span style="color: #888; font-size: 0.8em;">${inj.date}</span>
            </div>
            <div style="color: #ccc; font-size: 0.9em; margin-top: 5px;">Біль: ${inj.pain}/10. ${inj.notes || ''}</div>
            <div style="margin-top: 8px; border-top: 1px solid #333; padding-top: 5px;">
                <button onclick="editEntry('${inj.id}')" style="background:none; border:none; color:gold; cursor:pointer; font-size:0.8em;">Редагувати</button>
                <button onclick="deleteEntry('${inj.id}')" style="background:none; border:none; color:${RED_MARKER}; cursor:pointer; font-size:0.8em; margin-left:10px;">Видалити</button>
            </div>
        </div>
    `).join('');

    listElement.innerHTML = html;
}

// 6. КЕРУВАННЯ ФОРМОЮ
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
    
    document.getElementById('save-injury-button').textContent = "Зберегти зміни";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteEntry = async (id) => {
    if (confirm("Видалити цей запис?")) {
        await db.collection(INJURY_COLLECTION).doc(id).delete();
        loadInjuriesFromFirebase();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    
    document.getElementById('injury-date').value = getToday();

    if (map) {
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
            document.getElementById('save-injury-button').textContent = "Додати запис у хронологію";
        };
    }

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
            serverTimestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            if (selectedId) {
                await db.collection(INJURY_COLLECTION).doc(selectedId).update(data);
            } else {
                await db.collection(INJURY_COLLECTION).add(data);
            }
            alert("Дані ProAtletCare оновлено!");
            loadInjuriesFromFirebase();
        } catch (err) { 
            console.error("Помилка збереження:", err);
            alert("Помилка при збереженні."); 
        }
    };
});
