// ==========================================================
// 1. КОНФІГУРАЦІЯ ТА FIREBASE
// ==========================================================
const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = []; // Дані з Firestore
let distanceChart, loadChart;

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadDataFromFirebase();
        } else {
            firebase.auth().signInAnonymously().catch(e => console.error(e));
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
        snapshot.forEach(doc => trainingData.push({ id: doc.id, ...doc.data() }));
        trainingData.sort((a, b) => new Date(a.date) - new Date(b.date)); // Сортування за датою

        refreshDashboard();
    } catch (e) { console.error("Firebase Error:", e); }
}

function refreshDashboard() {
    const metrics = calculateProfessionalACWR();
    updateProfessionalGauge(metrics.acwr);
    renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
    renderDistanceChart();
}

// ==========================================================
// 2. ПРОФЕСІЙНА ФОРМУЛА РИЗИКУ ТРАВМ (ACWR)
// ==========================================================
function calculateProfessionalACWR() {
    if (trainingData.length < 2) return { acuteLoad: 0, chronicLoad: 0, acwr: 1.0 };

    const sortedData = [...trainingData];
    const latestDate = new Date(sortedData[sortedData.length - 1].date);

    // Функція розрахунку середнього навантаження за період
    const getAverageLoad = (days) => {
        const cutoff = new Date(latestDate);
        cutoff.setDate(latestDate.getDate() - days);
        
        const periodData = sortedData.filter(d => new Date(d.date) > cutoff);
        if (periodData.length === 0) return 0;
        
        // Load = Duration * RPE
        const totalLoad = periodData.reduce((sum, d) => sum + (Number(d.duration) * Number(d.rpe)), 0);
        return totalLoad / days; // Середнє за кожен день періоду
    };

    const acuteLoad = getAverageLoad(7);    // Гостре (тиждень)
    const chronicLoad = getAverageLoad(28); // Хронічне (місяць)

    // Якщо хронічне занадто мале (початок тренувань), ставимо 1.0, щоб не лякати атлета
    const acwr = (chronicLoad > 10) ? (acuteLoad / chronicLoad) : 1.0;
    
    return {
        acuteLoad: Math.round(acuteLoad),
        chronicLoad: Math.round(chronicLoad),
        acwr: parseFloat(acwr.toFixed(2))
    };
}

// ==========================================================
// 3. ПРОФЕСІЙНИЙ СПІДОМЕТР (ФІКС СТРІЛКИ)
// ==========================================================
function updateProfessionalGauge(acwrValue) {
    const needle = document.getElementById('gauge-needle');
    const display = document.getElementById('acwr-value');
    const status = document.getElementById('acwr-status');

    if (!needle || !display) return;

    // КАЛІБРУВАННЯ: -90° (ліво) до +90° (право). 1.0 — це центр (0°)
    let degree;
    
    if (acwrValue <= 0.5) {
        degree = -90; // Мінімум
    } else if (acwrValue <= 1.0) {
        // Від 0.5 до 1.0 (Жовта/Зелена зона)
        degree = -90 + ((acwrValue - 0.5) / 0.5) * 90;
    } else if (acwrValue <= 1.5) {
        // Від 1.0 до 1.5 (Зелена/Червона зона)
        degree = ((acwrValue - 1.0) / 0.5) * 90;
    } else {
        degree = 90; // Максимум (Край червоної зони)
    }

    // Застосовуємо плавність та обертання
    needle.style.transition = "transform 1.5s cubic-bezier(0.25, 0.1, 0.25, 1)";
    needle.style.transformOrigin = "bottom center";
    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;

    display.textContent = acwrValue.toFixed(2);
    
    // Статус текстом та кольором
    if (acwrValue >= 0.8 && acwrValue <= 1.3) {
        status.textContent = 'Оптимальне навантаження';
        status.style.color = "#4CAF50";
    } else if (acwrValue > 1.5) {
        status.textContent = 'Критичний ризик травми!';
        status.style.color = "#DA3E52";
    } else {
        status.textContent = 'Адаптуйте тренування';
        status.style.color = "#FFC72C";
    }
}

// ==========================================================
// 4. ГРАФІКИ ТА ФОРМА (БЕЗ ЗАЛІПАННЯ)
// ==========================================================
function renderDistanceChart() {
    const ctx = document.getElementById('distanceChart');
    if (!ctx || !trainingData.length) return;
    if (distanceChart) distanceChart.destroy();

    const last14 = trainingData.slice(-14);

    distanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last14.map(d => d.date.split('-').reverse().slice(0,2).join('.')),
            datasets: [{
                label: 'Відстань (км)',
                data: last14.map(d => d.distance),
                borderColor: '#FFD700', // Твій золотий стиль
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { 
            animation: false, 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { ticks: { color: '#888' } }, x: { ticks: { color: '#888' } } }
        }
    });
}

function renderLoadChart(acute, chronic) {
    const ctx = document.getElementById('loadChart');
    if (!ctx) return;
    if (loadChart) loadChart.destroy();

    loadChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Хронічне (28д)', 'Гостре (7д)'],
            datasets: [{
                label: 'Навантаження (RPE)',
                data: [chronic, acute],
                backgroundColor: ['#4CAF50', '#D9534F'] // Зелений та Червоний
            }]
        },
        options: { 
            animation: false, 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { color: '#888' } } }
        }
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
                duration: Number(form.duration.value),
                distance: Number(form.distance.value),
                rpe: Number(form.querySelector('input[name="rpe"]:checked')?.value || 5),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                const scrollPos = window.scrollY;
                await db.collection(LOAD_COLLECTION).add(formData);
                await loadDataFromFirebase();
                form.reset();
                document.getElementById('load-date').value = new Date().toISOString().split('T')[0];
                window.scrollTo(0, scrollPos); // Миттєвий фікс скролу
            } catch (err) { console.error(err); }
            finally { btn.disabled = false; }
        };
    }
    document.getElementById('load-date').value = new Date().toISOString().split('T')[0];
});
