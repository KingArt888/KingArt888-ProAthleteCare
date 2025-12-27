const INJURY_COLLECTION = 'injuries';
const RED_MARKER = '#DA3E52'; 
const GOLD_COLOR = '#FFC72C'; 

let injuries = [];
let currentUserId = null;
let selectedId = null; 
let activeLocationFilter = null; 
let painChartInstance = null;

const getToday = () => new Date().toISOString().split('T')[0];

// 1. ПЕРЕВІРКА АВТОРИЗАЦІЇ ТА РЕЖИМУ АДМІНА
const urlParams = new URLSearchParams(window.location.search);
const viewUserId = urlParams.get('userId');

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        currentUserId = viewUserId || user.uid;
        console.log("ProAtletCare: Активний профіль —", currentUserId);
        loadInjuriesFromFirebase();
    } else {
        window.location.href = "auth.html";
    }
});

// 2. ЗАВАНТАЖЕННЯ ДАНИХ
async function loadInjuriesFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(INJURY_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        injuries = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.history) {
                data.history = [{ date: data.date || getToday(), pain: data.pain || 0, notes: data.notes || "" }];
            }
            injuries.push({ id: doc.id, ...data });
        });
        refreshUI();
    } catch (e) { console.error("Firestore Error:", e); }
}

function refreshUI() {
    renderPoints();
    renderInjuryList();
    updatePainChart();
}

// 3. ТОЧКИ НА МАПІ
function renderPoints() {
    const container = document.getElementById('bodyMapContainer');
    if (!container) return;
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    injuries.forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        const lastEntry = inj.history[inj.history.length - 1];
        const isHealed = parseInt(lastEntry.pain) === 0;
        
        el.style.cssText = `
            position: absolute; width: 14px; height: 14px; 
            border-radius: 50%; border: 2px solid white; 
            background-color: ${isHealed ? GOLD_COLOR : RED_MARKER}; 
            left: ${inj.coordX}%; top: ${inj.coordY}%; transform: translate(-50%, -50%);
            z-index: 100; cursor: pointer;
            box-shadow: 0 0 10px ${isHealed ? GOLD_COLOR : RED_MARKER};
        `;
        
        el.onclick = (e) => { 
            e.stopPropagation(); 
            activeLocationFilter = inj.id; 
            refreshUI();
        };
        container.appendChild(el);
    });
}

// 4. ГРАФІК
function updatePainChart() {
    const ctx = document.getElementById('painChart');
    if (!ctx || !activeLocationFilter) return;
    if (painChartInstance) painChartInstance.destroy();

    const selectedInjury = injuries.find(i => i.id === activeLocationFilter);
    const history = [...selectedInjury.history].sort((a, b) => new Date(a.date) - new Date(b.date));

    painChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.map(h => h.date),
            datasets: [{
                label: `Біль: ${selectedInjury.location}`,
                data: history.map(h => h.pain),
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
            }
        }
    });
}

// 5. СПИСОК ТА ФОРМА
function renderInjuryList() {
    const listElement = document.getElementById('injury-list');
    if (!listElement) return;

    if (activeLocationFilter) {
        const inj = injuries.find(i => i.id === activeLocationFilter);
        const historySorted = [...inj.history].reverse();

        listElement.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <h4 style="color:gold;">📍 ${inj.location}</h4>
                <button onclick="activeLocationFilter=null; refreshUI();" class="gold-button" style="width:auto; padding:2px 10px;">Закрити</button>
            </div>
            ${historySorted.map((h, idx) => `
                <div style="background:#111; padding:10px; border-radius:5px; margin-bottom:5px; border-left:3px solid ${parseInt(h.pain) === 0 ? GOLD_COLOR : RED_MARKER};">
                    <small style="color:#888;">${h.date}</small> — <b>Біль: ${h.pain}</b>
                    <p style="margin:5px 0 0; font-size:0.9em;">${h.notes || ''}</p>
                </div>
            `).join('')}
            <button onclick="openUpdateMode('${inj.id}')" class="gold-button" style="margin-top:10px;">+ Додати запис</button>
        `;
    } else {
        listElement.innerHTML = injuries.length ? injuries.map(inj => `
            <div onclick="activeLocationFilter='${inj.id}'; refreshUI();" style="background:#1a1a1a; padding:10px; border-radius:5px; margin-bottom:8px; cursor:pointer;">
                <span style="color:gold;">${inj.location}</span>
            </div>
        `).join('') : '<p>Немає активних травм</p>';
    }
}

window.openUpdateMode = (id) => {
    selectedId = id;
    const inj = injuries.find(i => i.id === id);
    document.getElementById('injury-location').value = inj.location;
    document.getElementById('injury-location').disabled = true;
    document.getElementById('injury-date').value = getToday();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 6. ОБРОБКА КЛІКУ ПО МАПІ ТА САБМІТ ФОРМИ
document.addEventListener('DOMContentLoaded', () => {
    const map = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');

    if (map) {
        map.onclick = (e) => {
            if (e.target.classList.contains('injury-marker')) return;
            const rect = map.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            marker.style.left = x + '%'; marker.style.top = y + '%';
            document.getElementById('coordX').value = x.toFixed(2);
            document.getElementById('coordY').value = y.toFixed(2);
            
            selectedId = null;
            document.getElementById('injury-location').disabled = false;
            document.getElementById('injury-form').reset();
            document.getElementById('injury-date').value = getToday();
        };
    }

    const form = document.getElementById('injury-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const updateData = {
                date: document.getElementById('injury-date').value,
                pain: parseInt(document.querySelector('input[name="pain"]:checked')?.value || 0),
                notes: document.getElementById('injury-notes').value
            };

            try {
                if (selectedId) {
                    await db.collection(INJURY_COLLECTION).doc(selectedId).update({
                        history: firebase.firestore.FieldValue.arrayUnion(updateData)
                    });
                } else {
                    await db.collection(INJURY_COLLECTION).add({
                        userId: currentUserId,
                        location: document.getElementById('injury-location').value,
                        coordX: document.getElementById('coordX').value,
                        coordY: document.getElementById('coordY').value,
                        history: [updateData]
                    });
                }
                loadInjuriesFromFirebase();
                form.reset();
                marker.style.left = '-100px';
                alert("Збережено!");
            } catch (err) { alert("Помилка!"); }
        };
    }
});
