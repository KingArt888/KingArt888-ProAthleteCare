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
            loadHistory(); 
        } catch (e) { console.error(e); }
    };

    // 2. ОБРОБКА ТА РОЗРАХУНОК
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
                    <div style="color:${data.statusColor}; font-size:11px; font-weight:bold; text-transform:uppercase;">${data.status}</div>
                    <div style="font-size:38px; color:#FFC72C; font-weight:bold; margin:2px 0;">${weight}kg</div>
                    <div style="color:#fff; font-size:12px;">BMI: ${bmi}</div>
                </div>
            `;
        }
    }

    function updateRecommendationUI(data) {
        const box = document.getElementById('athlete-recommendation-box');
        if (box) {
            box.innerHTML = `
                <div style="border-left: 3px solid ${data.statusColor}; padding-left: 12px; background: rgba(255,199,44,0.05); padding: 10px; border-radius: 4px;">
                    <p style="color:#eee; font-size:14px; margin:0;">Режим: <strong>${data.status}</strong></p>
                    <p style="color:#ccc; font-size:13px; margin:5px 0 0 0;">Мета: <strong>${data.targetCalories} ккал</strong>/день</p>
                </div>
            `;
        }
        document.getElementById('speed-selector-container').style.display = 'block';
    }

    // 3. ВИДАЧА ДІЄТИ (Згідно з твоїм об'єктом dietDatabase)
    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        
        const container = document.getElementById('diet-container');
        // Перевірка чи завантажена база даних
        if (typeof dietDatabase === 'undefined') {
            container.innerHTML = `<p style="color:#DA3E52; font-size:12px; text-align:center;">Помилка: База дієти diet-data.js не завантажена!</p>`;
            return;
        }

        const categories = {
            breakfasts: "СНІДАНОК",
            lunches: "ОБІД",
            dinners: "ВЕЧЕРЯ"
        };

        let html = `<h4 style="color:#FFC72C; font-size:13px; margin:15px 0 10px; text-transform:uppercase;">Твій раціон:</h4>`;

        for (let key in categories) {
            const meals = dietDatabase[key].filter(m => m.speed === selectedSpeed);
            // Беремо випадкову страву з обраною швидкістю
            const meal = meals[Math.floor(Math.random() * meals.length)] || dietDatabase[key][0];

            html += `
                <div style="background:#111; border:1px solid #222; padding:12px; border-radius:8px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                        <span style="color:#FFC72C; font-size:10px; font-weight:bold;">${categories[key]}</span>
                        <span style="color:#666; font-size:10px;">${selectedSpeed}</span>
                    </div>
                    <div style="color:#fff; font-size:14px; font-weight:bold; margin-bottom:4px;">${meal.name}</div>
                    ${meal.rec ? `<div style="color:#888; font-size:11px; font-style:italic; margin-bottom:6px;">"${meal.rec}"</div>` : ''}
                    <div style="display:flex; gap:10px; font-size:11px; color:#FFC72C;">
                        <span>Б: ${meal.p}г</span> <span>Ж: ${meal.f}г</span> <span>В: ${meal.c}г</span>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
        document.getElementById('kcal-balance').style.display = 'block';
        document.getElementById('calories-left').textContent = currentAnalysis.targetCalories;

        // Зберігаємо вибір у Firebase
        try {
            await firebase.firestore().collection('athlete_plans').doc(currentUserId).set({
                kcal: currentAnalysis.targetCalories,
                speed: selectedSpeed,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (e) { console.error(e); }
    }

    // 4. ІСТОРІЯ ТА ГРАФІК
    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(10).get();
        
        const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        const chartData = [...docs].reverse();
        weightChart.data.labels = chartData.map(d => d.date.split('.').slice(0,2).join('.'));
        weightChart.data.datasets[0].data = chartData.map(d => d.weight);
        weightChart.update();

        if (docs.length > 0) {
            updateScannerUI(docs[0].weight, docs[0].bmi, calculateAthleteData(docs[0].weight, docs[0].bmi, 180, 25));
        }

        renderHistoryList(docs);
    }

    function renderHistoryList(docs) {
        let list = document.getElementById('compact-history-list');
        if (!list) {
            const chartCard = document.querySelector('.chart-card');
            list = document.createElement('div');
            list.id = 'compact-history-list';
            list.style.cssText = "margin-top:20px; border-top:1px solid #222; padding-top:15px;";
            chartCard.appendChild(list);
        }

        list.innerHTML = docs.map(doc => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#080808; padding:8px 12px; margin-bottom:6px; border-radius:4px; border:1px solid #111;">
                <div>
                    <span style="color:#444; font-size:10px;">${doc.date}</span>
                    <div style="color:#fff; font-weight:bold; font-size:13px;">${doc.weight} kg <small style="color:#FFC72C; font-size:10px; margin-left:5px;">BMI: ${doc.bmi}</small></div>
                </div>
                <button onclick="deleteWeightEntry('${doc.id}')" style="background:none; border:none; color:#DA3E52; font-size:18px; cursor:pointer;">&times;</button>
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
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага', data: [], borderColor: '#FFC72C', backgroundColor: 'rgba(255,199,44,0.05)', tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: '#1a1a1a' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
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
