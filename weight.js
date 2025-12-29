(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; 
    let currentAnalysis = null;
    let currentDailyPlan = [];

    // 1. Авторизація та завантаження даних
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadBaseData();
            loadHistory();
            checkSavedPlan();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const form = document.getElementById('weight-form');
        if (form) form.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);
    });

    // 2. Аналіз параметрів тіла та розрахунок БЖВ
    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        
        // Розрахунок калорій (Міффлін-Сан Жеор) + модифікатор за BMI
        let modifier = bmi < 20.5 ? 1.15 : (bmi < 25.5 ? 1.0 : 0.85);
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * 1.55 * modifier);

        // Формула БЖВ (30% Білки, 25% Жири, 45% Вуглеводи)
        currentAnalysis = {
            targetCalories,
            prot: Math.round(targetCalories * 0.30 / 4),
            fat: Math.round(targetCalories * 0.25 / 9),
            carb: Math.round(targetCalories * 0.45 / 4)
        };

        // Візуалізація результатів
        document.getElementById('bmi-value').textContent = bmi;
        document.getElementById('fat-percentage-value').innerHTML = `
            <div style="font-size:32px; color:#FFC72C;">${w}</div>
            <div style="font-size:12px; color:#555;">КГ ЗАРАЗ</div>
        `;
        
        document.getElementById('athlete-recommendation-box').innerHTML = `
            Ціль: <strong>${targetCalories} ккал</strong> | Б:${currentAnalysis.prot} Ж:${currentAnalysis.fat} В:${currentAnalysis.carb}
        `;
        
        document.getElementById('get-diet-plan-btn').style.display = "block";
        updateMacrosLeftUI();
    }

    // 3. Генерація плану з математичним підбором 40/30/30
    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;

        const specs = [
            { id: 'brf', label: 'СНІДАНОК', pct: 0.40, dbKey: 'breakfasts' },
            { id: 'lnc', label: 'ОБІД', pct: 0.30, dbKey: 'lunches' },
            { id: 'din', label: 'ВЕЧЕРЯ', pct: 0.30, dbKey: 'dinners' }
        ];

        currentDailyPlan = specs.map(spec => {
            // Ціль для конкретного прийому їжі
            const tP = currentAnalysis.prot * spec.pct;
            const tF = currentAnalysis.fat * spec.pct;
            const tC = currentAnalysis.carb * spec.pct;

            // Фільтр бази за складністю (Easy/Medium/Hard)
            const meals = dietDatabase[spec.dbKey].filter(m => m.speed === selectedSpeed);
            
            // Пошук страви з найменшою похибкою за БЖВ
            let bestMeal = meals[0];
            let minError = Infinity;

            meals.forEach(m => {
                const error = Math.sqrt(
                    Math.pow(m.p - tP, 2) + 
                    Math.pow(m.f - tF, 2) + 
                    Math.pow(m.c - tC, 2)
                );
                if (error < minError) {
                    minError = error;
                    bestMeal = m;
                }
            });

            return { 
                ...bestMeal, 
                catId: spec.id, 
                catLabel: spec.label, 
                kcal: Math.round((bestMeal.p*4)+(bestMeal.f*9)+(bestMeal.c*4)),
                eaten: false 
            };
        });

        document.getElementById('diet-tabs-wrapper').style.display = 'block';
        document.getElementById('get-diet-plan-btn').style.display = 'none';
        switchDietTab('brf');
        savePlanToMemory();
    }

    // 4. Логіка перемикання вкладок
    window.switchDietTab = function(tabId) {
        ['brf', 'lnc', 'din'].forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) {
                btn.style.background = (id === tabId) ? "#FFC72C" : "#111";
                btn.style.color = (id === tabId) ? "#000" : "#555";
                btn.style.border = (id === tabId) ? "none" : "1px solid #222";
            }
        });

        const meal = currentDailyPlan.find(m => m.catId === tabId);
        const content = document.getElementById('diet-tab-content');

        content.innerHTML = `
            <div style="background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 12px; animation: fadeIn 0.3s;">
                <div style="opacity: ${meal.eaten ? '0.2' : '1'}; transition: 0.3s;">
                    <h4 style="color: #FFC72C; font-size: 10px; letter-spacing: 2px; margin-bottom: 10px;">${meal.catLabel}</h4>
                    <div style="color: #fff; font-size: 18px; font-weight: bold; margin-bottom: 15px;">${meal.name}</div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; border-top: 1px solid #111; padding-top: 15px; font-family: monospace; font-size: 12px;">
                        <div style="text-align:center;"><div style="color:#555;">Б</div><div style="color:#eee;">${meal.p}г</div></div>
                        <div style="text-align:center;"><div style="color:#555;">Ж</div><div style="color:#eee;">${meal.f}г</div></div>
                        <div style="text-align:center;"><div style="color:#555;">В</div><div style="color:#eee;">${meal.c}г</div></div>
                    </div>
                    
                    <div style="margin-top: 20px; color: #FFC72C; font-weight: bold;">⚡ ${meal.kcal} ККАЛ</div>
                </div>

                <label style="display: flex; align-items: center; justify-content: center; margin-top: 20px; background: #1a1a1a; padding: 12px; border-radius: 8px; cursor: pointer;">
                    <input type="checkbox" ${meal.eaten ? 'checked' : ''} onchange="handleMealDone('${meal.catId}', this)" style="width: 20px; height: 20px; margin-right: 10px; accent-color: #FFC72C;">
                    <span style="color: #eee; font-size: 12px;">${meal.eaten ? 'З\'ЇДЕНО' : 'ПОЗНАЧИТИ ЯК З\'ЇДЕНЕ'}</span>
                </label>
            </div>
        `;
    };

    window.handleMealDone = function(id, checkbox) {
        const meal = currentDailyPlan.find(m => m.catId === id);
        if (meal) {
            meal.eaten = checkbox.checked;
            switchDietTab(id);
            updateMacrosLeftUI();
            savePlanToMemory();
        }
    };

    // 5. Оновлення лічильників (Калорії та БЖВ залишилося)
    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetCalories;
        
        const leftKcal = currentAnalysis.targetCalories - eaten.k;
        const kcalEl = document.getElementById('calories-left');
        kcalEl.textContent = leftKcal;
        kcalEl.style.color = leftKcal < 0 ? "#DA3E52" : "#FFC72C";
        
        document.getElementById('bju-left-display').innerHTML = `
            <span>Б: ${Math.max(0, currentAnalysis.prot - eaten.p)}г</span>
            <span>Ж: ${Math.max(0, currentAnalysis.fat - eaten.f)}г</span>
            <span>В: ${Math.max(0, currentAnalysis.carb - eaten.c)}г</span>
        `;
    }

    // 6. Допоміжні функції (LocalStorage & Chart)
    function savePlanToMemory() {
        localStorage.setItem('proatlet_diet', JSON.stringify({ 
            plan: currentDailyPlan, 
            analysis: currentAnalysis, 
            date: new Date().toDateString() 
        }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('proatlet_diet');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan; 
                currentAnalysis = data.analysis;
                document.getElementById('diet-tabs-wrapper').style.display = 'block';
                document.getElementById('get-diet-plan-btn').style.display = 'none';
                switchDietTab('brf');
                updateMacrosLeftUI();
            }
        }
    }

    window.setSpeed = (s, b) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(btn => { 
            btn.style.background = "#222"; 
            btn.style.color = "#fff"; 
            btn.style.border = "1px solid #FFC72C";
        });
        b.style.background = "#FFC72C"; 
        b.style.color = "#000";
        b.style.border = "none";
    };

    function initChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ data: [], borderColor: '#FFC72C', backgroundColor: 'rgba(255,199,44,0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    async function loadHistory() {
        if (!currentUserId) return;
        const snap = await firebase.firestore().collection('weight_history').where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(7).get();
        const docs = snap.docs.map(doc => doc.data()).reverse();
        if (docs.length > 0) {
            weightChart.data.labels = docs.map(d => d.date);
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
        }
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('user-height').value = d.height || "";
            document.getElementById('user-age').value = d.age || "";
        }
    }
})();
