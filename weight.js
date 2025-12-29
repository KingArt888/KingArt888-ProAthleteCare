(function() {
    let currentAnalysis = null;
    let currentDailyPlan = { brf: [], lnc: [], din: [] };
    let activeTab = 'brf';
    let selectedSpeed = 'Easy';

    document.addEventListener('DOMContentLoaded', () => {
        const weightForm = document.getElementById('weight-form');
        if (weightForm) weightForm.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);

        ['brf', 'lnc', 'din'].forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) btn.onclick = () => switchDietTab(id);
        });

        checkSavedPlan();
    });

    function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let mode = "MAINTENANCE";
        let mult = 1.55;
        if (bmi < 18.5) { mode = "MASS GAIN"; mult = 1.85; }
        else if (bmi > 25.5) { mode = "WEIGHT LOSS"; mult = 1.35; }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetKcal = Math.round(bmr * mult);

        currentAnalysis = {
            targetKcal, mode,
            water: (w * 0.035).toFixed(1),
            p: Math.round(targetKcal * 0.30 / 4),
            f: Math.round(targetKcal * 0.25 / 9),
            c: Math.round(targetKcal * 0.45 / 4)
        };

        updateAllUI();
        document.getElementById('get-diet-plan-btn').style.display = "block";
    }

    // ГОЛОВНА ЛОГІКА: ПІДБІР СТРАВ ДО ЛІМІТУ
    window.generateWeeklyPlan = function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        const slots = [
            { id: 'brf', pct: 0.40, key: 'breakfasts' },
            { id: 'lnc', pct: 0.30, key: 'lunches' },
            { id: 'din', pct: 0.30, key: 'dinners' }
        ];

        slots.forEach(slot => {
            let targetKcal = currentAnalysis.targetKcal * slot.pct;
            let currentKcal = 0;
            let selectedMeals = [];
            let availableMeals = [...dietDatabase[slot.key].filter(m => m.speed === selectedSpeed)];

            // Набираємо страви, поки не закриємо калораж слоту (40% або 30%)
            while (currentKcal < targetKcal && availableMeals.length > 0) {
                let randomIndex = Math.floor(Math.random() * availableMeals.length);
                let meal = availableMeals.splice(randomIndex, 1)[0];
                let mealKcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
                
                selectedMeals.push({
                    ...meal,
                    kcal: Math.round(mealKcal),
                    eaten: false,
                    uid: Math.random().toString(36).substr(2, 9)
                });
                currentKcal += mealKcal;
            }
            currentDailyPlan[slot.id] = selectedMeals;
        });

        document.getElementById('diet-tabs-wrapper').style.display = 'block';
        document.getElementById('get-diet-plan-btn').style.display = 'none';

        switchDietTab('brf');
        updateAllUI();
        saveToLocal();
    };

    function switchDietTab(id) {
        activeTab = id;
        ['brf', 'lnc', 'din'].forEach(t => {
            const b = document.getElementById('btn-' + t);
            if (b) {
                b.style.color = (t === id) ? "#FFC72C" : "#555";
                b.style.borderBottom = (t === id) ? "2px solid #FFC72C" : "none";
            }
        });
        renderMealList();
    }

    function renderMealList() {
        const meals = currentDailyPlan[activeTab];
        const box = document.getElementById('diet-tab-content');
        if (!box) return;

        box.innerHTML = meals.map(meal => `
            <div style="background:#111; padding:15px; border-radius:12px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="opacity: ${meal.eaten ? '0.3' : '1'}">
                    <div style="color:#fff; font-size:16px; font-weight:600;">${meal.name}</div>
                    <div style="color:#888; font-size:12px;">Б:${meal.p} Ж:${meal.f} В:${meal.c} • ${meal.kcal} ккал</div>
                </div>
                <button onclick="window.toggleMealStatus('${meal.uid}')" style="background:${meal.eaten ? '#222' : '#FFC72C'}; border:none; width:35px; height:35px; border-radius:50%; cursor:pointer;">
                    <span style="color:#000; font-weight:bold;">${meal.eaten ? '✓' : '+'}</span>
                </button>
            </div>
        `).join('');
    }

    window.toggleMealStatus = function(uid) {
        const meal = currentDailyPlan[activeTab].find(m => m.uid === uid);
        if (meal) {
            meal.eaten = !meal.eaten;
            renderMealList();
            updateAllUI();
            saveToLocal();
        }
    };

    function updateAllUI() {
        if (!currentAnalysis) return;

        // Рахуємо все з'їдене у всіх вкладках
        const allEatenMeals = [...currentDailyPlan.brf, ...currentDailyPlan.lnc, ...currentDailyPlan.din].filter(m => m.eaten);
        const eaten = allEatenMeals.reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const left = {
            k: currentAnalysis.targetKcal - eaten.k,
            p: currentAnalysis.p - eaten.p,
            f: currentAnalysis.f - eaten.f,
            c: currentAnalysis.c - eaten.c
        };

        // ВЕРХНЯ КАРТКА
        const topBox = document.getElementById('athlete-recommendation-box');
        if (topBox) {
            topBox.innerHTML = `
                <div style="background:#000; padding:20px; border-radius:15px; border:1px solid #222;">
                    <div style="font-size:10px; color:#FFC72C; text-transform:uppercase;">Режим: ${currentAnalysis.mode}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <div>
                            <div style="font-size:32px; color:#fff; font-weight:800;">${left.k} <span style="font-size:14px; color:#FFC72C;">ККАЛ</span></div>
                            <div style="font-size:12px; color:#666;">P:${left.p}g | F:${left.f}g | C:${left.c}g</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:24px; color:#fff;">💧 ${currentAnalysis.water}л</div>
                            <div style="font-size:9px; color:#40E0D0;">WATER GOAL</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // НИЖНЯ ПАНЕЛЬ
        if (document.getElementById('calories-left')) document.getElementById('calories-left').textContent = left.k;
        if (document.getElementById('total-daily-kcal')) document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetKcal;
        const bju = document.getElementById('bju-left-display');
        if (bju) bju.innerHTML = `<span>Б: ${left.p}г</span> <span>Ж: ${left.f}г</span> <span>В: ${left.c}г</span>`;
    }

    function saveToLocal() {
        localStorage.setItem('pac_pro_v3', JSON.stringify({ plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString() }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('pac_pro_v3');
        if (saved) {
            const d = JSON.parse(saved);
            if (d.date === new Date().toDateString()) {
                currentDailyPlan = d.plan; currentAnalysis = d.analysis;
                document.getElementById('diet-tabs-wrapper').style.display = 'block';
                updateAllUI(); switchDietTab('brf');
            }
        }
    }
})();
