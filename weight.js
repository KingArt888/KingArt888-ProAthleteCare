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
            checkSavedPlan();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const form = document.getElementById('weight-form');
        if (form) form.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);
    });

    // --- 1. БЛОК: АНАЛІЗ (СКАНЕР) ТА РОЗРАХУНКИ ---
    function calculateAthleteData(w, bmi, h, a) {
        let status, statusColor, modifier, pRatio, fRatio, cRatio;

        // Визначаємо режим залежно від BMI
        if (bmi < 20.5) { 
            status = "MUSCLE GAIN MODE"; statusColor = "#00BFFF"; modifier = 1.15; 
            pRatio = 0.25; fRatio = 0.25; cRatio = 0.50; 
        } else if (bmi < 25.5) {
            status = "ATHLETIC FORM"; statusColor = "#FFC72C"; modifier = 1.0; 
            pRatio = 0.30; fRatio = 0.25; cRatio = 0.45;
        } else {
            status = "WEIGHT LOSS MODE"; statusColor = "#DA3E52"; modifier = 0.80; 
            pRatio = 0.35; fRatio = 0.25; cRatio = 0.40;
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

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        currentAnalysis = calculateAthleteData(w, bmi, h, a);
        
        // Вивід у круг (Сканер)
        const scanDisplay = document.getElementById('fat-percentage-value');
        if (scanDisplay) {
            scanDisplay.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; position:absolute; inset:0;";
            scanDisplay.innerHTML = `<div style="font-size:32px; color:#FFC72C; line-height:1;">${w}</div><div style="font-size:12px; color:${currentAnalysis.statusColor};">BMI ${bmi}</div>`;
        }

        // Оновлення рекомендацій та кнопки плану
        const recBox = document.getElementById('athlete-recommendation-box');
        if (recBox) {
            recBox.innerHTML = `<div style="color:${currentAnalysis.statusColor}; font-weight:bold;">${currentAnalysis.status}</div><div>Ціль: ${currentAnalysis.targetCalories} ккал | Б:${currentAnalysis.prot} Ж:${currentAnalysis.fat} В:${currentAnalysis.carb}</div>`;
        }
        document.getElementById('get-diet-plan-btn').style.display = "block";

        await firebase.firestore().collection('weight_history').add({
            userId: currentUserId, weight: w, bmi: bmi,
            date: new Date().toLocaleDateString('uk-UA'),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        loadHistory();
        updateMacrosLeftUI();
    }

    // --- 2. БЛОК: ГЕНЕРАТОР ДІЄТИ ---
    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        const mealKeys = ["breakfasts", "breakfasts", "lunches", "lunches", "dinners", "dinners"];
        
        currentDailyPlan = mealKeys.map((key, i) => {
            const meals = dietDatabase[key].filter(m => m.speed === selectedSpeed);
            const meal = meals[Math.floor(Math.random() * meals.length)] || dietDatabase[key][0];
            return { ...meal, kcal: (meal.p*4)+(meal.f*9)+(meal.c*4), id: Math.random().toString(36).substr(2,9), eaten: false };
        });

        renderDietPlan();
        savePlanToMemory();
    }

    function renderDietPlan() {
        const container = document.getElementById('diet-container');
        if (!container) return;
        document.getElementById('get-diet-plan-btn').disabled = true;
        
        container.innerHTML = currentDailyPlan.map(meal => `
            <div id="meal-${meal.id}" style="background:rgba(255,255,255,0.02); border:1px solid #1a1a1a; padding:10px; border-radius:8px; margin-bottom:8px; border-left:4px solid #FFC72C; display:flex; align-items:center; justify-content:space-between; opacity:${meal.eaten ? '0.15' : '1'}">
                <div style="flex:1">
                    <div style="color:#fff; font-size:14px; font-weight:bold;">${meal.name}</div>
                    <div style="font-size:10px; color:#666;">Б:${meal.p} Ж:${meal.f} В:${meal.c} | ${meal.kcal} kcal</div>
                </div>
                <input type="checkbox" ${meal.eaten ? 'checked' : ''} style="width:20px; height:20px; cursor:pointer;" onchange="toggleMeal('${meal.id}', this)">
            </div>
        `).join('');
        updateMacrosLeftUI();
    }

    // --- 3. БЛОК: КОНТРОЛЬНА ПАНЕЛЬ (ВІДНІМАННЯ) ---
    window.toggleMeal = function(id, checkbox) {
        const meal = currentDailyPlan.find(m => m.id === id);
        if (meal) {
            meal.eaten = checkbox.checked;
            document.getElementById(`meal-${id}`).style.opacity = meal.eaten ? "0.15" : "1";
            savePlanToMemory();
            updateMacrosLeftUI();
        }
    };

    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c;
            return acc;
        }, {k:0, p:0, f:0, c:0});

        const left = {
            k: currentAnalysis.targetCalories - eaten.k,
            p: currentAnalysis.prot - eaten.p,
            f: currentAnalysis.fat - eaten.f,
            c: currentAnalysis.carb - eaten.c
        };

        document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetCalories;
        const kcalLeftEl = document.getElementById('calories-left');
        kcalLeftEl.textContent = left.k;
        kcalLeftEl.style.color = left.k < 0 ? "#DA3E52" : "#FFC72C";

        // Додаємо БЖУ залишок, якщо його немає в HTML
        let bjuBox = document.getElementById('bju-left-display');
        if (!bjuBox) {
            bjuBox = document.createElement('div');
            bjuBox.id = 'bju-left-display';
            bjuBox.style.cssText = "display:flex; justify-content:space-between; font-size:11px; color:#555; margin-top:5px; font-family:monospace;";
            kcalLeftEl.parentElement.appendChild(bjuBox);
        }
        bjuBox.innerHTML = `<span>Б: ${left.p}г</span> <span>Ж: ${left.f}г</span> <span>В: ${left.c}г</span>`;
    }

    // --- 4 & 5. ГРАФІК ТА ІСТОРІЯ ---
    function initChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ data: [], borderColor: '#FFC72C', backgroundColor: 'rgba(255, 199, 44, 0.1)', fill: true, borderWidth: 3, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#FFC72C' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#111' }, ticks: { color: '#444' } }, x: { grid: { display: false }, ticks: { color: '#444' } } } }
        });
    }

    async function loadHistory() {
        if (!currentUserId) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(10).get();

        const container = getOrCreateHistoryContainer();
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        container.innerHTML = docs.map(d => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; margin-bottom:5px; border-radius:6px; border:1px solid #1a1a1a;">
                <div style="font-size:12px; color:#eee;"><strong>${d.weight} kg</strong> <span style="color:#444; font-size:10px; margin-left:8px;">${d.date}</span></div>
                <button onclick="deleteWeightEntry('${d.id}')" style="background:none; border:none; color:#DA3E52; cursor:pointer; font-size:18px;">&times;</button>
            </div>`).join('');

        if (docs.length > 0) {
            const chartData = [...docs].reverse();
            weightChart.data.labels = chartData.map(d => d.date.split('.').slice(0,2).join('.'));
            weightChart.data.datasets[0].data = chartData.map(d => d.weight);
            weightChart.update();
        }
    }

    window.deleteWeightEntry = async function(id) {
        if (!confirm("Видалити запис?")) return;
        await firebase.firestore().collection('weight_history').doc(id).delete();
        loadHistory();
    };

    // --- ПАМ'ЯТЬ ТА ДОПОМІЖНІ ---
    function savePlanToMemory() {
        localStorage.setItem('proatlet_diet', JSON.stringify({
            plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString()
        }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('proatlet_diet');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan; currentAnalysis = data.analysis;
                renderDietPlan();
            }
        }
    }

    function getOrCreateHistoryContainer() {
        let el = document.getElementById('compact-history-list');
        if (!el) {
            const wrap = document.createElement('div');
            wrap.style.cssText = "margin-top:20px; border-top:1px solid #111; padding-top:10px;";
            wrap.innerHTML = '<h4 style="font-size:10px; color:#444; margin-bottom:8px;">RECENT HISTORY</h4>';
            el = document.createElement('div'); el.id = 'compact-history-list';
            wrap.appendChild(el);
            document.querySelector('.chart-card').appendChild(wrap);
        }
        return el;
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            if (document.getElementById('user-height')) document.getElementById('user-height').value = d.height || "";
            if (document.getElementById('user-age')) document.getElementById('user-age').value = d.age || "";
        }
    }

    window.setSpeed = (s, b) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(btn => { 
            btn.style.background = "#222"; btn.style.color = "#fff"; btn.style.border = "1px solid #FFC72C";
        });
        b.style.background = "#FFC72C"; b.style.color = "#000"; b.style.border = "none";
    };
})();
