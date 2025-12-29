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
            currentDailyPlan[slot.id] = pickMealsForKcal(slot.key, currentAnalysis.targetKcal * slot.pct);
        });

        // Приховуємо вибір швидкості
        const speedSelector = document.querySelector('.speed-selector');
        if (speedSelector) speedSelector.style.display = 'none';

        const tabsWrapper = document.getElementById('diet-tabs-wrapper');
        if (tabsWrapper) tabsWrapper.style.display = 'block';
        
        const genBtn = document.getElementById('get-diet-plan-btn');
        if (genBtn) genBtn.style.display = 'none';

        switchDietTab('brf');
        updateAllUI();
        saveToLocal();
    };

    function pickMealsForKcal(key, target) {
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

    // ТА сама функція заміни, але з PAC Style
    window.replaceOneMeal = function(uid) {
        const slotKeyMap = { 'brf': 'breakfasts', 'lnc': 'lunches', 'din': 'dinners' };
        const dbKey = slotKeyMap[activeTab];
        const index = currentDailyPlan[activeTab].findIndex(m => m.uid === uid);
        if (index === -1) return;

        const currentNames = currentDailyPlan[activeTab].map(m => m.name);
        let available = dietDatabase[dbKey].filter(m => m.speed === selectedSpeed && !currentNames.includes(m.name));

        if (available.length > 0) {
            let randomIndex = Math.floor(Math.random() * available.length);
            let meal = available[randomIndex];
            let kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            
            currentDailyPlan[activeTab][index] = { 
                ...meal, 
                kcal: Math.round(kcal), 
                eaten: false, 
                uid: Math.random().toString(36).substr(2, 9) 
            };
            
            renderMealList();
            updateAllUI();
            saveToLocal();
        }
    };

    function renderMealList() {
        const meals = currentDailyPlan[activeTab];
        const box = document.getElementById('diet-tab-content');
        if (!box) return;

        box.innerHTML = meals.map(meal => `
            <div style="background:#0a0a0a; padding:18px; border-radius:12px; border:1px solid #1a1a1a; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; position:relative;">
                <div style="opacity: ${meal.eaten ? '0.15' : '1'}; transition: 0.4s; flex: 1;">
                    <div style="color:#fff; font-size:15px; font-weight:600; letter-spacing:0.5px;">${meal.name.toUpperCase()}</div>
                    <div style="color:#FFC72C; font-size:11px; font-family:monospace; margin-top:5px; opacity:0.8;">
                        P:${meal.p} F:${meal.f} C:${meal.c} <span style="color:#444; margin:0 5px;">|</span> ${meal.kcal} KCAL
                    </div>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <button onclick="window.replaceOneMeal('${meal.uid}')" style="background:transparent; border:1px solid #333; color:#FFC72C; width:34px; height:34px; border-radius:8px; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; transition:0.3s;" onmouseover="this.style.borderColor='#FFC72C'" onmouseout="this.style.borderColor='#333'">
                        ALT
                    </button>
                    
                    <button onclick="window.toggleMealStatus('${meal.uid}')" style="background:${meal.eaten ? '#FFC72C' : 'transparent'}; border:2px solid #FFC72C; width:38px; height:38px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: 0.3s; box-shadow: ${meal.eaten ? '0 0 10px rgba(255,199,44,0.3)' : 'none'};">
                        <span style="color:${meal.eaten ? '#000' : '#FFC72C'}; font-weight:900; font-size:16px;">${meal.eaten ? '✓' : ''}</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    function switchDietTab(id) {
        activeTab = id;
        ['brf', 'lnc', 'din'].forEach(t => {
            const b = document.getElementById('btn-' + t);
            if (b) {
                b.style.color = (t === id) ? "#FFC72C" : "#444";
                b.style.borderBottom = (t === id) ? "3px solid #FFC72C" : "1px solid #222";
                b.style.background = (t === id) ? "rgba(255,199,44,0.05)" : "transparent";
            }
        });
        renderMealList();
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
        const allMeals = [...currentDailyPlan.brf, ...currentDailyPlan.lnc, ...currentDailyPlan.din];
        const eaten = allMeals.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const leftKcal = currentAnalysis.targetKcal - eaten.k;

        const topBox = document.getElementById('athlete-recommendation-box');
        if (topBox) {
            topBox.innerHTML = `
                <div style="background:#000; padding:20px; border-radius:15px; border:1px solid #1a1a1a; margin-bottom:20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <div style="font-size:10px; color:#FFC72C; text-transform:uppercase; letter-spacing:2px; font-weight:bold;">PAC ANALYTICS • ${currentAnalysis.mode}</div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:15px;">
                        <div>
                            <div style="font-size:42px; color:#fff; font-weight:900; line-height:1;">${leftKcal}</div>
                            <div style="font-size:12px; color:#FFC72C; text-transform:uppercase; margin-top:5px;">Remaining Kcal</div>
                        </div>
                        <div style="text-align:right; border-left:1px solid #1a1a1a; padding-left:20px;">
                            <div style="font-size:22px; color:#fff; font-weight:700;">${currentAnalysis.water}L</div>
                            <div style="font-size:9px; color:#444; letter-spacing:1px;">H2O TARGET</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (document.getElementById('calories-left')) document.getElementById('calories-left').textContent = leftKcal;
        if (document.getElementById('total-daily-kcal')) document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetKcal;
        const bju = document.getElementById('bju-left-display');
        if (bju) bju.innerHTML = `<span>P: ${currentAnalysis.p - eaten.p}g</span> <span>F: ${currentAnalysis.f - eaten.f}g</span> <span>C: ${currentAnalysis.c - eaten.c}g</span>`;
    }

    window.setSpeed = (s, btn) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.color = "#444"; 
            b.style.background = "#111";
            b.style.borderColor = "#222";
        });
        if (btn) { 
            btn.style.color = "#000"; 
            btn.style.background = "#FFC72C";
            btn.style.borderColor = "#FFC72C";
        }
    };

    function saveToLocal() {
        localStorage.setItem('pac_pro_v3', JSON.stringify({ plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString(), speed: selectedSpeed }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('pac_pro_v3');
        if (saved) {
            const d = JSON.parse(saved);
            if (d.date === new Date().toDateString()) {
                currentDailyPlan = d.plan; currentAnalysis = d.analysis;
                selectedSpeed = d.speed || 'Easy';
                const speedSelector = document.querySelector('.speed-selector');
                if (speedSelector) speedSelector.style.display = 'none';
                const wrapper = document.getElementById('diet-tabs-wrapper');
                if (wrapper) wrapper.style.display = 'block';
                updateAllUI(); switchDietTab('brf');
            }
        }
    }
})();
