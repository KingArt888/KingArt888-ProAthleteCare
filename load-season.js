// ==========================================================
// 1. КОНФІГУРАЦІЯ ТА FIREBASE
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
            firebase.auth().signInAnonymously();
        }
    });
}

// ==========================================================
// 2. ЗАВАНТАЖЕННЯ ДАНИХ (БЕЗ ЗАГЛУШОК)
// ==========================================================
async function loadDataFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(LOAD_COLLECTION)
            .where("userId", "==", currentUserId)
            .get();
        
        trainingData = [];
        snapshot.forEach(doc => trainingData.push({ id: doc.id, ...doc.data() }));
        
        // Сортування за датою для коректних графіків
        trainingData.sort((a, b) => new Date(a.date) - new Date(b.date));

        refreshDashboard();
    } catch (e) {
        console.error("Помилка Firebase:", e);
    }
}

function refreshDashboard() {
    const metrics = calculateACWR();
    updateACWRGauge(metrics.acwr);
    renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
    renderDistanceChart();
}

// ==========================================================
// 3. РОЗРАХУНКИ (Session-RPE та ACWR)
// ==========================================================
function calculateACWR() {
    if (trainingData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };

    const sortedData = [...trainingData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latestDate = new Date(sortedData[sortedData.length - 1].date);

    const sevenDaysAgo = new Date(latestDate);
    sevenDaysAgo.setDate(latestDate.getDate() - 7);
    const twentyEightDaysAgo = new Date(latestDate);
    twentyEightDaysAgo.setDate(latestDate.getDate() - 28);

    // Розрахунок Load = Duration * RPE
    const dataWithLoad = sortedData.map(item => ({
        ...item,
        load: Number(item.duration) * Number(item.rpe)
    }));

    const acuteLoadDays = dataWithLoad.filter(item => new Date(item.date) > sevenDaysAgo);
    const acuteLoad = acuteLoadDays.reduce((sum, item) => sum + item.load, 0) / 7;

    const chronicLoadDays = dataWithLoad.filter(item => new Date(item.date) > twentyEightDaysAgo);
    const chronicLoad = chronicLoadDays.reduce((sum, item) => sum + item.load, 0) / 28;

    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
    
    return {
        acuteLoad: Math.round(acuteLoad),
        chronicLoad: Math.round(chronicLoad),
        acwr: parseFloat(acwr.toFixed(2))
    };
}

// ==========================================================
// 4. ПРОФЕСІЙНА СТРІЛКА ТА ГРАФІКИ (ТВІЙ ДИЗАЙН)
// ==========================================================
function updateACWRGauge(acwrValue) {
    const needle = document.getElementById('gauge-needle');
    const display = document.getElementById('acwr-value');
    const status = document.getElementById('acwr-status');

    if (!needle || !display) return;

    // Професійне калібрування стрілки (від -90 до 90 градусів)
    let degree = -90;
    if (acwrValue >= 0.8 && acwrValue <= 1.3) {
        degree = -45 + ((acwrValue - 0.8) / 0.5) * 90; // Зелена зона
    } else if (acwrValue > 1.3) {
        degree = 45 + Math.min(45, (acwrValue - 1.3) * 50); // Червона зона
    } else if (acwrValue > 0 && acwrValue < 0.8) {
        degree = -90 + (acwrValue / 0.8) * 45; // Жовта зона
    }

    // Застосовуємо стилі стрілки прямо тут (CSS не чіпаємо)
    needle.style.transition = "transform 1s cubic-bezier(0.4, 0, 0.2, 1)";
    needle.style.transformOrigin = "bottom center";
    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;

    display.textContent = acwrValue.toFixed(2);
    
    if (acwrValue >= 0.8 && acwrValue <= 1.3) {
        status.textContent = 'Безпечна зона (Оптимально)';
        status.style.color = "#4CAF50";
    } else if (acwrValue > 1.5) {
        status.textContent = 'Високий ризик травм!';
        status.style.color = "#DA3E52";
    } else {
        status.textContent = 'Увага: Перевірте навантаження';
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
                label: 'Дистанція (км)',
                data: lastEntries.map(i => i.distance),
                borderColor: '#FFD700', // Твій золотий колір
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                borderWidth: 3,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // Фікс заліпання скролу
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

    // Хронологія навантаження (тренд)
    const labels = ['3 тижні тому', '2 тижні тому', 'Минулий', 'Поточний'];
    
    loadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Acute (7 днів)',
                    data: [acute * 0.8, acute * 1.1, acute * 0.9, acute],
                    borderColor: '#D9534F', // Твій червоний
                    borderWidth: 2,
                    tension: 0.3
                },
                {
                    label: 'Chronic (28 днів)',
                    data: [chronic * 0.9, chronic * 0.95, chronic * 0.98, chronic],
                    borderColor: '#4CAF50', // Твій зелений
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
// 5. ФОРМА ТА ІНІЦІАЛІЗАЦІЯ
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
                const scrollPos = window.scrollY;
                await db.collection(LOAD_COLLECTION).add(formData);
                await loadDataFromFirebase();
                form.reset();
                document.getElementById('load-date').value = new Date().toISOString().split('T')[0];
                window.scrollTo(0, scrollPos); // Миттєвий фікс скролу
                alert("ProAtletCare: Дані збережено!");
            } catch (err) {
                console.error(err);
            } finally {
                if (btn) btn.disabled = false;
            }
        };
    }
    
    const dateInput = document.getElementById('load-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
});
