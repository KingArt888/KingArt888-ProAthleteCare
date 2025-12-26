// ==========================================================
// 1. КОНФІГУРАЦІЯ ТА FIREBASE
// ==========================================================
const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = [];
let loadChart;

// Автоматична дата при завантаженні сторінки
function setTodayDate() {
    const dateInput = document.getElementById('load-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadDataFromFirebase();
            setTodayDate();
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
    renderNewGauge(metrics.acwr); // Новий спідометр
    renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
}

// ==========================================================
// 2. ФОРМУЛА ТА НОВИЙ СПІДОМЕТР
// ==========================================================
function calculateProfessionalACWR() {
    if (trainingData.length < 2) return { acuteLoad: 0, chronicLoad: 0, acwr: 1.0 };
    const latest = new Date(trainingData[trainingData.length - 1].date);

    const getAvg = (days) => {
        const cutoff = new Date(latest);
        cutoff.setDate(latest.getDate() - days);
        const period = trainingData.filter(d => new Date(d.date) > cutoff);
        if (period.length === 0) return 0;
        return period.reduce((s, d) => s + (Number(d.duration) * Number(d.rpe)), 0) / days;
    };

    const acute = getAvg(7);
    const chronic = getAvg(28);
    return { acuteLoad: Math.round(acute), chronicLoad: Math.round(chronic), acwr: parseFloat((acute / (chronic || 1)).toFixed(2)) };
}

function renderNewGauge(val) {
    const container = document.querySelector('.gauge-display');
    if (!container) return;

    // Очищаємо старий спідометр і вставляємо новий SVG
    // Зелена зона (0.8 - 1.3) тепер візуально в центрі
    const degree = Math.max(-90, Math.min(90, (val - 1) * 90)); 
    
    container.innerHTML = `
        <svg viewBox="0 0 200 100" style="width:100%; height:100%;">
            <path d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="#333" stroke-width="15" />
            <path d="M20,100 A80,80 0 0,1 80,35" fill="none" stroke="#FFC72C" stroke-width="15" /> <path d="M80,35 A80,80 0 0,1 125,35" fill="none" stroke="#4CAF50" stroke-width="15" /> <path d="M125,35 A80,80 0 0,1 180,100" fill="none" stroke="#DA3E52" stroke-width="15" /> <line x1="100" y1="100" x2="100" y2="30" stroke="#FFD700" stroke-width="3" 
                  style="transform: rotate(${degree}deg); transform-origin: 100px 100px; transition: transform 1s;" />
            <circle cx="100" cy="100" r="5" fill="#FFD700" />
            
            <text x="100" y="90" text-anchor="middle" fill="#FFD700" font-size="16" font-weight="bold">${val.toFixed(2)}</text>
        </svg>
    `;
    
    const status = document.getElementById('acwr-status');
    if (status) {
        status.textContent = val >= 0.8 && val <= 1.3 ? "OPTIMAL ZONE" : "ADAPT LOAD";
        status.style.color = val >= 0.8 && val <= 1.3 ? "#4CAF50" : "#FFC72C";
    }
}

// ==========================================================
// 3. ГРАФІК ТА ОБРОБКА ФОРМИ
// ==========================================================
function renderLoadChart(acute, chronic) {
    const ctx = document.getElementById('loadChart');
    if (!ctx) return;
    if (loadChart) loadChart.destroy();
    loadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['4 тижні тому', '3 тижні тому', '2 тижні тому', 'Зараз'],
            datasets: [
                { label: 'Acute (Гостре)', data: [acute*0.8, acute*1.2, acute*0.9, acute], borderColor: '#DA3E52', fill: false },
                { label: 'Chronic (Хронічне)', data: [chronic*0.9, chronic*0.95, chronic*0.98, chronic], borderColor: '#4CAF50', fill: false }
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
                await db.collection(LOAD_COLLECTION).add(formData);
                await loadDataFromFirebase();
                form.reset();
                setTodayDate(); // Повертаємо сьогоднішню дату після скидання
            } catch (err) { console.error(err); } finally { btn.disabled = false; }
        };
    }
    setTodayDate();
});
