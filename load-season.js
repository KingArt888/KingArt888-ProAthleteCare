const LOAD_COLLECTION = 'training_loads';
let currentUserId = null;
let trainingData = [];
let targetACWR = 0.0;
let currentNeedleAngle = -Math.PI;
let charts = {};

// 1. Авторизація
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            loadData();
        } else {
            firebase.auth().signInAnonymously();
        }
    });
}

// 2. Завантаження даних
async function loadData() {
    if (!currentUserId) return;
    const snap = await db.collection(LOAD_COLLECTION).where("userId", "==", currentUserId).get();
    trainingData = snap.docs.map(doc => doc.data()).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    const m = calculateMetrics();
    targetACWR = m.acwr;
    
    requestAnimationFrame(drawGauge);
    renderCharts(m);
}

function calculateMetrics() {
    if (trainingData.length === 0) return { acwr: 0, acute: 0, chronic: 0, dists: [0,0,0,0,0,0,0] };
    const latest = new Date(trainingData[trainingData.length-1].date);
    
    const getAvg = (days) => {
        const cutoff = new Date(latest);
        cutoff.setDate(latest.getDate() - days);
        const filtered = trainingData.filter(d => new Date(d.date) > cutoff);
        const total = filtered.reduce((sum, d) => sum + (Number(d.duration) * Number(d.rpe)), 0);
        return total / days;
    };

    const last7Days = [0,0,0,0,0,0,0];
    trainingData.slice(-7).forEach((d, i) => { last7Days[i] = d.distance || 0; });

    const acute = getAvg(7);
    const chronic = getAvg(28);
    return {
        acwr: parseFloat((acute / (chronic || 1)).toFixed(2)),
        acute: Math.round(acute),
        chronic: Math.round(chronic),
        dists: last7Days
    };
}

// 3. Малювання спідометра (Центрований, з цифрами, малий індекс)
function drawGauge() {
    const container = document.getElementById('acwr-gauge-display');
    if (!container) return;
    if (!document.getElementById('gaugeCanvas')) {
        container.innerHTML = '<canvas id="gaugeCanvas" width="320" height="220"></canvas>';
    }
    const canvas = document.getElementById('gaugeCanvas');
    const ctx = canvas.getContext('2d');
    const cx = 160, cy = 150, radius = 95;

    ctx.clearRect(0, 0, 320, 220);

    let color = "#FFC72C";
    if (targetACWR >= 0.8 && targetACWR <= 1.3) color = "#4CAF50";
    else if (targetACWR > 1.3) color = "#FF4444";

    // Шкала
    const labels = ["0.0", "0.5", "1.0", "1.5", "2.0"];
    for (let i = 0; i <= 20; i++) {
        const angle = Math.PI + (i / 20) * Math.PI;
        ctx.beginPath();
        ctx.strokeStyle = i > 13 ? "#FF4444" : (i >= 8 ? "#4CAF50" : "#FFC72C");
        ctx.lineWidth = i % 5 === 0 ? 4 : 2;
        ctx.moveTo(cx + Math.cos(angle) * (radius - 5), cy + Math.sin(angle) * (radius - 5));
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.stroke();

        if (i % 5 === 0) {
            ctx.fillStyle = "#666";
            ctx.font = "10px Arial";
            ctx.fillText(labels[i/5], cx + Math.cos(angle) * (radius + 15), cy + Math.sin(angle) * (radius + 15));
        }
    }

    // Стрілка
    const targetAngle = Math.PI + (Math.min(targetACWR, 2.0) / 2.0) * Math.PI;
    currentNeedleAngle += (targetAngle - currentNeedleAngle) * 0.08;
    
    ctx.shadowBlur = 10; ctx.shadowColor = color;
    ctx.beginPath();
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(currentNeedleAngle) * 85, cy + Math.sin(currentNeedleAngle) * 85);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Малий індекс ACWR
    ctx.textAlign = "center";
    ctx.fillStyle = "#888"; ctx.font = "10px Montserrat";
    ctx.fillText("INDEX ACWR", cx, cy + 30);
    ctx.fillStyle = color; ctx.font = "bold 24px Orbitron, sans-serif";
    ctx.fillText(targetACWR.toFixed(2), cx, cy + 55);

    const statusEl = document.getElementById('acwr-status');
    if (statusEl) {
        statusEl.textContent = targetACWR > 1.3 ? "DANGER" : (targetACWR >= 0.8 ? "SAFE" : "ADAPTATION");
        statusEl.style.color = color;
    }

    if (Math.abs(targetAngle - currentNeedleAngle) > 0.001) requestAnimationFrame(drawGauge);
}

// 4. Графіки
function renderCharts(m) {
    if (charts.load) charts.load.destroy();
    charts.load = new Chart(document.getElementById('loadChart'), {
        type: 'line',
        data: {
            labels: ['Day -3', 'Day -2', 'Day -1', 'Today'],
            datasets: [
                { label: 'Acute', data: [m.acute*0.9, m.acute*1.1, m.acute], borderColor: '#FF4444', tension: 0.3 },
                { label: 'Chronic', data: [m.chronic, m.chronic, m.chronic], borderColor: '#4CAF50', tension: 0.3 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    if (charts.dist) charts.dist.destroy();
    charts.dist = new Chart(document.getElementById('distanceChart'), {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{ label: 'Distance (km)', data: m.dists, backgroundColor: '#FFC72C' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 5. Обробка твоєї форми (Тут твій RPE)
document.getElementById('load-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    // Отримуємо значення з твоїх radio кнопок (rpe1, rpe2... rpe10)
    const selectedRpe = f.querySelector('input[name="rpe"]:checked')?.value;
    
    if (!selectedRpe) {
        alert("Будь ласка, обери рівень навантаження (RPE)!");
        return;
    }

    const data = {
        userId: currentUserId,
        date: f.date.value,
        duration: Number(f.duration.value),
        distance: Number(f.distance.value),
        rpe: Number(selectedRpe),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection(LOAD_COLLECTION).add(data);
        f.reset();
        // Встановлюємо дату на сьогодні після скидання
        f.date.value = new Date().toISOString().split('T')[0];
        loadData();
    } catch (err) { console.error(err); }
};
