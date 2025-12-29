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

    // 1. АНАЛІЗ ТА РЕЖИМ (SYNC)
    async function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let mode = "";
        let multiplier = 1.55; 

        if (bmi < 18.5) { mode = "MASS GAIN"; multiplier = 1.8; }
        else if (bmi < 25) { mode = "MAINTENANCE"; multiplier = 1.55; }
        else { mode = "WEIGHT LOSS"; multiplier = 1.3; }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * multiplier);
        const waterLitres = (w * 0.035).toFixed(1);

        currentAnalysis = {
            targetCalories,
            mode,
            waterLitres,
            prot: Math.round(targetCalories * 0.30 / 4),
            fat: Math.round(targetCalories * 0.25 / 9),
            carb: Math.round(targetCalories * 0.45 / 4)
        };

        const bmiEl = document.getElementById('bmi-value');
        if (bmiEl) bmiEl.innerHTML = `<span style="color:#FFC72C">${bmi}</span>`;
        
        const fatEl = document.getElementById('fat-percentage-value');
        if (fatEl) fatEl.innerHTML = `<div style="font-size:32px; color:#FFC72C; font-weight:800;">${w}</div><div style="font-size:10px;">КГ</div>`;
        
        renderHeaderCard(); // Малюємо головну картку
        
        const genBtn = document.getElementById('get-diet-plan-btn');
        if (genBtn) genBtn.style.display = "block";
    }

    // Функція малювання головної картки (де все віднімається)
    function renderHeaderCard() {
        const recBox = document.getElementById('athlete-recommendation-box');
        if (!recBox || !currentAnalysis) return;

        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const leftKcal = currentAnalysis.targetCalories - eaten.k;

        recBox.innerHTML = `
            <div style="background: #000; padding: 20px; border-radius: 15px; border: 1px solid #222; margin-bottom: 20px;">
                <div style="font-size:10px; color:#FFC72C; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Режим: ${currentAnalysis.mode}</div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-size:32px; color:#fff; font-weight:800; line-height:1;">${leftKcal} <span style="font-size:14px; color:#FFC72C;">ККАЛ</span></div>
                        <div style="font-size:12px; color:#888; margin-top:8px; font-family:monospace;">
                            P: <span style="color:#fff">${currentAnalysis.prot - eaten.p}g</span> | 
                            F: <span style="color:#fff">${currentAnalysis.fat - eaten.f}g</span> | 
                            C: <span style="color:#fff">${currentAnalysis.carb - eaten.c}g</span>
                        </div>
                    </div>
                    <div style="text-align:right; border-left: 1px solid #222; padding-left: 20px;">
                        <div style="font-size:24px; color:#fff; font-weight:700; display:flex; align-items:center; gap:5px;">
                            <span style="font-size:18px;">💧</span> ${currentAnalysis.waterLitres}л
                        </div>
                        <div style="font-size:9px; color:#40E0D0; text-transform:uppercase; margin-top:5px;">Вода / День</div>
                    </div>
                </div>
            </div>
        `;
    }

    // 2. ГЕНЕРАЦІЯ ТА ВКЛАДКИ
    window.generateWeeklyPlan = function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        // Ховаємо вибір швидкості
        const speedSelector = document.querySelector('.speed-selector');
        if (speedSelector) speedSelector.style.display = 'none';

        const specs = [
            { id: 'brf', label: 'СНІДАНОК (40%)', dbKey: 'breakfasts' },
            { id: 'lnc', label: 'ОБІД (30%)', dbKey: 'lunches' },
            { id: 'din', label: 'ВЕЧЕРЯ (30%)', dbKey: 'dinners' }
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
        
        const genBtn = document.getElementById('get-diet-plan-btn');
        if (genBtn) genBtn.style.display = 'none';

        renderFullList(); 
        savePlanToMemory();
    };

    function renderFullList() {
        const content = document.getElementById('diet-tab-content');
        if (!content) return;

        content.innerHTML = currentDailyPlan.map(meal => `
            <div style="background: #111; margin-bottom: 12px; padding: 18px; border-radius: 12px; border: 1px solid #222; display: flex; justify-content: space-between; align-items: center; ${meal.eaten ? 'opacity: 0.4;' : ''}">
                <div>
                    <div style="font-size: 9px; color: #FFC72C; text-transform: uppercase; font-weight: 700;">${meal.catLabel}</div>
                    <div style="color: #fff; font-size: 16px; font-weight: 600; margin: 4px 0;">${meal.name}</div>
                    <div style="color: #666; font-size: 11px; font-family: monospace;">Б:${meal.p} Ж:${meal.f} В:${meal.c} • ${meal.kcal} ккал</div>
                </div>
                <button onclick="window.handleMealDone('${meal.catId}')" style="background: ${meal.eaten ? '#222' : '#FFC72C'}; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: 0.3s;">
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
            renderHeaderCard(); // Оновлюємо лічильник зверху
            savePlanToMemory();
        }
    };

    window.setSpeed = (s, b) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(btn => { 
            btn.style.color = "#555"; btn.style.background = "transparent";
        });
        if (b) { b.style.color = "#FFC72C"; b.style.fontWeight = "bold"; }
    };

    function savePlanToMemory() {
        localStorage.setItem('pac_diet_v6', JSON.stringify({ plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString() }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('pac_diet_v6');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan; currentAnalysis = data.analysis;
                const speedSelector = document.querySelector('.speed-selector');
                if (speedSelector) speedSelector.style.display = 'none';
                const wrapper = document.getElementById('diet-tabs-wrapper');
                if (wrapper) wrapper.style.display = 'block';
                const genBtn = document.getElementById('get-diet-plan-btn');
                if (genBtn) genBtn.style.display = 'none';
                renderHeaderCard();
                renderFullList();
            }
        }
    }

    // Решта функцій (Chart, Firebase) без змін...
    function initChart() { /*...*/ }
    async function loadHistory() { /*...*/ }
    async function loadBaseData() { /*...*/ }
})();
