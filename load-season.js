// ==========================================================
// 1. КОНФІГУРАЦІЯ ТА FIREBASE (ProAtletCare)
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
    const metrics = calculateProfessionalACWR();
    updateGaugeWithCSS(metrics.acwr);
    renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
    renderDistanceChart();
}

// ==========================================================
// 2. ПРОФЕСІЙНА МАТЕМАТИКА (ACWR)
// ==========================================================
function calculateProfessionalACWR() {
    if (trainingData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 1.0 };

    const sortedData = [...trainingData];
    const latestDate = new Date(sortedData[sortedData.length - 1].date);

    const getAvgLoad = (days) => {
        const cutoff = new Date(latestDate);
        cutoff.setDate(latestDate.getDate() - days);
        const periodData = sortedData.filter(d => new Date(d.date) > cutoff);
        if (periodData.length === 0) return 0;
        return periodData.reduce((sum, d) => sum + (Number(d.duration) * Number(d.rpe)), 0) / days;
    };

    const acute = getAvgLoad(7);    // Acute: 7 днів
    const chronic = getAvgLoad(28); // Chronic: 28 днів
    const acwr = (chronic > 0) ? (acute / chronic) : 1.0;
    
    return {
        acuteLoad: Math.round(acute),
        chronicLoad: Math.round(chronic),
        acwr: parseFloat(acwr.toFixed(2))
    };
}

// ==========================================================
// 3. УПРАВЛІННЯ СТРІЛКОЮ (Синхронно з CSS)
// ==========================================================
function updateGaugeWithCSS(acwrValue) {
    const needle = document.querySelector('.gauge-needle');
    const display = document.getElementById('acwr-value');
    const status = document.getElementById('acwr-status');

    if (!needle || !display) return;

    // МАТЕМАТИКА КУТА:
    // Твоя дуга в CSS симетрична. 1.0 (Оптимально) має бути 0° (вертикально).
    // ACWR 0.0 -> -90° (ліворуч)
    // ACWR 1.0 -> 0°   (центр - Зелена зона)
    // ACWR 2.0+ -> 90°  (праворуч)
    let degree = (acwrValue - 1.0) * 90;
    
    // Обмежуємо стрілку, щоб не виходила за межі півкола
    degree = Math.max(-90, Math.min(90, degree));

    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
    display.textContent = acwrValue.toFixed(2);
    
    // Оновлення тексту та класів (status-safe, status-warning, status-danger вже у твоєму CSS)
    if (acwrValue >= 0.8 && acwrValue <= 1.3) {
        status.textContent = 'Безпечна зона (Оптимально)';
        status.className = 'status-safe';
    } else if (acwrValue > 1.5) {
        status.textContent = 'Високий ризик травм!';
        status.className = 'status-danger';
    } else {
        status.textContent = 'Адаптуйте навантаження';
        status.className = 'status-warning';
    }
}

// ==========================================================
// 4. ГРАФІКИ ТА ФОРМА (БЕЗ ГАЛЬМУВАННЯ)
// ==========================================================
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
                borderColor: '#FFC72C',
                backgroundColor: 'rgba(255, 199, 44, 0.2)',
                borderWidth: 3,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            scales: {
                x: { ticks: { color: '#AAA' }, grid: { color: '#333' } },
                y: { ticks: { color: '#AAA' }, grid: { color: '#333' } }
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
                { label: 'Acute (Гостре)', data: [acute*0.8, acute*1.2, acute*0.9, acute], borderColor: '#D9534F', borderWidth: 2, tension: 0.3 },
                { label: 'Chronic (Хронічне)', data: [chronic*0.9, chronic*0.95, chronic*0.98, chronic], borderColor: '#4CAF50', borderWidth: 2, tension: 0.3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, animation: false }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('load-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.submitter;
            btn.disabled = true;
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
                window.scrollTo(0, scrollPos);
            } catch (err) { console.error(err); }
            finally { btn.disabled = false; }
        };
    }
});
