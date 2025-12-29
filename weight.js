(function() {
    let currentAnalysis = null;
    let currentDailyPlan = [];
    let selectedSpeed = 'Easy';

    // Ініціалізація при завантаженні
    document.addEventListener('DOMContentLoaded', () => {
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) {
            planBtn.addEventListener('click', generateWeeklyPlan);
        }
        
        const weightForm = document.getElementById('weight-form');
        if (weightForm) {
            weightForm.addEventListener('submit', handleAthleteAnalysis);
        }

        checkSavedPlan();
    });

    // 1. АНАЛІЗ (Розрахунок БЖВ)
    function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return alert("Заповніть всі дані!");

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * 1.55);

        currentAnalysis = {
            targetCalories,
            prot: Math.round(targetCalories * 0.30 / 4),
            fat: Math.round(targetCalories * 0.25 / 9),
            carb: Math.round(targetCalories * 0.45 / 4)
        };

        document.getElementById('bmi-value').textContent = bmi;
        document.getElementById('athlete-recommendation-box').innerHTML = 
            `Ціль: <strong>${targetCalories} ккал</strong> | Б:${currentAnalysis.prot} Ж:${currentAnalysis.fat} В:${currentAnalysis.carb}`;
        
        // Показуємо кнопку генерації
        document.getElementById('get-diet-plan-btn').style.display = "block";
    }

    // 2. ГЕНЕРАЦІЯ (Створення вкладок)
    function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        if (typeof dietDatabase === 'undefined') return alert("Помилка: База даних страв не знайдена!");

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
            
            // Пошук найкращої страви
            let bestMeal = meals[0];
            let minErr = Infinity;

            meals.forEach(m => {
                const err = Math.abs(m.p - tP) + Math.abs(m.f - tF) + Math.abs(m.c - tC);
                if (err < minErr) { minErr = err; bestMeal = m; }
            });

            return { 
                ...bestMeal, 
                catId: spec.id, 
                catLabel: spec.label, 
                kcal: Math.round((bestMeal.p*4)+(bestMeal.f*9)+(bestMeal.c*4)),
                eaten: false 
            };
        });

        // ПРЯМЕ ВІДОБРАЖЕННЯ БЛОКУ
        const wrapper = document.getElementById('diet-tabs-wrapper');
        const mainBtn = document.getElementById('get-diet-plan-btn');
        
        if (wrapper) wrapper.style.setProperty('display', 'block', 'important');
        if (mainBtn) mainBtn.style.display = 'none';

        switchDietTab('brf');
        savePlanToMemory();
    }

    // 3. ПЕРЕМИКАННЯ ВКЛАДОК
    window.switchDietTab = function(tabId) {
        const tabs = ['brf', 'lnc', 'din'];
        tabs.forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) {
                btn.style.background = (id === tabId) ? "#FFC72C" : "#111";
                btn.style.color = (id === tabId) ? "#000" : "#888";
            }
        });

        const meal = currentDailyPlan.find(m => m.catId === tabId);
        const container = document.getElementById('diet-tab-content');

        if (!meal || !container) return;

        container.innerHTML = `
            <div style="background:#111; padding:20px; border-radius:8px; border:1px solid #222; margin-top:10px;">
                <div style="opacity: ${meal.eaten ? '0.3' : '1'}">
                    <h5 style="color:#FFC72C; font-size:10px; margin:0 0 10px 0;">${meal.catLabel} (ЦІЛЬ: ${Math.round(currentAnalysis.targetCalories * (tabId==='brf'?0.4:0.3))} ккал)</h5>
                    <div style="color:#fff; font-size:18px; font-weight:bold;">${meal.name}</div>
                    <div style="color:#FFC72C; font-size:14px; margin-top:10px; font-family:monospace;">
                        ${meal.kcal} ккал | Б:${meal.p} Ж:${meal.f} В:${meal.c}
                    </div>
                </div>
                <button onclick="markAsEaten('${tabId}')" style="width:100%; margin-top:15px; padding:10px; background:${meal.eaten ? '#222' : '#FFC72C'}; color:${meal.eaten ? '#555' : '#000'}; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">
                    ${meal.eaten ? '✓ З\'ЇДЕНО' : 'ПОЗНАЧИТИ ЯК З\'ЇДЕНЕ'}
                </button>
            </div>
        `;
        updateMacrosLeftUI();
    };

    window.markAsEaten = function(id) {
        const meal = currentDailyPlan.find(m => m.catId === id);
        if (meal) {
            meal.eaten = !meal.eaten;
            switchDietTab(id);
            savePlanToMemory();
        }
    };

    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; return acc;
        }, {k:0});

        document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetCalories;
        document.getElementById('calories-left').textContent = currentAnalysis.targetCalories - eaten.k;
    }

    window.setSpeed = (s, btn) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "#222";
            b.style.color = "#fff";
        });
        btn.style.background = "#FFC72C";
        btn.style.color = "#000";
    };

    function savePlanToMemory() {
        localStorage.setItem('proatlet_diet_v2', JSON.stringify({
            plan: currentDailyPlan,
            analysis: currentAnalysis,
            date: new Date().toDateString()
        }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('proatlet_diet_v2');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan;
                currentAnalysis = data.analysis;
                document.getElementById('diet-tabs-wrapper').style.setProperty('display', 'block', 'important');
                document.getElementById('get-diet-plan-btn').style.display = 'none';
                switchDietTab('brf');
            }
        }
    }
})();
