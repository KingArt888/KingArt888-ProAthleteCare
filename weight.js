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
                target_kcal: analysis.targetCalories,
                macros: { p: analysis.prot, f: analysis.fat, c: analysis.carb },
                status: analysis.status,
                statusColor: analysis.statusColor,
                recommendation: analysis.recommendation,
                date: new Date().toLocaleDateString('uk-UA'),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await firebase.firestore().collection('users').doc(currentUserId).set({ height: h, age: a }, { merge: true });
            loadHistory();
        } catch (error) { console.error("Firebase Error:", error); }
    }

    function calculateAthleteData(w, bmi, h, a) {
        let status, recommendation, statusColor, modifier, pRatio, fRatio, cRatio;

        if (bmi < 20.5) { 
            status = "MUSCLE GAIN MODE";
            recommendation = "Гіпертрофія: Профіцит +15%.";
            statusColor = "#00BFFF"; modifier = 1.15; pRatio = 0.25; fRatio = 0.25; cRatio = 0.50; 
        } else if (bmi < 25.5) {
            status = "ATHLETIC FORM";
            recommendation = "Рекімпозиція: Підтримка форми.";
            statusColor = "#FFC72C"; modifier = 1.0; pRatio = 0.30; fRatio = 0.25; cRatio = 0.45;
        } else {
            status = "WEIGHT LOSS MODE";
            recommendation = "Жироспалювання: Дефіцит -20%.";
            statusColor = "#DA3E52"; modifier = 0.80; pRatio = 0.35; fRatio = 0.25; cRatio = 0.40;
        }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * 1.55 * modifier);
        
        return {
            status, recommendation, statusColor, targetCalories,
            prot: Math.round((targetCalories * pRatio) / 4),
            fat: Math.round((targetCalories * fRatio) / 9),
            carb: Math.round((targetCalories * cRatio) / 4)
        };
    }

    // --- ОБНОВЛЕНИЙ COMPOSITION SCAN (МЕНШИЙ ШРИФТ + КОЛЬОРОВИЙ BMI) ---
    function updateScannerUI(weight, bmi, data) {
        const mainValue = document.getElementById('fat-percentage-value');
        if (mainValue) {
            mainValue.style.display = "flex";
            mainValue.style.flexDirection = "column";
            mainValue.style.gap = "2px";
            mainValue.innerHTML = `
                <span style="font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 0.5px;">Weight</span>
                <span style="font-size: 28px; color: #FFC72C; font-weight: bold; line-height: 1;">${weight}</span>
                <span style="font-size: 13px; color: ${data.statusColor}; font-weight: bold;">BMI ${bmi}</span>
            `;
        }

        let rankElement = document.getElementById('athlete-rank');
        if (!rankElement) {
            rankElement = document.createElement('div');
            rankElement.id = 'athlete-rank';
            rankElement.style.cssText = "text-align:center; margin-top:12px; padding-top:10px; border-top: 1px solid #1a1a1a;";
            document.querySelector('.form-card:nth-child(2)').appendChild(rankElement);
        }
        rankElement.innerHTML = `
            <div style="color:${data.statusColor}; font-size:12px; font-weight:bold; letter-spacing:1px; margin-bottom:4px;">${data.status}</div>
            <div style="color:#fff; font-size:20px; font-weight:bold; margin-bottom:4px;">${data.targetCalories} ккал</div>
            <div style="color:#888; font-size:10px; background: #0a0a0a; padding: 4px; border-radius: 4px; border: 1px solid #1a1a1a;">
                Б: ${data.prot}г | Ж: ${data.fat}г | В: ${data.carb}г
            </div>
            <div style="color:#555; font-size:9px; margin-top:8px; font-style: italic;">${data.recommendation}</div>
        `;
    }

    function updateRecommendationUI(data) {
        const box = document.getElementById('athlete-recommendation-box');
        if (box) box.innerHTML = `<span style="font-size:11px; color:#666;">РЕЖИМ:</span> <strong style="font-size:11px;">${data.status}</strong>`;
        
        const btn = document.getElementById('get-diet-plan-btn');
        if (btn) btn.style.display = 'block';
        
        document.getElementById('total-daily-kcal').textContent = data.targetCalories;
        document.getElementById('calories-left').textContent = data.targetCalories;
    }

    // --- КНОПКИ ШВИДКОСТІ ---
    window.setSpeed = function(speed, btn) {
        selectedSpeed = speed;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "#111"; b.style.color = "#555";
        });
        btn.style.background = "#FFC72C"; btn.style.color = "#000";
    };

    // --- ГЕНЕРАЦІЯ ДІЄТИ ---
    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        const container = document.getElementById('diet-container');
        const cats = { breakfasts: "Сніданок", lunches: "Обід", dinners: "Вечеря" };
        let html = `<div style="margin-top:12px;">`;
        let usedKcal = 0;

        for (let key in cats) {
            const meals = dietDatabase[key].filter(m => m.speed === selectedSpeed);
            const meal = meals[Math.floor(Math.random() * meals.length)] || dietDatabase[key][0];
            const kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            usedKcal += kcal;

            html += `
                <div style="background:rgba(255,255,255,0.02); border:1px solid #1a1a1a; padding:8px; border-radius:4px; margin-bottom:6px; border-left: 2px solid #FFC72C;">
                    <div style="display:flex; justify-content:space-between; font-size:9px;">
                        <span style="color:#FFC72C; font-weight:bold; text-transform:uppercase;">${cats[key]}</span>
                        <span style="color:#444;">${kcal} kcal</span>
                    </div>
                    <div style="color:#eee; font-size:12px; font-weight:bold; margin:2px 0;">${meal.name}</div>
                    <div style="font-size:9px; color:#666;">Б:${meal.p} Ж:${meal.f} В:${meal.c}</div>
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
            .where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(10).get();
        
        const historyContainer = getOrCreateCompactHistory();
        historyContainer.innerHTML = "";

        if (!snap.empty) {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const last = docs[0];
            
            updateScannerUI(last.weight, last.bmi, calculateAthleteData(last.weight, last.bmi, 180, 30));

            const chartData = [...docs].reverse();
            weightChart.data.labels = chartData.map(d => d.date.split('.').slice(0,2).join('.'));
            weightChart.data.datasets[0].data = chartData.map(d => d.weight);
            weightChart.update();

            docs.forEach(entry => {
                const item = document.createElement('div');
                item.style.cssText = "display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #111; font-size:11px; color:#888;";
                item.innerHTML = `<span><strong>${entry.weight} kg</strong> <small style="color:#333; margin-left:5px;">${entry.date}</small></span>
                                  <button onclick=\"deleteWeightEntry('${entry.id}')\" style=\"background:none; border:none; color:#444; cursor:pointer;\">✕</button>`;
                historyContainer.appendChild(item);
            });
        }
    }

    function initChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ data: [], borderColor: '#FFC72C', pointRadius: 0, borderWidth: 2, tension: 0.4, fill: false }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
        });
    }

    function getOrCreateCompactHistory() {
        let container = document.getElementById('compact-history');
        if (!container) {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = "margin-top:10px; max-height:120px; overflow-y:auto;";
            container = document.createElement('div');
            container.id = 'compact-history';
            wrapper.appendChild(container);
            document.querySelector('.chart-card').appendChild(wrapper);
        }
        return container;
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            if (document.getElementById('user-height')) document.getElementById('user-height').value = d.height || "";
            if (document.getElementById('user-age')) document.getElementById('user-age').value = d.age || "";
        }
    }

    window.deleteWeightEntry = async (id) => {
        if (confirm("Видалити?")) {
            await firebase.firestore().collection('weight_history').doc(id).delete();
            loadHistory();
        }
    };
})();
