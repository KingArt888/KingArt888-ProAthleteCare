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

    // --- ОБРОБКА ТА АНАЛІЗ ---
    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const analysis = calculateAthleteData(w, bmi, h, a);
        currentAnalysis = analysis;

        // Повертаємо той самий візуал у коло
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

    // --- ТОЙ САМИЙ COMPOSITION SCAN (Попередня версія) ---
    function updateScannerUI(weight, bmi, data) {
        document.getElementById('bmi-value').textContent = bmi;
        const circle = document.querySelector('.main-circle');
        if (circle) {
            circle.style.border = `2px solid ${data.statusColor}`;
            circle.innerHTML = `
                <div style="text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
                    <div style="color:${data.statusColor}; font-size:10px; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">${data.status}</div>
                    <div style="font-size:32px; color:#FFC72C; font-weight:bold; margin:2px 0;">${weight}kg</div>
                    <div style="color:#fff; font-size:11px; opacity:0.8;">BMI: ${bmi}</div>
                </div>
            `;
        }
    }

    function updateRecommendationUI(data) {
        const box = document.getElementById('athlete-recommendation-box');
        if (box) {
            box.innerHTML = `
                <div style="border-left: 3px solid ${data.statusColor}; padding-left: 12px;">
                    <p style="color:#eee; font-size:14px; margin:0;">Ціль: <strong>${data.targetCalories} ккал</strong></p>
                    <p style="color:#888; font-size:12px;">Режим підібрано під ваш BMI.</p>
                </div>
            `;
        }
        document.getElementById('get-diet-plan-btn').style.display = 'block';
        document.getElementById('total-daily-kcal').textContent = data.targetCalories;
        document.getElementById('calories-left').textContent = data.targetCalories;
    }

    // --- ВИБІР ШВИДКОСТІ ---
    window.setSpeed = function(speed, btn) {
        selectedSpeed = speed;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "#222"; 
            b.style.color = "#fff";
        });
        btn.style.background = "#FFC72C"; 
        btn.style.color = "#000";
    };

    // --- ГЕНЕРАЦІЯ ПЛАНУ ---
    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        const container = document.getElementById('diet-container');
        
        const cats = { breakfasts: "Сніданок", lunches: "Обід", dinners: "Вечеря" };
        let html = `<div style="margin-top:15px;">`;
        let usedKcal = 0;

        for (let key in cats) {
            const meals = dietDatabase[key].filter(m => m.speed === selectedSpeed);
            const meal = meals[Math.floor(Math.random() * meals.length)] || dietDatabase[key][0];
            const kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            usedKcal += kcal;

            html += `
                <div style="background:rgba(255,255,255,0.03); border:1px solid #222; padding:10px; border-radius:6px; margin-bottom:8px;">
                    <div style="color:#FFC72C; font-size:9px; font-weight:bold;">${cats[key]}</div>
                    <div style="color:#fff; font-size:13px; font-weight:bold;">${meal.name}</div>
                    <div style="font-size:10px; color:#666;">Б: ${meal.p}г | Ж: ${meal.f}г | В: ${meal.c}г</div>
                </div>
            `;
        }
        container.innerHTML = html + `</div>`;
        document.getElementById('calories-left').textContent = currentAnalysis.targetCalories - usedKcal;
    }

    // --- ГРАФІК ТА ІСТОРІЯ ---
    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(7).get();
        
        const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        if (docs.length > 0) {
            const last = docs[0];
            updateScannerUI(last.weight, last.bmi, calculateAthleteData(last.weight, last.bmi, 180, 33));
            document.getElementById('total-daily-kcal').textContent = last.target_kcal || 0;
        }

        const chartData = [...docs].reverse();
        weightChart.data.labels = chartData.map(d => d.date.split('.').slice(0,2).join('.'));
        weightChart.data.datasets[0].data = chartData.map(d => d.weight);
        weightChart.update();

        renderHistoryList(docs);
    }

    function renderHistoryList(docs) {
        let list = document.getElementById('compact-history-list');
        if (!list) {
            list = document.createElement('div');
            list.id = 'compact-history-list';
            list.style.cssText = "margin-top:20px; border-top:1px solid #222; padding-top:10px;";
            document.querySelector('.chart-card').appendChild(list);
        }

        list.innerHTML = docs.map(doc => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#0a0a0a; padding:8px 12px; margin-bottom:5px; border-radius:4px; border:1px solid #1a1a1a;">
                <div style="font-size:12px; color:#eee;"><strong>${doc.weight} kg</strong> <span style="color:#444; font-size:10px; margin-left:5px;">${doc.date}</span></div>
                <button onclick="deleteWeightEntry('${doc.id}')" style="background:none; border:none; color:#DA3E52; cursor:pointer; font-size:18px;">&times;</button>
            </div>
        `).join('');
    }

    function initChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага', data: [], borderColor: '#FFC72C', tension: 0.4, fill: false }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: '#111' } }, x: { grid: { display: false } } } }
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

    window.deleteWeightEntry = async function(id) {
        if (!confirm("Видалити?")) return;
        await firebase.firestore().collection('weight_history').doc(id).delete();
        loadHistory();
    };
})();
