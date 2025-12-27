const INJURY_COLLECTION = 'injuries';
let allInjuries = [];
let adminChart = null;

// 1. ЗАВАНТАЖЕННЯ ВСІХ ДАНИХ (БЕЗ ФІЛЬТРА userId)
db.collection(INJURY_COLLECTION).onSnapshot((snapshot) => {
    allInjuries = [];
    snapshot.forEach(doc => {
        allInjuries.push({ id: doc.id, ...doc.data() });
    });
    renderAthletesList();
});

// 2. ГРУПУВАННЯ ТА ВІДОБРАЖЕННЯ СПИСКУ АТЛЕТІВ
function renderAthletesList() {
    const list = document.getElementById('athletes-list');
    // Групуємо травми за userId
    const athletesMap = {};
    
    allInjuries.forEach(inj => {
        if (!athletesMap[inj.userId]) {
            athletesMap[inj.userId] = {
                id: inj.userId,
                injuries: [],
                lastUpdate: ""
            };
        }
        athletesMap[inj.userId].injuries.push(inj);
    });

    const athletes = Object.values(athletesMap);

    list.innerHTML = athletes.map(athlete => {
        const activeInjuries = athlete.injuries.filter(i => {
            const last = i.history[i.history.length - 1];
            return parseInt(last.pain) > 0;
        });

        return `
            <div class="athlete-card" onclick="showAthleteDetails('${athlete.id}')">
                <div>
                    <div style="font-size: 1.2em; font-weight: bold; color: gold;">Атлет #${athlete.id.substring(0, 5)}</div>
                    <div style="font-size: 0.9em; color: #888;">Всього травм в історії: ${athlete.injuries.length}</div>
                </div>
                <span class="status-badge ${activeInjuries.length > 0 ? 'status-recovering' : 'status-healthy'}">
                    ${activeInjuries.length > 0 ? `Відновлення (${activeInjuries.length})` : 'Здоровий'}
                </span>
            </div>
        `;
    }).join('') || '<p>Атлетів поки немає.</p>';
}

// 3. ДЕТАЛЬНИЙ ПЕРЕГЛЯД КОНКРЕТНОГО АТЛЕТА
window.showAthleteDetails = (userId) => {
    const athleteInjuries = allInjuries.filter(i => i.userId === userId);
    document.getElementById('athletes-list').style.display = 'none';
    document.getElementById('athlete-detail-view').style.display = 'block';
    document.getElementById('current-athlete-name').innerText = `Профіль атлета: #${userId.substring(0, 5)}`;

    renderAdminMarkers(athleteInjuries);
    // За замовчуванням показуємо графік першої травми
    if (athleteInjuries.length > 0) {
        showAdminChart(athleteInjuries[0].id);
    }
};

// 4. МАРКЕРИ ТА ГРАФІК (Аналогічно injury.js, але для адміна)
function renderAdminMarkers(athleteInjuries) {
    const container = document.getElementById('bodyMapContainer');
    container.querySelectorAll('.injury-marker').forEach(m => m.remove());

    athleteInjuries.forEach(inj => {
        const el = document.createElement('div');
        el.className = 'injury-marker';
        const last = inj.history[inj.history.length - 1];
        const color = parseInt(last.pain) === 0 ? '#FFC72C' : '#DA3E52';

        el.style.cssText = `
            position: absolute; width: 12px; height: 12px; border-radius: 50%;
            background: ${color}; left: ${inj.coordX}%; top: ${inj.coordY}%;
            border: 2px solid white; cursor: pointer; z-index: 100;
        `;
        el.onclick = () => showAdminChart(inj.id);
        container.appendChild(el);
    });
}

function showAdminChart(injuryId) {
    const inj = allInjuries.find(i => i.id === injuryId);
    const ctx = document.getElementById('painChartAdmin');
    if (adminChart) adminChart.destroy();

    adminChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: inj.history.map(h => h.date),
            datasets: [{
                label: `Біль: ${inj.location}`,
                data: inj.history.map(h => h.pain),
                borderColor: '#FFC72C',
                backgroundColor: 'rgba(255, 199, 44, 0.1)',
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Виводимо історію текстом
    document.getElementById('athlete-history-admin').innerHTML = inj.history.reverse().map(h => `
        <div style="background:#1a1a1a; padding:10px; border-radius:5px; margin-bottom:5px; font-size:0.8em;">
            <b style="color:gold;">${h.date}</b> — Біль: ${h.pain} <br> ${h.notes || ''}
        </div>
    `).join('');
}

window.closeDetails = () => {
    document.getElementById('athletes-list').style.display = 'block';
    document.getElementById('athlete-detail-view').style.display = 'none';
};
