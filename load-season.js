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
            firebase.auth().signInAnonymously().catch(e => console.error(e));
        }
    });
}

async function loadDataFromFirebase() {
    if (!currentUserId) return;
    try {
        const snapshot = await db.collection(LOAD_COLLECTION).where("userId", "==", currentUserId).get();
        trainingData = [];
        snapshot.forEach(doc => trainingData.push({ id: doc.id, ...doc.data() }));
        trainingData.sort((a, b) => new Date(a.date) - new Date(b.date));
        refreshDashboard();
    } catch (e) { console.error(e); }
}

function refreshDashboard() {
    const metrics = calculateProfessionalACWR();
    drawGaugeBackground(); // Малюємо зони на дузі
    updateProfessionalGauge(metrics.acwr);
    renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
    renderDistanceChart();
}

// ==========================================================
// 2. ПРОФЕСІЙНИЙ РОЗРАХУНОК (ACWR)
// ==========================================================
function calculateProfessionalACWR() {
    if (trainingData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 1.0 };
    const latestDate = new Date(trainingData[trainingData.length - 1].date);

    const getAvg = (days) => {
        const cutoff = new Date(latestDate);
        cutoff.setDate(latestDate.getDate() - days);
        const period = trainingData.filter(d => new Date(d.date) > cutoff);
        if (period.length === 0) return 0;
        return period.reduce((s, d) => s + (Number(d.duration) * Number(d.rpe)), 0) / days;
    };

    const acute = getAvg(7);
    const chronic = getAvg(28);
    const acwr = chronic > 0 ? (acute / chronic) : 1.0;
    return { acuteLoad: Math.round(acute), chronicLoad: Math.round(chronic), acwr: parseFloat(acwr.toFixed(2)) };
}

// ==========================================================
// 3. МАЛЮВАННЯ ЗОН ТА РУХ СТРІЛКИ
// ==========================================================
function drawGaugeBackground() {
    const gaugeContainer = document.querySelector('.gauge-container');
    if (!gaugeContainer) return;

    // Створюємо або оновлюємо кольорову підкладку дуги через JS стилі
    // Жовтий (0-40%), Зелений (40-75%), Червоний (75-100%)
    gaugeContainer.style.background = `conic-gradient(from 270deg at 50% 100%, 
        #FFC72C 0deg, 
        #FFC72C 72deg, 
        #4CAF50 72deg, 
        #4CAF50 135deg, 
        #DA3E52 135deg, 
        #DA3E52 180deg)`;
    gaugeContainer.style.borderRadius = "150px 150px 0 0";
    gaugeContainer.style.position = "relative";
    gaugeContainer.style.overflow = "hidden";
    
    // Створюємо чорну "дірку" всередині, щоб залишилась тільки тонка дуга
    let innerHole = document.getElementById('gauge-hole');
    if (!innerHole) {
        innerHole = document.createElement('div');
        innerHole.id = 'gauge-hole';
        gaugeContainer.appendChild(innerHole);
    }
    Object.assign(innerHole.style, {
        position: 'absolute',
        bottom: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '85%',
        height: '85%',
        backgroundColor: '#111',
        borderRadius: '150px 150px 0 0',
        zIndex: '1'
    });
}

function updateProfessionalGauge(acwrValue) {
    const needle = document.getElementById('gauge-needle');
    const display = document.getElementById('acwr-value');
    const status = document.getElementById('acwr-status');

    if (!needle || !display) return;

    // Масштабуємо ACWR на кут дуги (-90 до 90 градусів)
    let degree = -90 + (Math.min(acwrValue, 2.0) / 2.0) * 180;
    
    needle.style.zIndex = "10";
    needle.style.transition = "transform 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    needle.style.transformOrigin = "bottom center";
    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;

    // Міняємо колір тексту залежно від зони
    let color = "#FFC72C";
    if (acwrValue >= 0.8 && acwrValue <= 1.3) color = "#4CAF50";
    if (acwrValue > 1.3) color = "#DA3E52";

    display.textContent = acwrValue.toFixed(2);
    display.style.color = color;
    if (status) {
        status.textContent = acwrValue >= 0.8 && acwrValue <= 1.3 ? "OPTIMAL ZONE" : "ADAPT LOAD";
        status.style.color = color;
    }
}

// ==========================================================
// 4. ГРАФІКИ ТА ФОРМА
// ==========================================================
function renderLoadChart(acute, chronic) {
    const ctx = document.getElementById('loadChart');
    if (!ctx) return;
    if (loadChart) loadChart.destroy();
    loadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Тиждень 1', 'Тиждень 2', 'Тиждень 3', 'Поточний'],
            datasets: [
                { label: 'Acute (Гостре)', data: [acute*0.9, acute*1.1, acute*0.8, acute], borderColor: '#DA3E52', borderWidth: 3, tension: 0.3, fill: false },
                { label: 'Chronic (Хронічне)', data: [chronic*0.95, chronic*0.97, chronic*0.99, chronic], borderColor: '#4CAF50', borderWidth: 3, tension: 0.3, fill: false }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, animation: false, scales: { y: { beginAtZero: true, ticks: { color: '#AAA' } }, x: { ticks: { color: '#AAA' } } } }
    });
}

function renderDistanceChart() {
    const ctx = document.getElementById('distanceChart');
    if (!ctx) return;
    if (distanceChart) distanceChart.destroy();
    const last14 = trainingData.slice(-14);
    distanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last14.map(d => d.date.split('-').reverse().slice(0,1).join('.')),
            datasets: [{ label: 'Distance', data: last14.map(d => d.distance), borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)', fill: true }]
        },
        options: { responsive: true, maintainAspectRatio: false, animation: false }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('load-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.submitter; btn.disabled = true;
            const formData = {
                userId: currentUserId,
                date: form.date.value,
                duration: Number(form.duration.value),
                distance: Number(form.distance.value),
                rpe: Number(form.querySelector('input[name="rpe"]:checked')?.value || 5),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            try {
                const scroll = window.scrollY;
                await db.collection(LOAD_COLLECTION).add(formData);
                await loadDataFromFirebase();
                form.reset();
                document.getElementById('load-date').value = new Date().toISOString().split('T')[0];
                window.scrollTo(0, scroll);
                alert("ProAtletCare: Оновлено!");
            } catch (err) { console.error(err); } finally { btn.disabled = false; }
        };
    }
    document.getElementById('load-date').value = new Date().toISOString().split('T')[0];
});
