(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; 
    let currentAnalysis = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadBaseData();
            loadHistory();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const form = document.getElementById('weight-form');
        if (form) form.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);
    });

    // 1. ВИДАЛЕННЯ (Глобальна функція)
    window.deleteWeightEntry = async function(id) {
        if (!confirm("Видалити цей запис?")) return;
        try {
            await firebase.firestore().collection('weight_history').doc(id).delete();
            // Миттєво оновлюємо дані без перезавантаження сторінки
            loadHistory(); 
        } catch (e) {
            console.error("Помилка видалення:", e);
            alert("Помилка при видаленні");
        }
    };

    // 2. ОБРОБКА ФОРМИ
    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const analysis = calculateAthleteData(w, bmi, h, a);
        currentAnalysis = analysis;

        updateScannerUI(w, bmi, analysis);
        updateRecommendationUI(analysis);

        try {
            await firebase.firestore().collection('weight_history').add({
                userId: currentUserId,
                weight: w,
                bmi: bmi,
                status: analysis.status,
                statusColor: analysis.statusColor,
                target_kcal: analysis.targetCalories,
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await firebase.firestore().collection('users').doc(currentUserId).set({ height: h, age: a }, { merge: true });
            loadHistory();
        } catch (error) { console.error("Firebase Error:", error); }
    }

    function calculateAthleteData(w, bmi, h, a) {
        let status, color, modifier;
        if (bmi < 20.5) { status = "MUSCLE GAIN"; color = "#00BFFF"; modifier = 1.15; }
        else if (bmi < 25.5) { status = "ATHLETIC FORM"; color = "#FFC72C"; modifier = 1.0; }
        else { status = "WEIGHT LOSS"; color = "#DA3E52"; modifier = 0.85; }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const kcal = Math.round(bmr * 1.55 * modifier);
        return { status, statusColor: color, targetCalories: kcal };
    }

    // 3. ОНОВЛЕННЯ СКАНЕРА (КРУГА)
    function updateScannerUI(weight, bmi, data) {
        document.getElementById('bmi-value').textContent = bmi;
        const circle = document.getElementById('scan-main-circle');
        if (circle) {
            circle.innerHTML = `
                <div style="text-align:center;">
                    <div style="color:${data.statusColor}; font-size:12px; font-weight:bold; text-transform:uppercase;">${data.status}</div>
                    <div style="font-size:42px; color:#FFC72C; font-weight:bold; margin:5px 0;">${weight}kg</div>
                    <div style="color:#fff; font-size:14px;">BMI: ${bmi}</div>
                </div>
            `;
        }
    }

    function updateRecommendationUI(data) {
        const box = document.getElementById('athlete-recommendation-box');
        if (box) {
            box.innerHTML = `
                <div style="border-left: 3px solid ${data.statusColor}; padding-left: 12px;">
                    <p style="color:#eee; font-size:14px; margin:0;">Режим: <strong>${data.status}</strong></p>
                    <p style="color:#ccc; font-size:13px; margin:5px 0 0 0;">Необхідно: <strong>${data.targetCalories} ккал</strong>/день</p>
                </div>
            `;
        }
        document.getElementById('speed-selector-container').style.display = 'block';
    }

    // 4. ЗАВАНТАЖЕННЯ ІСТОРІЇ ТА ГРАФІКА
    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(10).get();
        
        const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        // Оновлюємо графік
        const chartData = [...docs].reverse();
        weightChart.data.labels = chartData.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
        weightChart.data.datasets[0].data = chartData.map(d => d.weight);
        weightChart.update();

        // Оновлюємо SCAN останній записом
        if (docs.length > 0) {
            const last = docs[0];
            updateScannerUI(last.weight, last.bmi, calculateAthleteData(last.weight, last.bmi, 180, 25));
        }

        // Оновлюємо список історії під графіком
        renderHistoryList(docs);
    }

    function renderHistoryList(docs) {
        let container = document.getElementById('compact-history-list');
        if (!container) {
            container = document.createElement('div');
            container.id = 'compact-history-list';
            container.style.cssText = "margin-top:20px; border-top:1px solid #222; padding-top:10px;";
            document.querySelector('.chart-card').appendChild(container);
        }

        container.innerHTML = docs.map(doc => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:10px; margin-bottom:6px; border-radius:4px; border:1px solid #1a1a1a;">
                <div style="font-size:13px;">
                    <span style="color:#666; font-size:10px;">${doc.date}</span>
                    <div style="color:#fff; font-weight:bold;">${doc.weight} kg <small style="color:#444;">(BMI: ${doc.bmi})</small></div>
                </div>
                <button onclick="deleteWeightEntry('${doc.id}')" style="background:none; border:none; color:#DA3E52; font-size:20px; cursor:pointer;">&times;</button>
            </div>
        `).join('');
    }

    // 5. ДОПОМІЖНІ ФУНКЦІЇ
    window.setSpeed = (speed, btn) => {
        selectedSpeed = speed;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "#111"; b.style.borderColor = "#333";
        });
        btn.style.background = "#222"; btn.style.borderColor = "#FFC72C";
    };

    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        const btn = document.getElementById('get-diet-plan-btn');
        btn.textContent = "ЗБЕРЕЖЕННЯ...";
        try {
            await firebase.firestore().collection('athlete_plans').doc(currentUserId).set({
                kcal: currentAnalysis.targetCalories,
                speed: selectedSpeed,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            document.getElementById('diet-container').innerHTML = `<p style="color:#FFC72C; font-size:12px; text-align:center;">✅ ПЛАН ЗБЕРЕЖЕНО</p>`;
            btn.textContent = "ГЕНЕРУВАТИ ПЛАН НА ТИЖДЕНЬ";
        } catch (e) { console.error(e); }
    }

    function initChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага', data: [], borderColor: '#FFC72C', tension: 0.4, fill: false }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, grid: { color: '#222' } }, x: { grid: { display: false } } } }
        });
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            if (document.getElementById('user-height')) document.getElementById('user-height').value = d.height || "";
            if (document.getElementById('user-age')) document.getElementById('user-age').value = d.age || "";
        }
    }
})();
