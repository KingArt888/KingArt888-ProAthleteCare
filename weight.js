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

    // 1. АНАЛІЗ АТЛЕТА
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

    // 2. ГЕНЕРАЦІЯ (ПРИХОВУЄ КНОПКИ ШВИДКОСТІ)
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

    // Допоміжна функція підбору страв
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

    // 3. ТОЧКОВА ЗАМІНА ІНГРЕДІЄНТА 🔄
    window.replaceOneMeal = function(uid) {
        const slotKeyMap = { 'brf': 'breakfasts', 'lnc': 'lunches', 'din': 'dinners' };
        const dbKey = slotKeyMap[activeTab];
        
        // Знаходимо індекс страви, яку хочемо замінити
        const index = currentDailyPlan[activeTab].findIndex(m => m.uid === uid);
        if (index === -1) return;

        // Список страв, яких ще немає в поточному прийомі (щоб не було дублів)
        const currentUids = currentDailyPlan[activeTab].map(m => m.name);
        let available = dietDatabase[dbKey].filter(m => m.speed === selectedSpeed && !currentUids.includes(m.name));

        if (available.length > 0) {
            let randomIndex = Math.floor(Math.random() * available.length);
            let meal = available[randomIndex];
            let kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            
            // Замінюємо тільки один елемент масиву
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

    // 4. ВІДОБРАЖЕННЯ З КНОПКОЮ ЗАМІНИ
    function renderMealList() {
        const meals = currentDailyPlan[activeTab];
        const box = document.getElementById('diet-tab-content');
        if (!box) return;

        box.innerHTML = meals.map(meal => `
            <div style="background:#111; padding:15px; border-radius:12px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="opacity: ${meal.eaten ? '0.2' : '1'}; transition: 0.3s; flex: 1;">
                    <div style="color:#fff; font-size:16px; font-weight:600;">${meal.name}</div>
                    <div style="color:#888; font-size:12px; font-family:monospace;">Б:${meal.p} Ж:${meal.f} В:${meal.c} • ${meal.kcal} ккал</div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button onclick="window.replaceOneMeal('${meal.uid}')" style="background:transparent; border:1px solid #333; color:#FFC72C; width:35px; height:35px; border-radius:50%; cursor:pointer; font-size:14px;">🔄</button>
                    
                    <button onclick="window.toggleMealStatus('${meal.uid}')" style="background:${meal.eaten ? '#222' : '#FFC72C'}; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: 0.3s;">
                        <span style="color:#000; font-weight:bold; font-size:18px;">${meal.eaten ? '✓' : '+'}</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ПЕРЕМИКАННЯ ВКЛАДОК ТА ІНШЕ
    function switchDietTab(id) {
        activeTab = id;
        ['brf', 'lnc', 'din'].forEach(t => {
            const b = document.getElementById('btn-' + t);
            if (b) {
                b.style.color = (t === id) ? "#FFC72C" : "#555";
                b.style.borderBottom = (t === id) ? "2px solid #FFC72C" : "none";
                b.style.fontWeight = (t === id) ? "bold" : "normal";
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

        const left = {
            k: currentAnalysis.targetKcal - eaten.k,
            p: currentAnalysis.p - eaten.p,
            f: currentAnalysis.f - eaten.f,
            c: currentAnalysis.c - eaten.c
        };

        const topBox = document.getElementById('athlete-recommendation-box');
        if (topBox) {
            topBox.innerHTML = `
                <div style="background:#000; padding:20px; border-radius:15px; border:1px solid #222; margin-bottom:20px;">
                    <div style="font-size:10px; color:#FFC72C; text-transform:uppercase; letter-spacing:1px;">Режим: ${currentAnalysis.mode}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <div>
                            <div style="font-size:32px; color:#fff; font-weight:800;">${left.k} <span style="font-size:14px; color:#FFC72C;">ККАЛ</span></div>
                        </div>
                        <div style="text-align:right; border-left:1px solid #222; padding-left:15px;">
                            <div style="font-size:24px; color:#fff; font-weight:700;">💧 ${currentAnalysis.water}л</div>
                            <div style="font-size:9px; color:#40E0D0;">WATER GOAL</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (document.getElementById('calories-left')) document.getElementById('calories-left').textContent = left.k;
        if (document.getElementById('total-daily-kcal')) document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetKcal;
        const bju = document.getElementById('bju-left-display');
        if (bju) bju.innerHTML = `<span>Б: ${left.p}г</span> <span>Ж: ${left.f}г</span> <span>В: ${left.c}г</span>`;
    }

    window.setSpeed = (s, btn) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.color = "#555"; b.style.background = "transparent";
            b.classList.remove('active');
        });
        if (btn) { 
            btn.style.color = "#FFC72C"; 
            btn.style.fontWeight = "bold"; 
            btn.classList.add('active');
        }
    };

    function saveToLocal() {
        localStorage.setItem('pac_pro_v3', JSON.stringify({ 
            plan: currentDailyPlan, 
            analysis: currentAnalysis, 
            date: new Date().toDateString(),
            speed: selectedSpeed 
        }));
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
