(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; // Easy = Швидко, Medium = Середньо, Hard = Маю час
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

    // --- ФУНКЦІЯ ВИДАЛЕННЯ ---
    window.deleteWeightEntry = async function(id) {
        if (!confirm("Видалити цей запис?")) return;
        try {
            await firebase.firestore().collection('weight_history').doc(id).delete();
            loadHistory();
        } catch (e) { console.error(e); }
    };

    // --- ОБРОБКА ТА РОЗРАХУНОК ---
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
                date: new Date().toLocaleDateString('uk-UA'),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await firebase.firestore().collection('users').doc(currentUserId).set({ height: h, age: a }, { merge: true });
            loadHistory();
        } catch (error) { console.error(error); }
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

    function updateScannerUI(weight, bmi, data) {
        document.getElementById('bmi-value').textContent = bmi;
        const circle = document.getElementById('scan-main-circle');
        if (circle) {
            circle.innerHTML = `
                <div style="text-align:center;">
                    <div style="color:${data.statusColor}; font-size:11px; font-weight:bold;">${data.status}</div>
                    <div style="font-size:36px; color:#FFC72C; font-weight:bold;">${weight}kg</div>
                    <div style="color:#fff; font-size:12px;">BMI: ${bmi}</div>
                </div>
            `;
        }
    }

    function updateRecommendationUI(data) {
        const box = document.getElementById('athlete-recommendation-box');
        if (box) {
            box.innerHTML = `
                <div style="border-left: 3px solid ${data.statusColor}; padding-left: 10px; background: #111; padding: 10px; border-radius: 4px;">
                    <p style="color:#FFC72C; font-size:14px; margin:0;">Ціль: ${data.targetCalories} ккал/день</p>
                </div>
            `;
        }
        document.getElementById('speed-selector-container').style.display = 'block';
    }

    // --- ГЕНЕРАЦІЯ ТА ВИВІД ДІЄТИ ---
    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        
        displayDietPlan(currentAnalysis.targetCalories, selectedSpeed);

        try {
            await firebase.firestore().collection('athlete_plans').doc(currentUserId).set({
                kcal: currentAnalysis.targetCalories,
                speed: selectedSpeed,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (e) { console.error(e); }
    }

    function displayDietPlan(targetKcal, speed) {
        const container = document.getElementById('diet-container');
        if (!typeof dietData !== 'undefined') {
            container.innerHTML = `<p style="color:red;">Помилка: diet-data.js не знайдено</p>`;
            return;
        }

        // Логіка вибору страв (спрощена для прикладу)
        const categories = ['breakfast', 'lunch', 'dinner'];
        let html = `<h4 style="color:#FFC72C; font-size:14px; margin:15px 0 10px;">Твоє меню на сьогодні:</h4>`;

        categories.forEach(cat => {
            const meals = dietData[cat] || [];
            // Шукаємо страву, що підходить під швидкість
            const meal = meals.find(m => m.speed === speed) || meals[0];
            
            if (meal) {
                html += `
                    <div style="background:#1a1a1a; border:1px solid #333; padding:10px; border-radius:6px; margin-bottom:8px;">
                        <div style="color:#FFC72C; font-size:10px; text-transform:uppercase;">${cat}</div>
                        <div style="color:#fff; font-size:13px; font-weight:bold;">${meal.name}</div>
                        <div style="color:#666; font-size:11px;">${meal.kcal} ккал | Б:${meal.p} Ж:${meal.f} В:${meal.c}</div>
                    </div>
                `;
            }
        });

        container.innerHTML = html;
        document.getElementById('kcal-balance').style.display = 'block';
        document.getElementById('calories-left').textContent = targetKcal;
    }

    // --- ІСТОРІЯ ТА ГРАФІК ---
    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(7).get();
        
        const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        // Оновлення графіка
        const chartData = [...docs].reverse();
        weightChart.data.labels = chartData.map(d => d.date);
        weightChart.data.datasets[0].data = chartData.map(d => d.weight);
        weightChart.update();

        // Оновлення списку історії
        renderHistoryList(docs);
    }

    function renderHistoryList(docs) {
        let list = document.getElementById('history-list-box');
        if (!list) {
            list = document.createElement('div');
            list.id = 'history-list-box';
            list.style.cssText = "margin-top:20px; border-top:1px solid #222; padding-top:10px;";
            document.querySelector('.chart-card').appendChild(list);
        }

        list.innerHTML = docs.map(doc => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:8px; margin-bottom:5px; border-radius:4px; font-size:12px;">
                <span style="color:#666;">${doc.date}</span>
                <span style="color:#fff; font-weight:bold;">${doc.weight} kg</span>
                <button onclick="deleteWeightEntry('${doc.id}')" style="background:none; border:none; color:#DA3E52; cursor:pointer;">&times;</button>
            </div>
        `).join('');
    }

    window.setSpeed = (speed, btn) => {
        selectedSpeed = speed;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "#111"; b.style.borderColor = "#333";
        });
        btn.style.background = "#222"; btn.style.borderColor = "#FFC72C";
    };

    function initChart() {
        const ctx = document.getElementById('weightChart').getContext('2d');
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага', data: [], borderColor: '#FFC72C', tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: '#222' } }, x: { grid: { display: false } } } }
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
