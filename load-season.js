// ==========================================================
// 1. КОНФІГУРАЦІЯ ТА FIREBASE
// ==========================================================
const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = [];
let targetACWR = 1.0;
let currentNeedleAngle = -Math.PI; 

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadDataFromFirebase();
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
        
        // Запуск анімації спідометра
        startGaugeAnimation(); 
        
        // ВИКЛИК ГРАФІКІВ (переконайся, що функція renderLoadChart існує у файлі)
        if (window.renderLoadChart) {
            window.renderLoadChart(metrics.acuteLoad, metrics.chronicLoad);
        }
    } catch (e) { console.error("Помилка завантаження:", e); }
}

// ==========================================================
// 2. ЗОЛОТИЙ СПІДОМЕТР З ЦИФРАМИ ПІД ШКАЛОЮ
// ==========================================================
function drawGoldenGauge(acwr) {
    const canvas = document.getElementById('gaugeCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height - 60; // Центр піднятий, щоб знизу було місце
    const radius = 100;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Малюємо шкалу та цифри значень (0.0, 0.5, 1.0, 1.5, 2.0)
    const labels = ["0.0", "0.5", "1.0", "1.5", "2.0"];
    for (let i = 0; i <= 20; i++) {
        const angle = Math.PI + (i / 20) * Math.PI;
        const xStart = cx + Math.cos(angle) * (radius - 5);
        const yStart = cy + Math.sin(angle) * (radius - 5);
        const xEnd = cx + Math.cos(angle) * radius;
        const yEnd = cy + Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.moveTo(xStart, yStart);
        ctx.lineTo(xEnd, yEnd);
        
        // Кольорові зони
        if (i >= 8 && i <= 13) ctx.strokeStyle = "#4CAF50"; // Зелена (0.8 - 1.3)
        else if (i > 13) ctx.strokeStyle = "#FF4444";      // Червона (1.4+)
        else ctx.strokeStyle = "#FFC72C";                  // Золота (низька)
        
        ctx.lineWidth = 3;
        ctx.stroke();

        // Додаємо підписи значень під великими поділками
        if (i % 5 === 0) {
            const labelX = cx + Math.cos(angle) * (radius + 20);
            const labelY = cy + Math.sin(angle) * (radius + 20);
            ctx.fillStyle = "#AAA";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText(labels[i/5], labelX, labelY);
        }
    }

    // 2. Анімація стрілки
    const targetAngle = Math.PI + (Math.min(acwr, 2.0) / 2.0) * Math.PI;
    currentNeedleAngle += (targetAngle - currentNeedleAngle) * 0.05;

    // 3. Малюємо стрілку
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#FFC72C";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(currentNeedleAngle) * (radius - 10), cy + Math.sin(currentNeedleAngle) * (radius - 10));
    ctx.strokeStyle = "#FFC72C";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Великий напис ACWR в самому низу
    ctx.fillStyle = "#FFC72C";
    ctx.font = "bold 14px Montserrat";
    ctx.fillText("ACWR", cx, canvas.height - 35);
    ctx.font = "bold 32px Montserrat";
    ctx.fillText(acwr.toFixed(2), cx, canvas.height - 5);

    if (Math.abs(targetAngle - currentNeedleAngle) > 0.001) {
        requestAnimationFrame(() => drawGoldenGauge(acwr));
    }
}

function startGaugeAnimation() {
    requestAnimationFrame(() => drawGoldenGauge(targetACWR));
}

// ==========================================================
// 3. МАТЕМАТИКА
// ==========================================================
function calculateProfessionalACWR() {
    if (trainingData.length < 2) return { acuteLoad: 0, chronicLoad: 0, acwr: 0.0 };
    
    const latestDate = new Date(trainingData[trainingData.length - 1].date);
    
    const getLoadForDays = (days) => {
        const cutoff = new Date(latestDate);
        cutoff.setDate(latestDate.getDate() - days);
        
        const relevant = trainingData.filter(d => new Date(d.date) > cutoff);
        const total = relevant.reduce((sum, item) => sum + (Number(item.duration) * Number(item.rpe)), 0);
        return total / days;
    };

    const acute = getLoadForDays(7);
    const chronic = getLoadForDays(28);
    let ratio = acute / (chronic || 1);
    
    return { 
        acuteLoad: Math.round(acute * 7), 
        chronicLoad: Math.round(chronic * 28), 
        acwr: parseFloat(ratio.toFixed(2)) 
    };
}

// Ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.gauge-display');
    if (container) {
        // Збільшена висота, щоб все влізло
        container.innerHTML = '<canvas id="gaugeCanvas" width="300" height="240"></canvas>';
    }
    startGaugeAnimation();
});
