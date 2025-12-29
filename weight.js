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

    // --- ПЕРСОНАЛЬНИЙ РОЗРАХУНОК (BMI + БЖУ ПО ФОРМУЛІ) ---
    function calculateAthleteData(w, h, a) {
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let status, statusColor, modifier, pRatio, fRatio, cRatio;

        if (bmi < 20.5) { 
            status = "MUSCLE GAIN MODE"; statusColor = "#00BFFF"; // Синій
            modifier = 1.15; pRatio = 0.25; fRatio = 0.25; cRatio = 0.50; 
        } else if (bmi < 25.5) {
            status = "ATHLETIC FORM"; statusColor = "#FFC72C"; // Золотий
            modifier = 1.0; pRatio = 0.30; fRatio = 0.25; cRatio = 0.45;
        } else {
            status = "WEIGHT LOSS MODE"; statusColor = "#DA3E52"; // Червоний
            modifier = 0.80; pRatio = 0.35; fRatio = 0.25; cRatio = 0.40;
        }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * 1.55 * modifier);
        
        return {
            bmi, status, statusColor, targetCalories,
            prot: Math.round((targetCalories * pRatio) / 4),
            fat: Math.round((targetCalories * fRatio) / 9),
            carb: Math.round((targetCalories * cRatio) / 4)
        };
    }

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        if (!w || !h || !a) return;

        currentAnalysis = calculateAthleteData(w, h, a);
        updateScannerUI(w, currentAnalysis);
        updateMacrosLeftUI();

        try {
            await firebase.firestore().collection('weight_history').add({
                userId: currentUserId, weight: w, bmi: currentAnalysis.bmi,
                target_kcal: currentAnalysis.targetCalories,
                date: new Date().toLocaleDateString('uk-UA'),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await firebase.firestore().collection('users').doc(currentUserId).set({ height: h, age: a }, { merge: true });
            loadHistory();
        } catch (error) { console.error(error); }
    }

    // --- UI SCANNER (ЗОЛОТИЙ СТИЛЬ + КОЛЬОРОВИЙ BMI) ---
    function updateScannerUI(weight, data) {
        const mainValue = document.getElementById('fat-percentage-value');
        if (mainValue) {
            mainValue.innerHTML = `
                <span style="font-size: 9px; color: #555; text-transform: uppercase;">Weight</span>
                <span style="font-size: 28px; color: #FFC72C; font-weight: bold; line-height: 1;">${weight}</span>
                <span style="font-size: 13px; color: ${data.statusColor}; font-weight: bold;">BMI ${data.bmi}</span>
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
            <div style="color:${data.statusColor}; font-size:11px; font-weight:bold; letter-spacing:1px;">${data.status}</div>
            <div style="color:#fff; font-size:18px; font-weight:bold; margin:4px 0;">${data.targetCalories} ккал</div>
            <div style="color:#888; font-size:10px;">Б: ${data.prot}г | Ж: ${data.fat}г | В: ${data.carb}г</div>
        `;
    }

    // --- ДІЄТА: ГАЛОЧКИ ТА ВІДНІМАННЯ ---
    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        const container = document.getElementById('diet-container');
        const cats = { breakfasts: "Сніданок", lunches: "Обід", dinners: "Вечеря" };
        currentDailyPlan = [];
        let html = `<div style="margin-top:10px;">`;

        for (let key in cats) {
            const meals = dietDatabase[key].filter(m => m.speed === selectedSpeed);
            const meal = meals[Math.floor(Math.random() * meals.length)] || dietDatabase[key][0];
            const kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            const mealObj = { ...meal, kcal, id: Math.random().toString(36).substr(2, 9), eaten: false };
            currentDailyPlan.push(mealObj);

            html += `
                <div id="meal-${mealObj.id}" style="background:rgba(255,255,255,0.02); border:1px solid #1a1a1a; padding:8px; border-radius:6px; margin-bottom:6px; border-left: 3px solid #FFC72C; display:flex; align-items:center; transition: 0.3s;">
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; font-size:9px;">
                            <span style="color:#FFC72C; font-weight:bold;">${cats[key]}</span>
                            <span style="color:#444;">${kcal} kcal</span>
                        </div>
                        <div style="color:#eee; font-size:12px; font-weight:bold;">${meal.name}</div>
                        <div style="font-size:9px; color:#666;">Б:${meal.p} Ж:${meal.f} В:${meal.c}</div>
                    </div>
                    <input type="checkbox" style="accent-color:#FFC72C; width:16px; height:16px;" onchange="toggleMeal('${mealObj.id}', this)">
                </div>
            `;
        }
        container.innerHTML = html + `</div>`;
        updateMacrosLeftUI();
    }

    window.toggleMeal = function(id, checkbox) {
        const meal = currentDailyPlan.find(m => m.id === id);
        const card = document.getElementById(`meal-${id}`);
        if (meal) {
            meal.eaten = checkbox.checked;
            card.style.opacity = meal.eaten ? "0.1" : "1"; // Майже невидима
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

        document.getElementById('calories-left').textContent = kL;
        document.getElementById('calories-left').style.color = kL < 0 ? "#DA3E52" : "#FFC72C";
        document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetCalories;

        let sub = document.getElementById('macros-left-sub');
        if (!sub) {
            sub = document.createElement('div');
            sub.id = 'macros-left-sub';
            sub.style.cssText = "font-size: 10px; color: #555; margin-top: 4px; text-align: right;";
            document.getElementById('calories-left').parentElement.appendChild(sub);
        }
        sub.innerHTML = `ЗАЛИШОК БЖУ: Б:${pL}г Ж:${fL}г В:${cL}г`;
    }

    // --- ІНШЕ ---
    window.setSpeed = function(s, b) {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(btn => { btn.style.background = "#111"; btn.style.color = "#555"; });
        b.style.background = "#FFC72C"; b.style.color = "#000";
    };

    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(7).get();
        if (!snap.empty) {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const last = docs[0];
            currentAnalysis = calculateAthleteData(last.weight, 180, 30); // Тимчасово 180/30 до завантаження профілю
            updateScannerUI(last.weight, currentAnalysis);
            updateMacrosLeftUI();
            
            weightChart.data.labels = docs.reverse().map(d => d.date.split('.').slice(0,2).join('.'));
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
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

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('user-height').value = d.height || "";
            document.getElementById('user-age').value = d.age || "";
        }
    }
})();
