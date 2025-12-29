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
            checkSavedPlan(); // Перевіряємо, чи є план у пам'яті
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const form = document.getElementById('weight-form');
        if (form) form.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);
    });

    // --- РОЗРАХУНКИ ---
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
        return { status, statusColor, targetCalories, prot: Math.round((targetCalories * pRatio) / 4), fat: Math.round((targetCalories * fRatio) / 9), carb: Math.round((targetCalories * cRatio) / 4) };
    }

    // --- ЦЕНТРУВАННЯ ТЕКСТУ В КРУГУ ---
    function updateScannerUI(weight, bmi, data) {
        const mainValue = document.getElementById('fat-percentage-value');
        if (mainValue) {
            mainValue.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; position:absolute; inset:0; pointer-events:none;";
            mainValue.innerHTML = `
                <div style="font-size: 10px; color: #555; text-transform: uppercase;">Weight</div>
                <div style="font-size: 34px; color: #FFC72C; font-weight: bold; line-height: 1;">${weight}</div>
                <div style="font-size: 12px; color: ${data.statusColor}; font-weight: bold; border-top: 1px solid #222; margin-top: 5px; padding-top: 3px;">BMI ${bmi}</div>
            `;
        }
        let rankEl = document.getElementById('athlete-rank') || (function(){
            let el = document.createElement('div'); el.id = 'athlete-rank';
            document.querySelector('.form-card:nth-child(2)').appendChild(el); return el;
        })();
        rankEl.style.cssText = "text-align:center; margin-top:20px; border-top:1px solid #1a1a1a; padding-top:10px;";
        rankEl.innerHTML = `<div style="color:${data.statusColor}; font-size:12px; font-weight:bold;">${data.status}</div><div style="color:#fff; font-size:20px; font-weight:bold;">${data.targetCalories} kcal</div>`;
    }

    // --- ДІЄТА ТА ПАМ'ЯТЬ ---
    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        const mealLabels = ["Сніданок", "Перекус I", "Обід", "Перекус II", "Вечеря", "Перед сном"];
        const mealKeys = ["breakfasts", "breakfasts", "lunches", "lunches", "dinners", "dinners"];
        currentDailyPlan = mealKeys.map((key, i) => {
            const meals = dietDatabase[key].filter(m => m.speed === selectedSpeed);
            const meal = meals[Math.floor(Math.random() * meals.length)] || dietDatabase[key][0];
            return { ...meal, label: mealLabels[i], kcal: (meal.p*4)+(meal.f*9)+(meal.c*4), id: Math.random().toString(36).substr(2,9), eaten: false };
        });
        localStorage.setItem('saved_diet_plan', JSON.stringify({plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString()}));
        renderDietPlan();
    }

    function renderDietPlan() {
        const container = document.getElementById('diet-container');
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.disabled = true; // Робимо кнопку неактивною

        let html = `<div style="margin-top:15px;">`;
        currentDailyPlan.forEach(meal => {
            html += `
                <div id="meal-${meal.id}" style="background:rgba(255,255,255,0.02); border:1px solid #1a1a1a; padding:12px; border-radius:8px; margin-bottom:8px; border-left: 4px solid #FFC72C; display: flex; align-items: center; justify-content: space-between; transition: 0.3s; opacity: ${meal.eaten ? '0.15' : '1'}">
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; font-size:9px;"><span style="color:#FFC72C; font-weight:bold;">${meal.label}</span><span style="color:#444;">${meal.kcal} kcal</span></div>
                        <div style="color:#fff; font-size:14px; font-weight:bold;">${meal.name}</div>
                        <div style="font-size:10px; color:#666;">Б:${meal.p} Ж:${meal.f} В:${meal.c}</div>
                    </div>
                    <input type="checkbox" ${meal.eaten ? 'checked' : ''} style="accent-color:#FFC72C; width:18px; height:18px;" onchange="toggleMeal('${meal.id}', this)">
                </div>`;
        });
        container.innerHTML = html + `</div>`;
        updateMacrosLeftUI();
    }

    window.toggleMeal = function(id, checkbox) {
        const meal = currentDailyPlan.find(m => m.id === id);
        if (meal) {
            meal.eaten = checkbox.checked;
            document.getElementById(`meal-${id}`).style.opacity = meal.eaten ? "0.15" : "1";
            localStorage.setItem('saved_diet_plan', JSON.stringify({plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString()}));
            updateMacrosLeftUI();
        }
    };

    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => { acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc; }, {k:0, p:0, f:0, c:0});
        const left = { k: currentAnalysis.targetCalories - eaten.k, p: currentAnalysis.prot - eaten.p, f: currentAnalysis.fat - eaten.f, c: currentAnalysis.carb - eaten.c };
        
        document.getElementById('calories-left').textContent = left.k;
        document.getElementById('calories-left').style.color = left.k < 0 ? "#DA3E52" : "#FFC72C";
        document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetCalories;

        let sub = document.getElementById('macros-left-sub') || (function(){
            let el = document.createElement('div'); el.id = 'macros-left-sub';
            el.style.cssText = "font-size:11px; color:#555; text-align:right; margin-top:5px;";
            document.getElementById('calories-left').parentElement.appendChild(el); return el;
        })();
        sub.innerHTML = `ЗАЛИШОК: Б:${left.p}г Ж:${left.f}г В:${left.c}г`;
    }

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value), h = parseFloat(document.getElementById('user-height').value), a = parseInt(document.getElementById('user-age').value);
        if (!w || !h || !a) return;
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        currentAnalysis = calculateAthleteData(w, bmi, h, a);
        updateScannerUI(w, bmi, currentAnalysis);
        updateMacrosLeftUI();
        await firebase.firestore().collection('weight_history').add({userId: currentUserId, weight: w, bmi, date: new Date().toLocaleDateString('uk-UA'), timestamp: firebase.firestore.FieldValue.serverTimestamp()});
        loadHistory();
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('saved_diet_plan');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan; currentAnalysis = data.analysis;
                renderDietPlan();
            }
        }
    }

    async function loadHistory() {
        const snap = await firebase.firestore().collection('weight_history').where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(7).get();
        const container = document.getElementById('compact-history') || (function(){
            let el = document.createElement('div'); el.id = 'compact-history';
            document.querySelector('.chart-card').appendChild(el); return el;
        })();
        container.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `<div style="display:flex;justify-content:space-between;background:#0a0a0a;padding:8px;margin-bottom:4px;border-radius:4px;border:1px solid #111;font-size:12px;">
                <span>${d.weight}kg (BMI ${d.bmi})</span><span style="color:#444;">${d.date}</span>
                <button onclick="deleteWeightEntry('${doc.id}')" style="background:none;border:none;color:#DA3E52;cursor:pointer;">&times;</button>
            </div>`;
        }).join('');
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data()).reverse();
            weightChart.data.labels = docs.map(d => d.date.split('.').slice(0,2).join('.'));
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
        }
    }

    window.deleteWeightEntry = async function(id) {
        if (confirm("Видалити?")) { await firebase.firestore().collection('weight_history').doc(id).delete(); loadHistory(); }
    };

    function initChart() {
        const ctx = document.getElementById('weightChart'); if (!ctx) return;
        weightChart = new Chart(ctx, { type: 'line', data: { labels: [], datasets: [{ data: [], borderColor: '#FFC72C', pointRadius: 2, borderWidth: 2, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } } });
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('user-height').value = d.height || "";
            document.getElementById('user-age').value = d.age || "";
        }
    }

    window.setSpeed = (s, b) => {
        selectedSpeed = s; document.querySelectorAll('.speed-btn').forEach(btn => { btn.style.background = "#111"; btn.style.color = "#555"; });
        b.style.background = "#FFC72C"; b.style.color = "#000";
    };
})();
