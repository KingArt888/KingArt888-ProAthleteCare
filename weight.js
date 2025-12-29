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

    // 1. АНАЛІЗ: BMI ТА РЕКОМЕНДАЦІЇ
    async function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        
        if (!w || !h || !a) return;

        // Розрахунок BMI
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * 1.55);

        currentAnalysis = {
            targetCalories,
            prot: Math.round(targetCalories * 0.30 / 4),
            fat: Math.round(targetCalories * 0.25 / 9),
            carb: Math.round(targetCalories * 0.45 / 4)
        };

        // ВІДОБРАЖЕННЯ BMI
        const bmiEl = document.getElementById('bmi-value');
        if (bmiEl) {
            let status = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : "Overweight";
            bmiEl.innerHTML = `<span style="color:#FFC72C">${bmi}</span> | ${status}`;
        }

        // КРУГОВИЙ СКАН (ВАГА)
        const fatEl = document.getElementById('fat-percentage-value');
        if (fatEl) fatEl.innerHTML = `<div style="font-size:32px; color:#FFC72C; font-weight:800;">${w}</div><div style="font-size:10px; letter-spacing:2px;">KG</div>`;
        
        // РЕКОМЕНДАЦІЯ (СТИЛЬНА КАРТКА)
        const recBox = document.getElementById('athlete-recommendation-box');
        if (recBox) {
            recBox.style.borderLeft = "2px solid #FFC72C";
            recBox.style.paddingLeft = "15px";
            recBox.innerHTML = `
                <div style="font-size:11px; color:#888; text-transform:uppercase;">Денна норма:</div>
                <div style="font-size:20px; color:#fff; font-weight:bold; margin:5px 0;">${targetCalories} <span style="font-size:12px; color:#FFC72C;">KCAL</span></div>
                <div style="font-size:12px; font-family:monospace; color:#FFC72C;">P:${currentAnalysis.prot}g | F:${currentAnalysis.fat}g | C:${currentAnalysis.carb}g</div>
            `;
        }
        
        const dietBtn = document.getElementById('get-diet-plan-btn');
        if (dietBtn) dietBtn.style.display = "block";

        updateMacrosLeftUI();
    }

    // 2. ГЕНЕРАЦІЯ: КОРОТКИЙ СПИСОК
    window.generateWeeklyPlan = function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        const specs = [
            { id: 'brf', label: 'СНІДАНОК', pct: 0.40, dbKey: 'breakfasts' },
            { id: 'lnc', label: 'ОБІД', pct: 0.30, dbKey: 'lunches' },
            { id: 'din', label: 'ВЕЧЕРЯ', pct: 0.30, dbKey: 'dinners' }
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
        
        document.getElementById('get-diet-plan-btn').style.display = 'none';
        window.switchDietTab('brf');
        savePlanToMemory();
    };

    // 3. ПРЕМІАЛЬНИЙ ДИЗАЙН КАРТКИ
    window.switchDietTab = function(tabId) {
        ['brf', 'lnc', 'din'].forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) {
                btn.style.borderBottom = (id === tabId) ? "2px solid #FFC72C" : "none";
                btn.style.color = (id === tabId) ? "#FFC72C" : "#555";
                btn.style.background = "transparent";
            }
        });

        const meal = currentDailyPlan.find(m => m.catId === tabId);
        const content = document.getElementById('diet-tab-content');
        if (!meal || !content) return;

        content.innerHTML = `
            <div style="padding: 15px 0; border-top: 1px solid #1a1a1a; margin-top:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="opacity: ${meal.eaten ? '0.3' : '1'}">
                        <h4 style="color: #FFC72C; font-size: 9px; margin: 0; letter-spacing:1px;">${meal.catLabel}</h4>
                        <div style="color: #fff; font-size: 16px; font-weight: 600; margin: 4px 0;">${meal.name}</div>
                        <div style="color: #FFC72C; font-family: monospace; font-size: 11px;">${meal.kcal} KCAL | Б:${meal.p} Ж:${meal.f} В:${meal.c}</div>
                    </div>
                    <button onclick="window.handleMealDone('${meal.catId}')" style="background: ${meal.eaten ? '#1a1a1a' : '#FFC72C'}; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.3s;">
                        ${meal.eaten ? '<span style="color:#555">✓</span>' : '<span style="color:#000; font-weight:bold;">+</span>'}
                    </button>
                </div>
                ${meal.rec ? `<div style="font-size:10px; color:#555; margin-top:10px; font-style:italic;">"${meal.rec}"</div>` : ''}
            </div>
        `;
    };

    window.handleMealDone = function(id) {
        const meal = currentDailyPlan.find(m => m.catId === id);
        if (meal) {
            meal.eaten = !meal.eaten;
            window.switchDietTab(id);
            updateMacrosLeftUI();
            savePlanToMemory();
        }
    };

    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const leftKcal = currentAnalysis.targetCalories - eaten.k;
        document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetCalories;
        document.getElementById('calories-left').textContent = leftKcal;

        const bjuEl = document.getElementById('bju-left-display');
        if (bjuEl) {
            bjuEl.innerHTML = `<span>Б: ${currentAnalysis.prot - eaten.p}г</span> <span>Ж: ${currentAnalysis.fat - eaten.f}г</span> <span>В: ${currentAnalysis.carb - eaten.c}г</span>`;
        }
    }

    window.setSpeed = (s, b) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(btn => { 
            btn.style.color = "#555"; btn.style.border = "none";
        });
        if (b) { b.style.color = "#FFC72C"; }
    };

    function savePlanToMemory() {
        localStorage.setItem('pac_diet_v2', JSON.stringify({ plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString() }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('pac_diet_v2');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan; currentAnalysis = data.analysis;
                document.getElementById('diet-tabs-wrapper').style.display = 'block';
                document.getElementById('get-diet-plan-btn').style.display = 'none';
                window.switchDietTab('brf'); updateMacrosLeftUI();
            }
        }
    }

    function initChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ data: [], borderColor: '#FFC72C', tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history').where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(7).get();
        const docs = snap.docs.map(doc => doc.data()).reverse();
        weightChart.data.labels = docs.map(d => d.date);
        weightChart.data.datasets[0].data = docs.map(d => d.weight);
        weightChart.update();
    }

    async function loadBaseData() {
        if (!currentUserId) return;
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('user-height').value = d.height || "";
            document.getElementById('user-age').value = d.age || "";
        }
    }
})();
