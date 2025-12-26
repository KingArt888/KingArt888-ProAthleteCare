// ==========================================================
// 1. КОНФІГУРАЦІЯ ТА FIREBASE
// ==========================================================
const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = [];
let targetACWR = 0.0;
let currentNeedleAngle = -Math.PI; 

// Функція встановлення дати
function setTodayDate() {
    const dateInput = document.getElementById('load-date');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
}

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            setTodayDate();
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
        
        const metrics = calculateProfessionalACWR();
        targetACWR = metrics.acwr;
        
        // Запускаємо малювання
        startGaugeAnimation(); 
        if (window.renderLoadChart) window.renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
    } catch (e) { console.error(e); }
}

// ==========================================================
// 2. МАЛЮВАННЯ СПІДОМЕТРА (CANVAS)
// ==========================================================
function drawGoldenGauge() {
    const canvas = document.getElementById('gaugeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const cx = canvas.width / 2;
    const cy = canvas.height - 80; 
    const radius = 100;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Визначаємо кольори
    let mainColor = "#FFC72C"; // Золото
    if (targetACWR >= 0.8 && targetACWR <= 1.3) mainColor = "#4CAF50"; // Зелений
    else if (targetACWR > 1.3) mainColor = "#FF4444"; // Червоний

    // 1. Шкала та поділки
    for (let i = 0; i <= 20; i++) {
        const angle = Math.PI + (i / 20) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (radius - 5), cy + Math.sin(angle) * (radius - 5));
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        
        // Колір сегментів шкали
        if (i >= 8 && i <= 13) ctx.strokeStyle = "#4CAF50";
        else if (i > 13) ctx.strokeStyle = "#FF4444";
        else ctx.strokeStyle = "#FFC72C";
        
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // 2. Анімація стрілки
    const targetAngle = Math.PI + (Math.min(targetACWR, 2.0) / 2.0) * Math.PI;
    currentNeedleAngle += (targetAngle - currentNeedleAngle) * 0.1;

    // 3. Малювання стрілки
    ctx.shadowBlur = 15;
    ctx.shadowColor = mainColor;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(currentNeedleAngle) * (radius - 10), cy + Math.sin(currentNeedleAngle) * (radius - 10));
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. ТЕКСТ: ACWR ТА ЦИФРИ (НИЖЧЕ СТРІЛКИ)
    ctx.textAlign = "center";
    
    // Напис ACWR
    ctx.fillStyle = "#888";
    ctx.font = "14px Montserrat, sans-serif";
    ctx.fillText("LOAD INDEX", cx, cy + 30);
    
    // Великі цифри
    ctx.fillStyle = mainColor;
    ctx.font = "bold 48px Orbitron, sans-serif"; // Якщо Orbitron не підключений, буде системний bold
    ctx.fillText(targetACWR.toFixed(2), cx, cy + 75);

    // Рекурсія анімації
    if (Math.abs(targetAngle - currentNeedleAngle) > 0.001) {
        requestAnimationFrame(drawGoldenGauge);
    }
}

function startGaugeAnimation() {
    requestAnimationFrame(drawGoldenGauge);
}

// ==========================================================
// 3. РОЗРАХУНОК ТА ІНІЦІАЛІЗАЦІЯ
// ==========================================================
function calculateProfessionalACWR() {
    if (trainingData.length < 2) return { acuteLoad: 0, chronicLoad: 0, acwr: 0.0 };
    const latest = new Date(trainingData[trainingData.length - 1].date);
    const getAvg = (d) => {
        const cutoff = new Date(latest);
        cutoff.setDate(latest.getDate() - d);
        const p = trainingData.filter(i => new Date(i.date) > cutoff);
        return p.length ? p.reduce((s, i) => s + (Number(i.duration) * Number(i.rpe)), 0) / d : 0;
    };
    const acute = getAvg(7);
    const chronic = getAvg(28);
    const ratio = acute / (chronic || 1);
    return { acuteLoad: acute, chronicLoad: chronic, acwr: parseFloat(ratio.toFixed(2)) };
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.gauge-display');
    if (container) {
        // Створюємо канвас примусово
        const canvas = document.createElement('canvas');
        canvas.id = 'gaugeCanvas';
        canvas.width = 300;
        canvas.height = 250;
        container.innerHTML = ''; 
        container.appendChild(canvas);
    }
    setTodayDate();
    // Малюємо нульовий стан одразу
    startGaugeAnimation();
});
