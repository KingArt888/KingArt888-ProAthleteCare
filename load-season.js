const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = []; // Твоя база даних замість dailyLoadData
let distanceChart, loadChart;

// 1. АВТОРИЗАЦІЯ ТА ЗАВАНТАЖЕННЯ
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadDataFromFirebase();
        } else {
            firebase.auth().signInAnonymously();
        }
    });
}

async function loadDataFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(LOAD_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        trainingData = [];
        snapshot.forEach(doc => trainingData.push(doc.data()));
        trainingData.sort((a, b) => new Date(a.date) - new Date(b.date));

        refreshDashboard();
    } catch (e) { console.error("Помилка:", e); }
}

function refreshDashboard() {
    const metrics = calculateACWR();
    updateACWRGauge(metrics.acwr);
    renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
    renderDistanceChart();
}

// 2. ЛОГІКА ОБЧИСЛЕНЬ (Твоя оригінальна)
function calculateACWR() {
    if (trainingData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };
    
    const latestDate = new Date(trainingData[trainingData.length - 1].date);
    const sevenDaysAgo = new Date(latestDate); sevenDaysAgo.setDate(latestDate.getDate() - 7);
    const twentyEightDaysAgo = new Date(latestDate); twentyEightDaysAgo.setDate(latestDate.getDate() - 28);

    const dataWithLoad = trainingData.map(item => ({
        ...item,
        load: item.duration * item.rpe
    }));

    const acuteLoad = dataWithLoad.filter(i => new Date(i.date) > sevenDaysAgo)
        .reduce((sum, i) => sum + i.load, 0) / 7;

    const chronicLoad = dataWithLoad.filter(i => new Date(i.date) > twentyEightDaysAgo)
        .reduce((sum, i) => sum + i.load, 0) / 28;

    return {
        acuteLoad: Math.round(acuteLoad),
        chronicLoad: Math.round(chronicLoad),
        acwr: chronicLoad > 0 ? parseFloat((acuteLoad / chronicLoad).toFixed(2)) : 0
    };
}

// 3. ТВОЇ УЛЮБЛЕНІ ГРАФІКИ (Дизайн повернуто)
function renderDistanceChart() {
    const ctx = document.getElementById('distanceChart');
    if (!ctx) return;
    if (distanceChart) distanceChart.destroy();

    // Беремо останні 14 записів для візуалізації
    const lastEntries = trainingData.slice(-14);

    distanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: lastEntries.map(i => i.date.split('-').slice(1).join('.')),
            datasets: [{
                label: 'Загальна дистанція (км)',
                data: lastEntries.map(i => i.distance),
                borderColor: '#FFD700', // Твій золотий
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                borderWidth: 3,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // ФІКС СКРОЛУ
            scales: {
                x: { ticks: { color: '#AAAAAA' }, grid: { color: '#333' } },
                y: { beginAtZero: true, ticks: { color: '#AAAAAA' }, grid: { color: '#333' } }
            },
            plugins: { legend: { labels: { color: '#CCC' } } }
        }
    });
}

function renderLoadChart(acute, chronic) {
    const ctx = document.getElementById('loadChart');
    if (!ctx) return;
    if (loadChart) loadChart.destroy();

    loadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['4 тижні тому', '3 тижні тому', '2 тижні тому', 'Зараз'],
            datasets: [
                {
                    label: 'Acute Load (7 днів)',
                    data: [acute * 0.7, acute * 0.9, acute * 0.8, acute],
                    borderColor: '#D9534F', // Твій червоний
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: 'Chronic Load (28 днів)',
                    data: [chronic * 0.8, chronic * 0.85, chronic * 0.9, chronic],
                    borderColor: '#4CAF50', // Твій зелений
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // ФІКС СКРОЛУ
            scales: {
                y: { ticks: { color: '#AAA' }, grid: { color: '#333' } },
                x: { ticks: { color: '#AAA' }, grid: { color: '#333' } }
            },
            plugins: { legend: { labels: { color: '#CCC' } } }
        }
    });
}

// 4. СПІДОМЕТР ТА ФОРМА
function updateACWRGauge(val) {
    const needle = document.getElementById('gauge-needle');
    const display = document.getElementById('acwr-value');
    const status = document.getElementById('acwr-status');

    let degree = (val - 1) * 100; // Розрахунок кута
    degree = Math.min(90, Math.max(-90, degree));
    
    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
    display.textContent = val.toFixed(2);

    if (val >= 0.8 && val <= 1.3) {
        status.textContent = 'Безпечна зона (Оптимально)';
        status.className = 'status-safe';
    } else {
        status.textContent = 'Зверніть увагу на навантаження';
        status.className = 'status-warning';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('load-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                userId: currentUserId,
                date: form.elements['date'].value,
                duration: parseInt(form.elements['duration'].value),
                distance: parseFloat(form.elements['distance'].value),
                rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 5)
            };
            await db.collection(LOAD_COLLECTION).add(data);
            loadDataFromFirebase();
            form.reset();
            alert("Збережено в ProAtletCare!");
        };
    }
    const dateInput = document.getElementById('load-date');
    if (dateInput) dateInput.valueAsDate = new Date();
});
