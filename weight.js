(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; 
    let currentAnalysis = null;
    let currentDailyPlan = [];

    // ЧЕКАЄМО ЗАВАНТАЖЕННЯ DOM
    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        
        const weightForm = document.getElementById('weight-form');
        if (weightForm) weightForm.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);

        // Перевірка авторизації
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

    // 1. АНАЛІЗ ТА РОЗРАХУНОК КБЖВ
    async function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        
        if (!w || !h || !a) return;

        // Розрахунок BMI та калорій
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * 1.55);

        currentAnalysis = {
            targetCalories,
            prot: Math.round(targetCalories * 0.30 / 4),
            fat: Math.round(targetCalories * 0.25 / 9),
            carb: Math.round(targetCalories * 0.45 / 4)
        };

        // Оновлення інтерфейсу
        const bmiEl = document.getElementById('bmi-value');
        if (bmiEl) bmiEl.textContent = bmi;

        const fatEl = document.getElementById('fat-percentage-value');
        if (fatEl) fatEl.innerHTML = `<div style="font-size:32px; color:#FFC72C;">${w}</div><div style="font-size:12px;">КГ</div>`;
        
        const recBox = document.getElementById('athlete-recommendation-box');
        if (recBox) {
            recBox.innerHTML = `Ціль: <strong>${targetCalories}</strong> ккал | Б:${currentAnalysis.prot} Ж:${currentAnalysis.fat} В:${currentAnalysis.carb}`;
        }
        
        const dietBtn = document.getElementById('get-diet-plan-btn');
        if (dietBtn) dietBtn.style.display = "block";

        updateMacrosLeftUI();
    }

    // 2. ГЕНЕРАЦІЯ ПЛАНУ (Використовує базу з diet-data.js)
    window.generateWeeklyPlan = function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') {
            console.error("Помилка: Немає аналізу або бази dietDatabase");
            return;
        }

        const specs = [
            { id: 'brf', label: 'СНІДАНОК', pct: 0.40, dbKey: 'breakfasts' },
            { id: 'lnc', label: 'ОБІД', pct: 0.30, dbKey: 'lunches' },
            { id: 'din', label: 'ВЕЧЕРЯ', pct: 0.30, dbKey: 'dinners' }
        ];

        currentDailyPlan = specs.map(spec => {
            const targetKcal = currentAnalysis.targetCalories * spec.pct;
            const meals = dietDatabase[spec.dbKey].filter(m => m.speed === selectedSpeed);
            
            // Пошук страви, яка найкраще підходить за калорійністю
            let bestMeal = meals[0];
            let minDiff = Infinity;
            
            meals.forEach(m => {
                const mealKcal = (m.p * 4) + (m.f * 9) + (m.c * 4);
                const diff = Math.abs(mealKcal - targetKcal);
                if (diff < minDiff) { 
                    minDiff = diff; 
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

        const wrapper = document.getElementById('diet-tabs-wrapper');
        if (wrapper) wrapper.style.display = 'block';
        
        const mainBtn = document.getElementById('get-diet-plan-btn');
        if (mainBtn) mainBtn.style.display = 'none';

        window.switchDietTab('brf');
        savePlanToMemory();
    };

    // 3. ПЕРЕМИКАННЯ ВКЛАДОК
    window.switchDietTab = function(tabId) {
        ['brf', 'lnc', 'din'].forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) {
                btn.style.background = (id === tabId) ? "#FFC72C" : "#111";
                btn.style.color = (id === tabId) ? "#000" : "#fff";
            }
        });

        const meal = currentDailyPlan.find(m => m.catId === tabId);
        const content = document.getElementById('diet-tab-content');
        if (!meal || !content) return;

        content.innerHTML = `
            <div style="background: #0a0a0a; border: 1px solid #1a1a1a; padding: 20px; border-radius: 12px; animation: fadeIn 0.3s ease;">
                <div style="opacity: ${meal.eaten ? '0.3' : '1'}">
                    <h4 style="color: #FFC72C; font-size: 10px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">${meal.catLabel}</h4>
                    <div style="color: #fff; font-size: 18px; font-weight: bold; margin-bottom: 5px;">${meal.name}</div>
                    <div style="color: #888; font-size: 12px; margin-bottom: 15px;">${meal.rec || 'Рекомендовано для вашого рівня активності'}</div>
                    <div style="margin-top: 15px; color: #FFC72C; font-family: monospace; font-size: 14px;">
                        ⚡ ${meal.kcal} ККАЛ | Б:${meal.p} Ж:${meal.f} В:${meal.c}
                    </div>
                </div>
                <button onclick="window.handleMealDone('${meal.catId}')" style="width:100%; margin-top:20px; padding:12px; border-radius:8px; background:${meal.eaten ? '#222' : '#FFC72C'}; color:${meal.eaten ? '#555' : '#000'}; border:none; font-weight:bold; cursor:pointer; transition: 0.3s;">
                    ${meal.eaten ? '✓ З\'ЇДЕНО' : 'ПОЗНАЧИТИ ЯК З\'ЇДЕНЕ'}
                </button>
            </div>
        `;
    };

    // 4. ВІДМІТКА ПРО СПОЖИВАННЯ
    window.handleMealDone = function(id) {
        const meal = currentDailyPlan.find(m => m.catId === id);
        if (meal) {
            meal.eaten = !meal.eaten;
            window.switchDietTab(id);
            updateMacrosLeftUI();
            savePlanToMemory();
        }
    };

    // 5. ОНОВЛЕННЯ ЗАЛИШКУ КБЖВ
    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const totalEl = document.getElementById('total-daily-kcal');
        if (totalEl) totalEl.textContent = currentAnalysis.targetCalories;

        const leftEl = document.getElementById('calories-left');
        if (leftEl) leftEl.textContent = Math.max(0, currentAnalysis.targetCalories - eaten.k);

        const bjuEl = document.getElementById('bju-left-display');
        if (bjuEl) {
            bjuEl.innerHTML = `
                <span>Б: ${Math.max(0, currentAnalysis.prot - eaten.p)}г</span>
                <span>Ж: ${Math.max(0, currentAnalysis.fat - eaten.f)}г</span>
                <span>В: ${Math.max(0, currentAnalysis.carb - eaten.c)}г</span>
            `;
        }
    }

    // 6. ПАМ'ЯТЬ (Local Storage)
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
                const wrapper = document.getElementById('diet-tabs-wrapper');
                if (wrapper) wrapper.style.display = 'block';
                const mainBtn = document.getElementById('get-diet-plan-btn');
                if (mainBtn) mainBtn.style.display = 'none';
                window.switchDietTab('brf');
                updateMacrosLeftUI();
            }
        }
    }

    // 7. НАЛАШТУВАННЯ ШВИДКОСТІ ПРИГОТУВАННЯ
    window.setSpeed = (s, b) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(btn => { 
            btn.style.background = "#222"; 
            btn.style.color = "#fff"; 
            btn.classList.remove('active');
        });
        if (b) { 
            b.style.background = "#FFC72C"; 
            b.style.color = "#000"; 
            b.classList.add('active');
        }
    };

    // 8. ГРАФІК (Chart.js)
    function initChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx || typeof Chart === 'undefined') return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { 
                labels: [], 
                datasets: [{ 
                    label: 'Вага (кг)',
                    data: [], 
                    borderColor: '#FFC72C', 
                    backgroundColor: 'rgba(255, 199, 44, 0.1)',
                    tension: 0.4,
                    fill: true
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: '#222' }, ticks: { color: '#888' } },
                    x: { grid: { display: false }, ticks: { color: '#888' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    async function loadHistory() {
        if (!currentUserId || !weightChart || typeof firebase === 'undefined') return;
        try {
            const snap = await firebase.firestore().collection('weight_history')
                .where('userId', '==', currentUserId)
                .orderBy('timestamp', 'desc')
                .limit(7)
                .get();
            const docs = snap.docs.map(doc => doc.data()).reverse();
            weightChart.data.labels = docs.map(d => d.date || '');
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
        } catch (err) { console.error("History load error:", err); }
    }

    async function loadBaseData() {
        if (!currentUserId || typeof firebase === 'undefined') return;
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            const hInput = document.getElementById('user-height');
            const aInput = document.getElementById('user-age');
            if (hInput) hInput.value = d.height || "";
            if (aInput) aInput.value = d.age || "";
        }
    }
})();
