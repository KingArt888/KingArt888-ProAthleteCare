(function() {
    let currentAnalysis = null;
    let currentDailyPlan = { brf: [], lnc: [], din: [] };
    let activeTab = 'brf';
    let selectedSpeed = 'Easy'; 
    let weightChart = null;
    
    const getUserId = () => (window.auth && window.auth.currentUser) ? window.auth.currentUser.uid : "guest_athlete_1";

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const weightForm = document.getElementById('weight-form');
        if (weightForm) weightForm.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);

        ['brf', 'lnc', 'din'].forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) btn.onclick = () => switchDietTab(id);
        });

        setTimeout(loadFromFirebase, 1000);
    });

    // --- ЛОГІКА АНАЛІЗУ ---
    async function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let status, statusColor, calorieModifier;

        if (bmi < 20.5) { 
            status = "MUSCLE GAIN"; statusColor = "#00BFFF"; calorieModifier = 1.15;
        } else if (bmi < 25.5) {
            status = "ATHLETIC FORM"; statusColor = "#FFC72C"; calorieModifier = 1.0;
        } else {
            status = "WEIGHT LOSS"; statusColor = "#DA3E52"; calorieModifier = 0.80;
        }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetKcal = Math.round(bmr * 1.55 * calorieModifier);

        currentAnalysis = {
            targetKcal, mode: status, statusColor, weight: w, bmi,
            water: (w * 0.035).toFixed(1),
            p: Math.round(w * 2.2),
            f: Math.round(w * 0.9),
            c: Math.round((targetKcal - (w*2.2*4) - (w*0.9*9)) / 4)
        };

        // ПОКАЗУЄМО ВИБІР ШВИДКОСТІ ТА КНОПКУ
        const speedSelector = document.querySelector('.speed-selector');
        if (speedSelector) speedSelector.style.display = "block";
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.style.display = "block";

        updateAllUI();
        saveToHistory(w, bmi);
    }

    // --- UI ДАШБОРДУ (БЖВ) ---
    function updateAllUI() {
        if (!currentAnalysis) return;
        const all = [...currentDailyPlan.brf, ...currentDailyPlan.lnc, ...currentDailyPlan.din];
        const eaten = all.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const leftKcal = Math.max(0, currentAnalysis.targetKcal - eaten.k);
        const leftP = Math.max(0, currentAnalysis.p - eaten.p);
        const leftF = Math.max(0, currentAnalysis.f - eaten.f);
        const leftC = Math.max(0, currentAnalysis.c - eaten.c);

        const topBox = document.getElementById('athlete-recommendation-box');
        if (topBox) {
            topBox.innerHTML = `
                <div style="background:#000; padding:18px; border-radius:15px; border:1px solid #FFC72C;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <div style="font-size:10px; color:${currentAnalysis.statusColor}; text-transform:uppercase; font-weight:700;">PAC ANALYTICS • ${currentAnalysis.mode}</div>
                        <div style="font-size:12px; color:#fff; font-weight:800;">BMI: <span style="color:${currentAnalysis.statusColor}">${currentAnalysis.bmi}</span></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                        <div>
                            <div style="font-size:36px; color:#fff; font-weight:900; line-height:1;">${leftKcal}</div>
                            <div style="font-size:11px; color:#FFC72C; font-weight:600; margin-top:5px;">KCAL REMAINING</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:20px; color:#fff; font-weight:800;">${currentAnalysis.weight}kg</div>
                            <div style="font-size:10px; color:#555;">💧 ${currentAnalysis.water}L WATER</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:15px; margin-top:20px; padding-top:15px; border-top:1px solid #1a1a1a;">
                        <div style="flex:1;"><div style="font-size:9px; color:#555;">PROTEIN</div><div style="font-size:14px; color:#fff;">${leftP}g</div></div>
                        <div style="flex:1;"><div style="font-size:9px; color:#555;">FATS</div><div style="font-size:14px; color:#fff;">${leftF}g</div></div>
                        <div style="flex:1;"><div style="font-size:9px; color:#555;">CARBS</div><div style="font-size:14px; color:#fff;">${leftC}g</div></div>
                    </div>
                </div>`;
        }

        const mainValue = document.getElementById('fat-percentage-value');
        if (mainValue) {
            mainValue.innerHTML = `
                <span style="font-size:10px; color:#666;">Weight</span>
                <span style="font-size:34px; color:#FFC72C; font-weight:bold;">${currentAnalysis.weight}</span>
                <span style="font-size:14px; color:${currentAnalysis.statusColor};">BMI ${currentAnalysis.bmi}</span>
            `;
        }
    }

    // --- ІНШІ ФУНКЦІЇ ---
    window.setSpeed = (s, btn) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "transparent"; b.style.color = "#555"; b.style.border = "1px solid #333";
        });
        if (btn) { 
            btn.style.background = "#FFC72C"; 
            btn.style.color = "#000"; 
            btn.style.border = "1px solid #FFC72C";
        }
    };

    window.generateWeeklyPlan = async function() {
        if (!currentAnalysis) return;
        const slots = [{ id: 'brf', pct: 0.35, key: 'breakfasts' }, { id: 'lnc', pct: 0.35, key: 'lunches' }, { id: 'din', pct: 0.30, key: 'dinners' }];
        slots.forEach(slot => {
            currentDailyPlan[slot.id] = pickMeals(slot.key, currentAnalysis.targetKcal * slot.pct, selectedSpeed);
        });
        
        document.querySelector('.speed-selector').style.display = 'none';
        document.getElementById('diet-tabs-wrapper').style.display = 'block';
        document.getElementById('get-diet-plan-btn').style.display = 'none';
        
        switchDietTab('brf');
        updateAllUI();
        await saveToFirebase();
    };

    // Функція вибору страв з фільтром швидкості
    function pickMeals(key, target, speed) {
        let currentKcal = 0; let selected = [];
        let available = [...dietDatabase[key].filter(m => m.speed === speed)];
        if (available.length === 0) available = [...dietDatabase[key]]; // fallback якщо немає потрібної складності
        
        while (currentKcal < target && available.length > 0) {
            let meal = available.splice(Math.floor(Math.random() * available.length), 1)[0];
            let kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            selected.push({ ...meal, kcal: Math.round(kcal), eaten: false, uid: Math.random().toString(36).substr(2, 9) });
            currentKcal += kcal;
        }
        return selected;
    }

    // Решта стандартних функцій: saveToHistory, loadHistory, renderMealList, toggleMealStatus, switchDietTab, initChart...
    // (Вони залишаються без змін з попереднього файлу)

})();
