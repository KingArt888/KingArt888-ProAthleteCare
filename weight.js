(function() {
    let currentAnalysis = null;
    let currentDailyPlan = { brf: [], lnc: [], din: [] };
    let activeTab = 'brf';
    let selectedSpeed = 'Easy';

    document.addEventListener('DOMContentLoaded', () => {
        const weightForm = document.getElementById('weight-form');
        if (weightForm) weightForm.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', window.generateWeeklyPlan);

        checkSavedPlan();
    });

    function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const bmiDisplay = document.getElementById('bmi-value');
        if (bmiDisplay) bmiDisplay.textContent = bmi;

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

        const fatDisplay = document.getElementById('fat-percentage-value');
        if (fatDisplay) fatDisplay.textContent = (bmi * 0.8 + 2).toFixed(1) + "%";

        updateAllUI();
        const genBtn = document.getElementById('get-diet-plan-btn');
        if (genBtn) genBtn.style.display = "block";
    }

    window.generateWeeklyPlan = function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        const slots = [
            { id: 'brf', pct: 0.40, key: 'breakfasts' },
            { id: 'lnc', pct: 0.30, key: 'lunches' },
            { id: 'din', pct: 0.30, key: 'dinners' }
        ];

        slots.forEach(slot => {
            currentDailyPlan[slot.id] = pickMeals(slot.key, currentAnalysis.targetKcal * slot.pct);
        });

        const speedSelector = document.querySelector('.speed-selector');
        if (speedSelector) speedSelector.style.display = 'none';

        const tabsWrapper = document.getElementById('diet-tabs-wrapper');
        if (tabsWrapper) tabsWrapper.style.display = 'block';

        const genBtn = document.getElementById('get-diet-plan-btn');
        if (genBtn) genBtn.style.display = 'none';

        window.switchDietTab(activeTab || 'brf');
        updateAllUI();
        saveToLocal();
    };

    function pickMeals(key, target) {
        let currentKcal = 0;
        let selected = [];
        let available = [...dietDatabase[key].filter(m => m.speed === selectedSpeed)];
        while (currentKcal < target && available.length > 0) {
            let randomIndex = Math.floor(Math.random() * available.length);
            let meal = available.splice(randomIndex, 1)[0];
            let kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            selected.push({ ...meal, kcal: Math.round(kcal), eaten: false, uid: Math.random().toString(36).substr(2, 9) });
            currentKcal += kcal;
        }
        return selected;
    }

    // НОВА ФУНКЦІЯ ЗАМІНИ ОДНІЄЇ СТРАВИ (ALT)
    window.replaceOneMeal = function(uid) {
        const slotKeyMap = { 'brf': 'breakfasts', 'lnc': 'lunches', 'din': 'dinners' };
        const dbKey = slotKeyMap[activeTab];
        const index = currentDailyPlan[activeTab].findIndex(m => m.uid === uid);
        if (index === -1) return;

        const currentNames = currentDailyPlan[activeTab].map(m => m.name);
        let available = dietDatabase[dbKey].filter(m => m.speed === selectedSpeed && !currentNames.includes(m.name));

        if (available.length > 0) {
            let meal = available[Math.floor(Math.random() * available.length)];
            let kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            currentDailyPlan[activeTab][index] = { ...meal, kcal: Math.round(kcal), eaten: false, uid: Math.random().toString(36).substr(2, 9) };
            renderMealList();
            updateAllUI();
            saveToLocal();
        }
    };

    window.switchDietTab = function(id) {
        activeTab = id;
        const ids = ['brf', 'lnc', 'din'];
        ids.forEach(t => {
            const b = document.getElementById('btn-' + t);
            if (b) {
                b.style.background = (t === id) ? "#FFC72C" : "#111";
                b.style.color = (t === id) ? "#000" : "#fff";
                b.style.fontWeight = (t === id) ? "bold" : "normal";
            }
        });
        renderMealList();
    };

    function renderMealList() {
        const meals = currentDailyPlan[activeTab];
        const box = document.getElementById('diet-tab-content');
        if (!box || !meals) return;

        box.innerHTML = meals.map(meal => `
            <div style="background:#0a0a0a; padding:15px; border-radius:12px; border:1px solid #1a1a1a; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="opacity: ${meal.eaten ? '0.2' : '1'}; transition: 0.3s; flex: 1;">
                    <div style="color:#fff; font-size:15px; font-weight:600;">${meal.name.toUpperCase()}</div>
                    <div style="color:#FFC72C; font-size:11px; font-family:monospace; margin-top:4px;">
                        Б:${meal.p} Ж:${meal.f} В:${meal.c} • ${meal.kcal} ккал
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="window.replaceOneMeal('${meal.uid}')" style="background:transparent; border:1px solid #333; color:#FFC72C; width:35px; height:35px; border-radius:8px; cursor:pointer; font-size:10px;">ALT</button>
                    <button onclick="window.toggleMealStatus('${meal.uid}')" style="background:${meal.eaten ? '#FFC72C' : 'transparent'}; border:2px solid #FFC72C; width:35px; height:35px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <span style="color:${meal.eaten ? '#000' : '#FFC72C'}; font-weight:bold;">${meal.eaten ? '✓' : ''}</span>
                    </button>
                </div>
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

    window.setSpeed = function(s, btn) {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "#222"; b.style.color = "#fff"; b.style.fontWeight = "normal";
        });
        if (btn) { btn.style.background = "#FFC72C"; btn.style.color = "#000"; btn.style.fontWeight = "bold"; }
    };

    function updateAllUI() {
        if (!currentAnalysis) return;
        const allMeals = [...currentDailyPlan.brf, ...currentDailyPlan.lnc, ...currentDailyPlan.din];
        const eaten = allMeals.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const leftKcal = currentAnalysis.targetKcal - eaten.k;
        if (document.getElementById('total-daily-kcal')) document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetKcal;
        if (document.getElementById('calories-left')) document.getElementById('calories-left').textContent = leftKcal;
        
        const bjuDisp = document.getElementById('bju-left-display');
        if (bjuDisp) bjuDisp.innerHTML = `<span>Б: ${currentAnalysis.p - eaten.p}г</span> <span>Ж: ${currentAnalysis.f - eaten.f}г</span> <span>В: ${currentAnalysis.c - eaten.c}г</span>`;

        const topBox = document.getElementById('athlete-recommendation-box');
        if (topBox) {
            topBox.innerHTML = `
                <div style="background:#000; padding:15px; border-radius:10px; border:1px solid #FFC72C;">
                    <div style="font-size:10px; color:#FFC72C; text-transform:uppercase;">PAC • ${currentAnalysis.mode}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <div style="font-size:24px; color:#fff; font-weight:800;">${leftKcal} <span style="font-size:12px; color:#FFC72C;">ККАЛ</span></div>
                        <div style="text-align:right;"><div style="font-size:18px; color:#fff;">💧 ${currentAnalysis.water}л</div></div>
                    </div>
                </div>`;
        }
    }

    function saveToLocal() {
        localStorage.setItem('pac_pro_v3', JSON.stringify({ plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString(), speed: selectedSpeed }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('pac_pro_v3');
        if (saved) {
            const d = JSON.parse(saved);
            if (d.date === new Date().toDateString()) {
                currentDailyPlan = d.plan; currentAnalysis = d.analysis; selectedSpeed = d.speed || 'Easy';
                const speedSelector = document.querySelector('.speed-selector');
                if (speedSelector) speedSelector.style.display = 'none';
                const wrapper = document.getElementById('diet-tabs-wrapper');
                if (wrapper) wrapper.style.display = 'block';
                updateAllUI(); window.switchDietTab('brf');
            }
        }
    }
})();
