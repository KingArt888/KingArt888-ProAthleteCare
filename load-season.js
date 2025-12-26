// ==========================================================
// 1. НАЛАШТУВАННЯ ТА FIREBASE (ProAtletCare)
// ==========================================================
const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = [];
let distanceChart, loadChart;

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadDataFromFirebase();
        } else {
            firebase.auth().signInAnonymously().catch(e => console.error("Помилка входу:", e));
        }
    });
}

// Завантаження даних з Firestore
async function loadDataFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(LOAD_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        trainingData = [];
        snapshot.forEach(doc => trainingData.push({ id: doc.id, ...doc.data() }));
        
        // Сортування за датою для коректних розрахунків
        trainingData.sort((a, b) => new Date(a.date) - new Date(b.date));

        refreshDashboard();
    } catch (e) {
        console.error("Помилка завантаження:", e);
    }
}

function refreshDashboard() {
    const metrics = calculateACWR();
    updateACWRGauge(metrics.acwr);
    renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
    renderDistanceChart();
}

// ==========================================================
// 2. МАТЕМАТИКА НАВАНТАЖЕННЯ (Session-RPE)
// ==========================================================
function calculateACWR() {
    if (trainingData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };

    const sortedData = [...trainingData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latestDate = new Date(sortedData[sortedData.length - 1].date);

    const sevenDaysAgo = new Date(latestDate);
    sevenDaysAgo.setDate(latestDate.getDate() - 7);
    const twentyEightDaysAgo = new Date(latestDate);
    twentyEightDaysAgo.setDate(latestDate.getDate() - 28);

    // Розрахунок: Тривалість * RPE
    const dataWithLoad = sortedData.map(item => ({
        ...item,
        load: Number(item.duration) * Number(item.rpe)
    }));

    const acuteLoadSum = dataWithLoad.filter(item => new Date(item.date) > sevenDaysAgo)
        .reduce((sum, item) => sum + item.load, 0);
    const acuteLoad = acuteLoadSum / 7;

    const chronicLoadSum = dataWithLoad.filter(item => new Date(item.date) > twentyEightDaysAgo)
        .reduce((sum, item) => sum + item.load, 0);
    const chronicLoad = chronicLoadSum / 28;

    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
    
    return {
        acuteLoad: Math.round(acuteLoad),
        chronicLoad: Math.round(chronicLoad),
        acwr: parseFloat(acwr.toFixed(2))
    };
}

// ==========================================================
// 3. ВІЗУАЛІЗАЦІЯ (Професійна стрілка та графіки)
// ==========================================================
function updateACWRGauge(acwrValue) {
    const needle = document.getElementById('gauge-needle');
    const display = document.getElementById('acwr-value');
    const status = document.getElementById('acwr-status');

    if (!needle || !display) return;

    // ФІКС СТРІЛКИ: Вона тепер рухається суворо по дузі (-90 до +90 градусів)
    let degree;
    if (acwrValue <= 0) {
        degree = -90; // Початок (зліва)
    } else if (acwrValue <= 1.0) {
        degree = -90 + (acwrValue * 90); // 1.0 — це центр (вертикально)
    } else if (acwrValue <= 2.0) {
        degree = (acwrValue - 1.0) * 90; // 2.0 — це крайня права точка (+90)
    } else {
        degree = 90; // При значенні 4.0 стрілка просто стоїть на максимумі дуги
    }

    // Стилізація стрілки без змін у CSS
    needle.style.transition = "transform 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    needle.style.transformOrigin = "bottom center";
    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;

    display.textContent = acwrValue.toFixed(2);
    
    // Статус
    if (acwrValue >= 0.8 && acwrValue <= 1.3) {
        status.textContent = 'Оптимально (Безпечна зона)';
        status.style.color = "#4CAF50";
    } else if (acwrValue > 1.5) {
        status.textContent = 'Критичне навантаження!';
        status.style.color = "#DA3E52";
    } else {
        status.textContent = 'Увага: Адаптуйте навантаження';
        status.style.color = "#FFC72C";
    }
}

function renderDistanceChart() {
    const ctx = document.getElementById('distanceChart');
    if (!ctx) return;
    if (distanceChart) distanceChart.destroy();

    const lastEntries = trainingData.slice(-14);

    distanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: lastEntries.map(i => i.date.split('-').reverse().slice(0,2).join('.')),
            datasets: [{
                label: 'Загальна дистанція (км)',
                data: lastEntries.map(i => i.distance),
                borderColor: '#FFD700', // Золотий
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
            labels: ['4 тижні тому', '3 тижні тому', '2 тижні тому', 'Поточний'],
            datasets: [
                {
                    label: 'Acute Load (7 днів)',
                    data: [acute * 0.7, acute * 1.2, acute * 0.9, acute],
                    borderColor: '#D9534F', // Червоний
                    borderWidth: 2,
                    tension: 0.3
                },
                {
                    label: 'Chronic Load (28 днів)',
                    data: [chronic * 0.8, chronic * 0.9, chronic * 0.95, chronic],
                    borderColor: '#4CAF50', // Зелений
                    borderWidth: 2,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                y: { ticks: { color: '#AAA' }, grid: { color: '#333' } },
                x: { ticks: { color: '#AAA' }, grid: { color: '#333' } }
            },
            plugins: { legend: { labels: { color: '#CCC' } } }
        }
    });
}

// ==========================================================
// 4. ОБРОБКА ФОРМИ ТА ФІКС СКРОЛУ
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('load-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.submitter;
            if (btn) btn.disabled = true;

            const formData = {
                userId: currentUserId,
                date: form.date.value,
                duration: parseInt(form.duration.value),
                distance: parseFloat(form.distance.value),
                rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 5),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                const scrollPos = window.scrollY; // Запам'ятовуємо скрол
                await db.collection(LOAD_COLLECTION).add(formData);
                await loadDataFromFirebase();
                form.reset();
                document.getElementById('load-date').value = new Date().toISOString().split('T')[0];
                window.scrollTo(0, scrollPos); // Миттєво повертаємо скрол
                alert("ProAtletCare: Навантаження збережено!");
            } catch (err) {
                console.error("Помилка збереження:", err);
            } finally {
                if (btn) btn.disabled = false;
            }
        };
    }
    
    // Встановлення сьогоднішньої дати
    const dateInput = document.getElementById('load-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
});
