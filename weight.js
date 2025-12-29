(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; 
    let currentAnalysis = null;
    let currentDailyPlan = [];

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const weightForm = document.getElementById('weight-form');
        if (weightForm) weightForm.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);

        if (typeof firebase !== 'undefined') {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    currentUserId = user.uid;
                    loadBaseData();
                    loadHistory();
                    checkSavedPlan();
                }
            });
        }
    });

    // 1. АНАЛІЗ: BMI ТА РЕКОМЕНДАЦІЇ
    async function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        
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

        const bmiEl = document.getElementById('bmi-value');
        if (bmiEl) {
            let status = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : "Overweight";
            bmiEl.innerHTML = `<span style="color:#FFC72C">${bmi}</span> | ${status}`;
        }

        const fatEl = document.getElementById('fat-percentage-value');
        if (fatEl) fatEl.innerHTML = `<div style="font-size:32px; color:#FFC72C; font-weight:800;">${w}</div><div style="font-size:10px; letter-spacing:2px;">KG</div>`;
        
        const recBox = document.getElementById('athlete-recommendation-box');
        if (recBox) {
            recBox.innerHTML = `
                <div style="font-size:11px; color:#888; text-transform:uppercase;">Денна норма:</div>
                <div style="font-size:20px; color:#fff; font-weight:bold; margin:5px 0;">${targetCalories} <span style="font-size:12px; color:#FFC72C;">KCAL</span></div>
                <div style="font-size:11px; font-family:monospace; color:#FFC72C;">P:${currentAnalysis.prot}g | F:${currentAnalysis.fat}g | C:${currentAnalysis.carb}g</div>
            `;
        }
        
        document.getElementById('get-diet-plan-btn').style.display = "block";
        updateMacrosLeftUI();
    }

    // 2. ГЕНЕРАЦІЯ: ПРИХОВУЄМО ЗАЙВЕ ТА ВИВОДИМО 40/30/30
    window.generateWeeklyPlan = function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        // Приховуємо вибір швидкості та кнопку
        const speedSelector = document.querySelector('.speed-selector');
        if (speedSelector) speedSelector.style.display = 'none';
        document.getElementById('get-diet-plan-btn').style.display = 'none';

        const specs = [
            { id: 'brf', label: 'СНІДАНОК (40%)', pct: 0.40, dbKey: 'breakfasts' },
            { id: 'lnc', label: 'ОБІД (30%)', pct: 0.30, dbKey: 'lunches' },
            { id: 'din', label: 'ВЕЧЕРЯ (30%)', pct: 0.30, dbKey: 'dinners' }
        ];

        currentDailyPlan = specs.map(spec => {
            const meals = dietDatabase[spec.dbKey].filter(m => m.speed === selectedSpeed);
            const bestMeal = meals[Math.floor(Math.random() * meals.length)];
            return { 
                ...bestMeal, 
                catId: spec.id, 
                catLabel: spec.label, 
                kcal: Math.round((bestMeal.p*4)+(bestMeal.f*9)+(bestMeal.c*4)), 
                eaten: false 
            };
        });

        const wrapper = document.getElementById('diet-tabs-wrapper');
        if (wrapper) wrapper.style.display = 'block';
        
        renderFullList(); // Викликаємо новий метод відображення списком
        savePlanToMemory();
    };

    // 3. НОВИЙ ВИГЛЯД: СПИСОК ВСІХ СТРАВ ОДРАЗУ
    function renderFullList() {
        const content = document.getElementById('diet-tab-content');
        if (!content) return;

        // Приховуємо кнопки вкладок, бо тепер у нас список
        const tabsRow = document.querySelector('#diet-tabs-wrapper > div:first-child');
        if (tabsRow) tabsRow.style.display = 'none';

        content.innerHTML = currentDailyPlan.map(meal => `
            <div style="padding: 15px 0; border-bottom: 1px solid #1a1a1a; display: flex; justify-content: space-between; align-items: center;">
                <div style="opacity: ${meal.eaten ? '0.3' : '1'}; transition: 0.3s;">
                    <h4 style="color: #FFC72C; font-size: 9px; margin: 0; letter-spacing:1px; text-transform:uppercase;">${meal.catLabel}</h4>
                    <div style="color: #fff; font-size: 15px; font-weight: 600; margin: 3px 0;">${meal.name}</div>
                    <div style="color: #666; font-family: monospace; font-size: 10px;">${meal.kcal} KCAL | Б:${meal.p} Ж:${meal.f} В:${meal.c}</div>
                </div>
                <button onclick="window.handleMealDone('${meal.catId}')" style="background: ${meal.eaten ? '#1a1a1a' : '#FFC72C'}; border:none; width:36px; height:36px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.3s;">
                    ${meal.eaten ? '<span style="color:#555">✓</span>' : '<span style="color:#000; font-weight:bold;">+</span>'}
                </button>
            </div>
        `).join('');
    }

    window.handleMealDone = function(id) {
        const meal = currentDailyPlan.find(m => m.catId === id);
        if (meal) {
            meal.eaten = !meal.eaten;
            renderFullList();
            updateMacrosLeftUI();
            savePlanToMemory();
        }
    };

    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const leftKcal = currentAnalysis.targetCalories - eaten.k;
        document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetCalories;
        document.getElementById('calories-left').textContent = leftKcal;

        const bjuEl = document.getElementById('bju-left-display');
        if (bjuEl) {
            bjuEl.innerHTML = `<span>Б: ${currentAnalysis.prot - eaten.p}г</span> <span>Ж: ${currentAnalysis.fat - eaten.f}г</span> <span>В: ${currentAnalysis.carb - eaten.c}г</span>`;
        }
    }

    window.setSpeed = (s, b) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(btn => { 
            btn.style.color = "#555"; btn.style.background = "transparent";
        });
        if (b) { b.style.color = "#FFC72C"; b.style.fontWeight = "bold"; }
    };

    function savePlanToMemory() {
        localStorage.setItem('pac_diet_v3', JSON.stringify({ plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString(), speedHidden: true }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('pac_diet_v3');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan; currentAnalysis = data.analysis;
                const speedSelector = document.querySelector('.speed-selector');
                if (speedSelector) speedSelector.style.display = 'none';
                document.getElementById('diet-tabs-wrapper').style.display = 'block';
                document.getElementById('get-diet-plan-btn').style.display = 'none';
                renderFullList(); updateMacrosLeftUI();
            }
        }
    }

    // Решта функцій (Chart, Firebase) залишаються без змін...
    function initChart() { /* ... */ }
    async function loadHistory() { /* ... */ }
    async function loadBaseData() { /* ... */ }
})();
