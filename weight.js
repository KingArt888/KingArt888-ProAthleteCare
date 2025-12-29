(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; 
    let currentAnalysis = null;
    let currentDailyPlan = [];

    // Чекаємо повного завантаження DOM
    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        
        const weightForm = document.getElementById('weight-form');
        if (weightForm) weightForm.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);

        // Перевірка авторизації після завантаження інтерфейсу
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUserId = user.uid;
                loadBaseData();
                loadHistory();
                checkSavedPlan();
            }
        });
    });

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * 1.55);

        currentAnalysis = {
            targetCalories,
            prot: Math.round(targetCalories * 0.30 / 4),
            fat: Math.round(targetCalories * 0.25 / 9),
            carb: Math.round(targetCalories * 0.45 / 4)
        };

        // Безпечне оновлення UI
        const bmiEl = document.getElementById('bmi-value');
        if (bmiEl) bmiEl.textContent = bmi;

        const fatEl = document.getElementById('fat-percentage-value');
        if (fatEl) fatEl.innerHTML = `<div style="font-size:32px; color:#FFC72C;">${w}</div><div style="font-size:12px;">КГ</div>`;
        
        const recBox = document.getElementById('athlete-recommendation-box');
        if (recBox) recBox.innerHTML = `Ціль: ${targetCalories} ккал | Б:${currentAnalysis.prot} Ж:${currentAnalysis.fat} В:${currentAnalysis.carb}`;
        
        const dietBtn = document.getElementById('get-diet-plan-btn');
        if (dietBtn) dietBtn.style.display = "block";

        updateMacrosLeftUI();
    }

    async function generateWeeklyPlan() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        const specs = [
            { id: 'brf', label: 'СНІДАНОК', pct: 0.40, dbKey: 'breakfasts' },
            { id: 'lnc', label: 'ОБІД', pct: 0.30, dbKey: 'lunches' },
            { id: 'din', label: 'ВЕЧЕРЯ', pct: 0.30, dbKey: 'dinners' }
        ];

        currentDailyPlan = specs.map(spec => {
            const tP = currentAnalysis.prot * spec.pct;
            const tF = currentAnalysis.fat * spec.pct;
            const tC = currentAnalysis.carb * spec.pct;
            const meals = dietDatabase[spec.dbKey].filter(m => m.speed === selectedSpeed);
            
            let bestMeal = meals[0];
            let minDiff = Infinity;
            meals.forEach(m => {
                const diff = Math.abs(m.p - tP) + Math.abs(m.f - tF) + Math.abs(m.c - tC);
                if (diff < minDiff) { minDiff = diff; bestMeal = m; }
            });
            return { ...bestMeal, catId: spec.id, catLabel: spec.label, kcal: Math.round((bestMeal.p*4)+(bestMeal.f*9)+(bestMeal.c*4)), eaten: false };
        });

        const wrapper = document.getElementById('diet-tabs-wrapper');
        if (wrapper) wrapper.style.display = 'block';
        
        const mainBtn = document.getElementById('get-diet-plan-btn');
        if (mainBtn) mainBtn.style.display = 'none';

        switchDietTab('brf');
        savePlanToMemory();
    }

    window.switchDietTab = function(tabId) {
        ['brf', 'lnc', 'din'].forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) {
                btn.style.background = (id === tabId) ? "#FFC72C" : "#111";
                btn.style.color = (id === tabId) ? "#000" : "#555";
            }
        });

        const meal = currentDailyPlan.find(m => m.catId === tabId);
        const content = document.getElementById('diet-tab-content');
        if (!meal || !content) return;

        content.innerHTML = `
            <div style="background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 12px;">
                <div style="opacity: ${meal.eaten ? '0.2' : '1'}">
                    <h4 style="color: #FFC72C; font-size: 10px; margin-bottom: 10px;">${meal.catLabel}</h4>
                    <div style="color: #fff; font-size: 18px; font-weight: bold;">${meal.name}</div>
                    <div style="margin-top: 15px; color: #FFC72C; font-family: monospace;">⚡ ${meal.kcal} ККАЛ | Б:${meal.p} Ж:${meal.f} В:${meal.c}</div>
                </div>
                <button onclick="handleMealDone('${meal.catId}')" style="width:100%; margin-top:20px; padding:12px; border-radius:8px; background:${meal.eaten ? '#222' : '#FFC72C'}; color:${meal.eaten ? '#555' : '#000'}; border:none; font-weight:bold; cursor:pointer;">
                    ${meal.eaten ? '✓ З\'ЇДЕНО' : 'ПОЗНАЧИТИ ЯК З\'ЇДЕНЕ'}
                </button>
            </div>
        `;
    };

    window.handleMealDone = function(id) {
        const meal = currentDailyPlan.find(m => m.catId === id);
        if (meal) {
            meal.eaten = !meal.eaten;
            switchDietTab(id);
            updateMacrosLeftUI();
            savePlanToMemory();
        }
    };

    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const totalEl = document.getElementById('total-daily-kcal');
        if (totalEl) totalEl.textContent = currentAnalysis.targetCalories;

        const leftEl = document.getElementById('calories-left');
        if (leftEl) leftEl.textContent = currentAnalysis.targetCalories - eaten.k;

        const bjuEl = document.getElementById('bju-left-display');
        if (bjuEl) {
            bjuEl.innerHTML = `<span>Б: ${currentAnalysis.prot - eaten.p}г</span><span>Ж: ${currentAnalysis.fat - eaten.f}г</span><span>В: ${currentAnalysis.carb - eaten.c}г</span>`;
        }
    }

    function savePlanToMemory() {
        localStorage.setItem('proatlet_diet', JSON.stringify({ plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString() }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('proatlet_diet');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan;
                currentAnalysis = data.analysis;
                const wrapper = document.getElementById('diet-tabs-wrapper');
                if (wrapper) wrapper.style.display = 'block';
                const mainBtn = document.getElementById('get-diet-plan-btn');
                if (mainBtn) mainBtn.style.display = 'none';
                switchDietTab('brf');
                updateMacrosLeftUI();
            }
        }
    }

    window.setSpeed = (s, b) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(btn => { 
            btn.style.background = "#222"; btn.style.color = "#fff"; 
        });
        if (b) { b.style.background = "#FFC72C"; b.style.color = "#000"; }
    };

    function initChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx || typeof Chart === 'undefined') return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ data: [], borderColor: '#FFC72C', tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history').where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(7).get();
        const docs = snap.docs.map(doc => doc.data()).reverse();
        weightChart.data.labels = docs.map(d => d.date);
        weightChart.data.datasets[0].data = docs.map(d => d.weight);
        weightChart.update();
    }

    async function loadBaseData() {
        if (!currentUserId) return;
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            const hInput = document.getElementById('user-height');
            const aInput = document.getElementById('user-age');
            if (hInput) hInput.value = d.height || "";
            if (aInput) aInput.value = d.age || "";
        }
    }
})();
