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

    // 1. АНАЛІЗ: BMI + РЕЖИМ (SYNC) + ВОДА
    async function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        
        if (!w || !h || !a) return;

        // BMI та Режим
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let mode = "";
        let multiplier = 1.55; // Базовий (Maintenance)

        if (bmi < 18.5) {
            mode = "Mass Gain";
            multiplier = 1.8; // Профіцит для набору
        } else if (bmi < 25) {
            mode = "Maintenance";
            multiplier = 1.55; // Підтримка
        } else {
            mode = "Weight Loss";
            multiplier = 1.3; // Дефіцит для схуднення
        }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * multiplier);
        const waterLitres = (w * 0.035).toFixed(1);

        currentAnalysis = {
            targetCalories,
            mode,
            waterLitres,
            prot: Math.round(targetCalories * 0.30 / 4),
            fat: Math.round(targetCalories * 0.25 / 9),
            carb: Math.round(targetCalories * 0.45 / 4)
        };

        // UI: BMI та Вага
        const bmiEl = document.getElementById('bmi-value');
        if (bmiEl) bmiEl.innerHTML = `<span style="color:#FFC72C">${bmi}</span> <div style="font-size:10px; color:#888;">${mode}</div>`;
        
        const fatEl = document.getElementById('fat-percentage-value');
        if (fatEl) fatEl.innerHTML = `<div style="font-size:32px; color:#FFC72C; font-weight:800;">${w}</div><div style="font-size:10px;">КГ</div>`;
        
        // UI: РЕКОМЕНДАЦІЯ
        const recBox = document.getElementById('athlete-recommendation-box');
        if (recBox) {
            recBox.innerHTML = `
                <div style="background: #111; padding: 15px; border-radius: 12px; border: 1px solid #222; margin-bottom: 15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:10px; color:#FFC72C; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Режим: ${mode}</div>
                            <div style="font-size:24px; color:#fff; font-weight:bold;">${targetCalories} <span style="font-size:12px; color:#FFC72C;">ККАЛ</span></div>
                            <div style="font-size:11px; font-family:monospace; color:#888;">P:${currentAnalysis.prot}g | F:${currentAnalysis.fat}g | C:${currentAnalysis.carb}g</div>
                        </div>
                        <div style="text-align:right; border-left: 1px solid #222; padding-left: 15px;">
                            <div style="font-size:20px; color:#fff; font-weight:bold;">💧 ${waterLitres}л</div>
                            <div style="font-size:9px; color:#40E0D0; text-transform:uppercase;">Вода / День</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('get-diet-plan-btn').style.display = "block";
        updateMacrosLeftUI();
    }

    // 2. ГЕНЕРАЦІЯ: ПРИХОВУЄМО НАЛАШТУВАННЯ + ПОВНИЙ СПИСОК (40/30/30)
    window.generateWeeklyPlan = function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        // Ховаємо вибір швидкості та кнопку
        const speedSelector = document.querySelector('.speed-selector');
        if (speedSelector) speedSelector.style.display = 'none';
        document.getElementById('get-diet-plan-btn').style.display = 'none';

        // 40% Сніданок, 30% Обід, 30% Вечеря
        const specs = [
            { id: 'brf', label: 'Сніданок (40%)', dbKey: 'breakfasts' },
            { id: 'lnc', label: 'Обід (30%)', dbKey: 'lunches' },
            { id: 'din', label: 'Вечеря (30%)', dbKey: 'dinners' }
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
        
        renderFullList(); 
        savePlanToMemory();
    };

    // 3. РЕНДЕР КАРТОК СПИСКОМ
    function renderFullList() {
        const content = document.getElementById('diet-tab-content');
        if (!content) return;

        // Приховуємо навігацію вкладок (бо ми показуємо все разом)
        const tabsNav = document.querySelector('#diet-tabs-wrapper > div:first-child');
        if (tabsNav) tabsNav.style.display = 'none';

        content.innerHTML = currentDailyPlan.map(meal => `
            <div style="background: #0d0d0d; margin-bottom: 12px; padding: 18px; border-radius: 14px; border: 1px solid #1a1a1a; display: flex; justify-content: space-between; align-items: center; transition: 0.3s; ${meal.eaten ? 'opacity: 0.3;' : ''}">
                <div style="flex: 1;">
                    <div style="font-size: 9px; color: #FFC72C; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">${meal.catLabel}</div>
                    <div style="color: #fff; font-size: 16px; font-weight: 600; margin-bottom: 4px;">${meal.name}</div>
                    <div style="color: #666; font-family: monospace; font-size: 11px;">${meal.kcal} KCAL | Б:${meal.p} Ж:${meal.f} В:${meal.c}</div>
                </div>
                <button onclick="window.handleMealDone('${meal.catId}')" style="background: ${meal.eaten ? '#1a1a1a' : '#FFC72C'}; border:none; width:42px; height:42px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; margin-left:15px; transition:0.3s;">
                    ${meal.eaten ? '<span style="color:#555">✓</span>' : '<span style="color:#000; font-weight:bold; font-size:20px;">+</span>'}
                </button>
            </div>
        `).join('');
    }

    window.handleMealDone = function(id) {
        const meal = currentDailyPlan.find(m => m.catId === id);
        if (meal) {
            meal.eaten = !meal.eaten;
            renderFullList();
            updateMacrosLeftUI();
            savePlanToMemory();
        }
    };

    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const totalEl = document.getElementById('total-daily-kcal');
        if (totalEl) totalEl.textContent = currentAnalysis.targetCalories;

        const leftEl = document.getElementById('calories-left');
        if (leftEl) leftEl.textContent = currentAnalysis.targetCalories - eaten.k;

        const bjuEl = document.getElementById('bju-left-display');
        if (bjuEl) {
            bjuEl.innerHTML = `<span>Б: ${currentAnalysis.prot - eaten.p}г</span> <span>Ж: ${currentAnalysis.fat - eaten.f}г</span> <span>В: ${currentAnalysis.carb - eaten.c}г</span>`;
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
        localStorage.setItem('pac_diet_v_final', JSON.stringify({ plan: currentDailyPlan, analysis: currentAnalysis, date: new Date().toDateString() }));
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('pac_diet_v_final');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan; currentAnalysis = data.analysis;
                const speedSelector = document.querySelector('.speed-selector');
                if (speedSelector) speedSelector.style.display = 'none';
                document.getElementById('diet-tabs-wrapper').style.display = 'block';
                document.getElementById('get-diet-plan-btn').style.display = 'none';
                renderFullList(); updateMacrosLeftUI();
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
