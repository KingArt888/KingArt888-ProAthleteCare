(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; 
    let currentAnalysis = null;
    let currentDailyPlan = [];

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

    // --- ПЕРСОНАЛЬНІ РОЗРАХУНКИ ---
    function calculateAthleteData(w, bmi, h, a) {
        let status, statusColor, modifier, pRatio, fRatio, cRatio;
        if (bmi < 20.5) { 
            status = "MUSCLE GAIN"; statusColor = "#00BFFF"; modifier = 1.15; pRatio = 0.25; fRatio = 0.25; cRatio = 0.50; 
        } else if (bmi < 25.5) {
            status = "ATHLETIC"; statusColor = "#FFC72C"; modifier = 1.0; pRatio = 0.30; fRatio = 0.25; cRatio = 0.45;
        } else {
            status = "WEIGHT LOSS"; statusColor = "#DA3E52"; modifier = 0.80; pRatio = 0.35; fRatio = 0.25; cRatio = 0.40;
        }
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * 1.55 * modifier);
        return {
            status, statusColor, targetCalories,
            prot: Math.round((targetCalories * pRatio) / 4),
            fat: Math.round((targetCalories * fRatio) / 9),
            carb: Math.round((targetCalories * cRatio) / 4)
        };
    }

    // --- ЦЕНТРУВАННЯ ТЕКСТУ В КРУГУ ---
    function updateScannerUI(weight, bmi, data) {
        const mainValue = document.getElementById('fat-percentage-value');
        if (mainValue) {
            // Забезпечуємо ідеальне центрування через JS стилі
            mainValue.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; width:100%; height:100%; position:absolute; top:0; left:0; pointer-events:none;";
            mainValue.innerHTML = `
                <div style="font-size: 10px; color: #555; text-transform: uppercase; letter-spacing:1px;">Weight</div>
                <div style="font-size: 32px; color: #FFC72C; font-weight: bold; line-height: 1;">${weight}</div>
                <div style="font-size: 11px; color: ${data.statusColor}; font-weight: bold; margin-top: 5px; border-top: 1px solid #222; padding-top: 3px;">BMI ${bmi}</div>
            `;
        }

        let rankEl = document.getElementById('athlete-rank');
        if (!rankEl) {
            rankEl = document.createElement('div');
            rankEl.id = 'athlete-rank';
            document.querySelector('.form-card:nth-child(2)').appendChild(rankEl);
        }
        rankEl.style.cssText = "text-align:center; margin-top:20px; padding:10px; border-top: 1px solid #1a1a1a;";
        rankEl.innerHTML = `
            <div style="color:${data.statusColor}; font-size:12px; font-weight:bold; letter-spacing:1px; margin-bottom:5px;">${data.status}</div>
            <div style="color:#fff; font-size:22px; font-weight:bold;">${data.targetCalories} <span style="font-size:12px; color:#444;">kcal/day</span></div>
            <div style="color:#666; font-size:10px; margin-top:5px;">ЦІЛЬ БЖУ: Б:${data.prot}г | Ж:${data.fat}г | В:${data.carb}г</div>
        `;
    }

    // --- ГЕНЕРАЦІЯ ДІЄТИ (6 ПРИЙОМІВ ДЛЯ ПОВНОГО КАЛОРАЖУ) ---
    async function generateWeeklyPlan() {
        if (!currentAnalysis) { alert("Спочатку натисніть АНАЛІЗ"); return; }
        const container = document.getElementById('diet-container');
        const mealPlan = [
            { key: 'breakfasts', label: 'Сніданок' },
            { key: 'breakfasts', label: 'Перекус I' },
            { key: 'lunches', label: 'Обід' },
            { key: 'lunches', label: 'Перекус II' },
            { key: 'dinners', label: 'Вечеря' },
            { key: 'dinners', label: 'Перед сном' }
        ];
        
        currentDailyPlan = [];
        let html = `<div style="margin-top:15px;">`;

        mealPlan.forEach(plan => {
            const meals = dietDatabase[plan.key].filter(m => m.speed === selectedSpeed);
            const meal = meals[Math.floor(Math.random() * meals.length)] || dietDatabase[plan.key][0];
            const kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            
            const mealObj = { ...meal, kcal, id: Math.random().toString(36).substr(2, 9), eaten: false };
            currentDailyPlan.push(mealObj);

            html += `
                <div id="meal-${mealObj.id}" style="background:rgba(255,255,255,0.02); border:1px solid #1a1a1a; padding:12px; border-radius:8px; margin-bottom:8px; border-left: 4px solid #FFC72C; display: flex; align-items: center; justify-content: space-between;">
                    <div style="flex: 1;">
                        <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:4px;">
                            <span style="color:#FFC72C; font-weight:bold; text-transform:uppercase;">${plan.label}</span>
                            <span style="color:#444;">${kcal} kcal</span>
                        </div>
                        <div style="color:#fff; font-size:14px; font-weight:bold;">${meal.name}</div>
                        <div style="font-size:10px; color:#666; margin-top:2px;">Б:${meal.p}г | Ж:${meal.f}г | В:${meal.c}г</div>
                    </div>
                    <input type="checkbox" style="accent-color:#FFC72C; width:20px; height:20px; cursor:pointer;" onchange="toggleMeal('${mealObj.id}', this)">
                </div>
            `;
        });
        container.innerHTML = html + `</div>`;
        updateMacrosLeftUI();
    }

    // --- ЖИВЕ ВІДНІМАННЯ ---
    window.toggleMeal = function(id, checkbox) {
        const meal = currentDailyPlan.find(m => m.id === id);
        const card = document.getElementById(`meal-${id}`);
        if (meal) {
            meal.eaten = checkbox.checked;
            card.style.opacity = meal.eaten ? "0.1" : "1";
            card.style.filter = meal.eaten ? "grayscale(100%)" : "none";
            updateMacrosLeftUI();
        }
    };

    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c;
            return acc;
        }, { k: 0, p: 0, f: 0, c: 0 });

        const kL = currentAnalysis.targetCalories - eaten.k;
        const pL = currentAnalysis.prot - eaten.p;
        const fL = currentAnalysis.fat - eaten.f;
        const cL = currentAnalysis.carb - eaten.c;

        const leftEl = document.getElementById('calories-left');
        if (leftEl) {
            leftEl.textContent = kL;
            leftEl.style.color = kL < 0 ? "#DA3E52" : "#FFC72C";
        }
        
        const totalEl = document.getElementById('total-daily-kcal');
        if (totalEl) totalEl.textContent = currentAnalysis.targetCalories;

        let sub = document.getElementById('macros-left-sub');
        if (!sub) {
            sub = document.createElement('div');
            sub.id = 'macros-left-sub';
            sub.style.cssText = "font-size: 11px; color: #555; margin-top: 5px; text-align: right; font-family: monospace;";
            if (leftEl) leftEl.parentElement.appendChild(sub);
        }
        sub.innerHTML = `ЗАЛИШОК БЖУ: Б:${pL}г Ж:${fL}г В:${cL}г`;
    }

    // --- ОБРОБКА ФОРМИ ---
    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        currentAnalysis = calculateAthleteData(w, bmi, h, a);
        updateScannerUI(w, bmi, currentAnalysis);
        updateMacrosLeftUI();

        try {
            await firebase.firestore().collection('weight_history').add({
                userId: currentUserId, weight: w, bmi: bmi,
                target_kcal: currentAnalysis.targetCalories,
                date: new Date().toLocaleDateString('uk-UA'),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await firebase.firestore().collection('users').doc(currentUserId).set({ height: h, age: a }, { merge: true });
            loadHistory();
        } catch (err) { console.error(err); }
    }

    // --- CHART & HISTORY ---
    function initChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ data: [], borderColor: '#FFC72C', pointRadius: 2, borderWidth: 2, tension: 0.4, fill: false }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
        });
    }

    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history').where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(7).get();
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data());
            const last = docs[0];
            const h = parseFloat(document.getElementById('user-height').value) || 180;
            const a = parseInt(document.getElementById('user-age').value) || 30;
            currentAnalysis = calculateAthleteData(last.weight, last.bmi, h, a);
            updateScannerUI(last.weight, last.bmi, currentAnalysis);
            updateMacrosLeftUI();

            const chartData = [...docs].reverse();
            weightChart.data.labels = chartData.map(d => d.date.split('.').slice(0,2).join('.'));
            weightChart.data.datasets[0].data = chartData.map(d => d.weight);
            weightChart.update();
        }
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            if (document.getElementById('user-height')) document.getElementById('user-height').value = d.height || "";
            if (document.getElementById('user-age')) document.getElementById('user-age').value = d.age || "";
        }
    }

    window.setSpeed = function(s, b) {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(btn => { btn.style.background = "#111"; btn.style.color = "#555"; });
        b.style.background = "#FFC72C"; b.style.color = "#000";
    };
})();
