(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; 
    let currentAnalysis = null;
    let currentDailyPlan = [];
    let activeTab = 'brf';

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const weightForm = document.getElementById('weight-form');
        if (weightForm) weightForm.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);

        // Слухачі для вкладок
        ['brf', 'lnc', 'din'].forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) btn.addEventListener('click', () => switchDietTab(id));
        });

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

    // 1. АНАЛІЗ ТА РОЗПОДІЛ (40/30/30)
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

        currentAnalysis = {
            targetCalories,
            mode,
            waterLitres: (w * 0.035).toFixed(1),
            prot: Math.round(targetCalories * 0.30 / 4),
            fat: Math.round(targetCalories * 0.25 / 9),
            carb: Math.round(targetCalories * 0.45 / 4)
        };

        const bmiEl = document.getElementById('bmi-value');
        if (bmiEl) bmiEl.innerHTML = `<span style="color:#FFC72C">${bmi}</span>`;
        
        const fatEl = document.getElementById('fat-percentage-value');
        if (fatEl) fatEl.innerHTML = `<div style="font-size:32px; color:#FFC72C; font-weight:800;">${w}</div><div style="font-size:10px;">КГ</div>`;
        
        updateUI(); 
        document.getElementById('get-diet-plan-btn').style.display = "block";
    }

    // 2. ГЕНЕРАЦІЯ ТА ФІЛЬТРАЦІЯ ЗА НОРМАМИ
    window.generateWeeklyPlan = function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        const specs = [
            { id: 'brf', pct: 0.40, dbKey: 'breakfasts' },
            { id: 'lnc', pct: 0.30, dbKey: 'lunches' },
            { id: 'din', pct: 0.30, dbKey: 'dinners' }
        ];

        currentDailyPlan = specs.map(spec => {
            const meals = dietDatabase[spec.dbKey].filter(m => m.speed === selectedSpeed);
            const bestMeal = meals[Math.floor(Math.random() * meals.length)];
            
            // Масштабуємо страву під 40% або 30% від норми атлета
            const factor = (currentAnalysis.targetCalories * spec.pct) / ((bestMeal.p*4)+(bestMeal.f*9)+(bestMeal.c*4));
            
            return { 
                ...bestMeal, 
                catId: spec.id, 
                p: Math.round(bestMeal.p * factor),
                f: Math.round(bestMeal.f * factor),
                c: Math.round(bestMeal.c * factor),
                kcal: Math.round(currentAnalysis.targetCalories * spec.pct), 
                eaten: false 
            };
        });

        document.getElementById('diet-tabs-wrapper').style.display = 'block';
        document.querySelector('.speed-selector').style.display = 'none';
        document.getElementById('get-diet-plan-btn').style.display = 'none';

        switchDietTab('brf');
        updateUI();
        savePlanToMemory();
    };

    // 3. ПЕРЕМИКАННЯ ВКЛАДОК
    function switchDietTab(tabId) {
        activeTab = tabId;
        ['brf', 'lnc', 'din'].forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) {
                btn.style.color = (id === tabId) ? "#FFC72C" : "#555";
                btn.style.borderBottom = (id === tabId) ? "2px solid #FFC72C" : "none";
            }
        });
        renderCurrentMeal();
    }

    function renderCurrentMeal() {
        const meal = currentDailyPlan.find(m => m.catId === activeTab);
        const content = document.getElementById('diet-tab-content');
        if (!meal || !content) return;

        content.innerHTML = `
            <div style="background: #111; padding: 20px; border-radius: 12px; border: 1px solid #222; display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                <div style="opacity: ${meal.eaten ? '0.3' : '1'}">
                    <div style="color: #fff; font-size: 18px; font-weight: 600;">${meal.name}</div>
                    <div style="color: #FFC72C; font-family: monospace; font-size: 12px; margin-top: 5px;">
                        ${meal.kcal} KCAL | Б:${meal.p} Ж:${meal.f} В:${meal.c}
                    </div>
                </div>
                <button onclick="window.handleMealDone('${meal.catId}')" style="background: ${meal.eaten ? '#222' : '#FFC72C'}; border:none; width:44px; height:44px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.3s;">
                    ${meal.eaten ? '<span style="color:#555">✓</span>' : '<span style="color:#000; font-weight:bold; font-size:20px;">+</span>'}
                </button>
            </div>
        `;
    }

    window.handleMealDone = function(id) {
        const meal = currentDailyPlan.find(m => m.catId === id);
        if (meal) {
            meal.eaten = !meal.eaten;
            renderCurrentMeal();
            updateUI();
            savePlanToMemory();
        }
    };

    // 4. СИНХРОННЕ ОНОВЛЕННЯ ВСІХ ПОКАЗНИКІВ
    function updateUI() {
        if (!currentAnalysis) return;

        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const left = {
            k: currentAnalysis.targetCalories - eaten.k,
            p: currentAnalysis.prot - eaten.p,
            f: currentAnalysis.fat - eaten.f,
            c: currentAnalysis.carb - eaten.c
        };

        // Оновлення верхньої картки (з твого скріншоту)
        const recBox = document.getElementById('athlete-recommendation-box');
        if (recBox) {
            recBox.innerHTML = `
                <div style="background: #000; padding: 20px; border-radius: 15px; border: 1px solid #222; margin-bottom: 20px;">
                    <div style="font-size:10px; color:#FFC72C; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Режим: ${currentAnalysis.mode}</div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div style="font-size:32px; color:#fff; font-weight:800; line-height:1;">${left.k} <span style="font-size:14px; color:#FFC72C;">ККАЛ</span></div>
                            <div style="font-size:12px; color:#888; margin-top:8px; font-family:monospace;">
                                P: <span style="color:#fff">${left.p}g</span> | F: <span style="color:#fff">${left.f}g</span> | C: <span style="color:#fff">${left.c}g</span>
                            </div>
                        </div>
                        <div style="text-align:right; border-left: 1px solid #222; padding-left: 20px;">
                            <div style="font-size:24px; color:#fff; font-weight:700;">💧 ${currentAnalysis.waterLitres}л</div>
                            <div style="font-size:9px; color:#40E0D0; text-transform:uppercase;">Вода / День</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Оновлення нижньої панелі статистики
        const kcalLeftEl = document.getElementById('calories-left');
        if (kcalLeftEl) kcalLeftEl.textContent = left.k;
        
        const totalKcalEl = document.getElementById('total-daily-kcal');
        if (totalKcalEl) totalKcalEl.textContent = currentAnalysis.targetCalories;

        const bjuEl = document.getElementById('bju-left-display');
        if (bjuEl) {
            bjuEl.innerHTML = `<span>Б: ${left.p}г</span> <span>Ж: ${left.f}г</span> <span>В: ${left.c}г</span>`;
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
        localStorage.setItem('pac_diet_v7', JSON.stringify({ plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString() }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('pac_diet_v7');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan; currentAnalysis = data.analysis;
                document.getElementById('diet-tabs-wrapper').style.display = 'block';
                document.querySelector('.speed-selector').style.display = 'none';
                document.getElementById('get-diet-plan-btn').style.display = 'none';
                updateUI(); switchDietTab('brf');
            }
        }
    }

    function initChart() { /*...*/ }
    async function loadHistory() { /*...*/ }
    async function loadBaseData() { /*...*/ }
})();
