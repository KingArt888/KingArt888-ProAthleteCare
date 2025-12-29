(function() {
    let currentAnalysis = null;
    let currentDailyPlan = [];
    let activeTab = 'brf';
    let selectedSpeed = 'Easy';

    document.addEventListener('DOMContentLoaded', () => {
        const weightForm = document.getElementById('weight-form');
        if (weightForm) weightForm.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);

        // Преміум вкладки
        ['brf', 'lnc', 'din'].forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) btn.onclick = () => switchDietTab(id);
        });

        checkSavedPlan();
    });

    // 1. АНАЛІЗ: ВИЗНАЧЕННЯ РЕЖИМУ ТА ЦІЛЬОВИХ МАКРОСІВ
    function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let mode = "MAINTENANCE";
        let mult = 1.55;

        // Авто-режим на основі BMI
        if (bmi < 18.5) { mode = "MASS GAIN"; mult = 1.8; }
        else if (bmi > 25) { mode = "WEIGHT LOSS"; mult = 1.25; }

        const targetKcal = Math.round(((10 * w) + (6.25 * h) - (5 * a) + 5) * mult);

        currentAnalysis = {
            targetKcal,
            mode,
            water: (w * 0.035).toFixed(1),
            p: Math.round(targetKcal * 0.30 / 4),
            f: Math.round(targetKcal * 0.25 / 9),
            c: Math.round(targetKcal * 0.45 / 4)
        };

        updateAllUI();
        document.getElementById('get-diet-plan-btn').style.display = "block";
    }

    // 2. ГЕНЕРАЦІЯ: РОЗРАХУНОК СТРАВ (40/30/30)
    window.generateWeeklyPlan = function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        const specs = [
            { id: 'brf', pct: 0.40, key: 'breakfasts' },
            { id: 'lnc', pct: 0.30, key: 'lunches' },
            { id: 'din', pct: 0.30, key: 'dinners' }
        ];

        currentDailyPlan = specs.map(s => {
            const db = dietDatabase[s.key].filter(m => m.speed === selectedSpeed);
            const rawMeal = db[Math.floor(Math.random() * db.length)];
            
            // Математичне масштабування під норму користувача
            const targetMealKcal = currentAnalysis.targetKcal * s.pct;
            const rawMealKcal = (rawMeal.p * 4) + (rawMeal.f * 9) + (rawMeal.c * 4);
            const ratio = targetMealKcal / rawMealKcal;
            
            return {
                ...rawMeal,
                catId: s.id,
                p: Math.round(rawMeal.p * ratio),
                f: Math.round(rawMeal.f * ratio),
                c: Math.round(rawMeal.c * ratio),
                kcal: Math.round(targetMealKcal),
                eaten: false
            };
        });

        document.getElementById('diet-tabs-wrapper').style.display = 'block';
        if (document.querySelector('.speed-selector')) document.querySelector('.speed-selector').style.display = 'none';
        document.getElementById('get-diet-plan-btn').style.display = 'none';

        switchDietTab('brf');
        updateAllUI();
        saveToLocal();
    };

    // 3. ПРЕМІУМ-ВКЛАДКИ ТА ВІДОБРАЖЕННЯ СТРАВИ
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
        renderMealCard();
    }

    function renderMealCard() {
        const meal = currentDailyPlan.find(m => m.catId === activeTab);
        const box = document.getElementById('diet-tab-content');
        if (!meal || !box) return;

        box.innerHTML = `
            <div style="background:linear-gradient(145deg, #0a0a0a, #111); padding:25px; border-radius:16px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center; margin-top:20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="opacity: ${meal.eaten ? '0.2' : '1'}; transition: 0.3s;">
                    <div style="color:#FFC72C; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">${activeTab === 'brf' ? 'Сніданок 40%' : activeTab === 'lnc' ? 'Обід 30%' : 'Вечеря 30%'}</div>
                    <div style="color:#fff; font-size:20px; font-weight:700; margin-bottom:8px;">${meal.name}</div>
                    <div style="color:#888; font-family:monospace; font-size:13px; display:flex; gap:10px;">
                        <span>Б: <b style="color:#fff">${meal.p}г</b></span>
                        <span>Ж: <b style="color:#fff">${meal.f}г</b></span>
                        <span>В: <b style="color:#fff">${meal.c}г</b></span>
                    </div>
                </div>
                <button onclick="window.toggleMeal()" style="background:${meal.eaten ? '#1a1a1a' : '#FFC72C'}; border:none; width:50px; height:50px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 15px rgba(255,199,44,0.3); transition:0.3s;">
                    <span style="color:#000; font-size:24px;">${meal.eaten ? '✓' : '+'}</span>
                </button>
            </div>
        `;
    }

    window.toggleMeal = function() {
        const meal = currentDailyPlan.find(m => m.catId === activeTab);
        if (meal) {
            meal.eaten = !meal.eaten;
            renderMealCard();
            updateAllUI();
            saveToLocal();
        }
    };

    // 4. СИНХРОНІЗАЦІЯ ВСІХ ПАНЕЛЕЙ
    function updateAllUI() {
        if (!currentAnalysis) return;

        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((a, m) => {
            a.k += m.kcal; a.p += m.p; a.f += m.f; a.c += m.c; return a;
        }, {k:0, p:0, f:0, c:0});

        const left = {
            k: currentAnalysis.targetKcal - eaten.k,
            p: currentAnalysis.p - eaten.p,
            f: currentAnalysis.f - eaten.f,
            c: currentAnalysis.c - eaten.c
        };

        // Оновлення чорної картки зверху
        const topBox = document.getElementById('athlete-recommendation-box');
        if (topBox) {
            topBox.innerHTML = `
                <div style="background:#000; padding:20px; border-radius:15px; border:1px solid #222; margin-bottom:20px;">
                    <div style="font-size:10px; color:#FFC72C; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">Режим: ${currentAnalysis.mode}</div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div style="font-size:36px; color:#fff; font-weight:800; line-height:1;">${left.k} <span style="font-size:14px; color:#FFC72C;">ККАЛ</span></div>
                            <div style="font-size:12px; color:#888; margin-top:10px; font-family:monospace;">
                                P: <span style="color:#fff">${left.p}g</span> | F: <span style="color:#fff">${left.f}g</span> | C: <span style="color:#fff">${left.c}g</span>
                            </div>
                        </div>
                        <div style="text-align:right; border-left: 1px solid #222; padding-left: 20px;">
                            <div style="font-size:26px; color:#fff; font-weight:700;">💧 ${currentAnalysis.water}л</div>
                            <div style="font-size:9px; color:#40E0D0; text-transform:uppercase; margin-top:5px;">Вода / День</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Оновлення нижньої панелі
        const lKcal = document.getElementById('calories-left');
        if (lKcal) lKcal.textContent = left.k;
        
        const tKcal = document.getElementById('total-daily-kcal');
        if (tKcal) tKcal.textContent = currentAnalysis.targetKcal;

        const bju = document.getElementById('bju-left-display');
        if (bju) bju.innerHTML = `<span>Б: ${left.p}г</span> <span>Ж: ${left.f}г</span> <span>В: ${left.c}г</span>`;
    }

    // Збереження та ЛокалСторедж
    function saveToLocal() {
        localStorage.setItem('pac_pro_v2', JSON.stringify({ plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString() }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('pac_pro_v2');
        if (saved) {
            const d = JSON.parse(saved);
            if (d.date === new Date().toDateString()) {
                currentDailyPlan = d.plan; currentAnalysis = d.analysis;
                const wrapper = document.getElementById('diet-tabs-wrapper');
                if (wrapper) wrapper.style.display = 'block';
                updateAllUI(); switchDietTab('brf');
            }
        }
    }
})();
