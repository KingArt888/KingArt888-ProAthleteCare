(function() {
    // Спільні змінні
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

    // --- FIREBASE (ОБ'ЄДНАНО) ---
    async function saveToFirebase() {
        if (!currentAnalysis) return;
        try {
            const uid = getUserId();
            // Зберігаємо основний план та налаштування
            await window.db.collection("athlete_plans").doc(uid).set({
                plan: currentDailyPlan,
                analysis: currentAnalysis,
                selectedSpeed: selectedSpeed,
                lastUpdate: new Date().toISOString(),
                serverDate: new Date().toDateString()
            });
            console.log("🚀 PAC: План та Скан синхронізовано");
        } catch (e) { console.error("Firebase Save Error:", e); }
    }

    async function loadFromFirebase() {
        try {
            const uid = getUserId();
            const doc = await window.db.collection("athlete_plans").doc(uid).get();
            
            // Завантажуємо історію для графіка
            loadHistory(uid);

            if (doc.exists) {
                const data = doc.data();
                if (data.serverDate === new Date().toDateString()) {
                    currentDailyPlan = data.plan;
                    currentAnalysis = data.analysis;
                    selectedSpeed = data.selectedSpeed || 'Easy';

                    if (document.querySelector('.speed-selector')) 
                        document.querySelector('.speed-selector').style.display = 'none';
                    if (document.getElementById('diet-tabs-wrapper')) 
                        document.getElementById('diet-tabs-wrapper').style.display = 'block';

                    updateAllUI();
                    switchDietTab(activeTab);
                }
            }
        } catch (e) { console.log("Cloud load info:", e); }
    }

    // --- LOGIC (COMPOSITION SCAN + DIET) ---
    async function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        
        // Розрахунок режиму (з weight alt.js)
        let mode, recommendation, statusColor, calorieModifier;
        if (bmi < 20.5) { 
            mode = "MUSCLE GAIN MODE";
            recommendation = "Ціль: Гіпертрофія. Профіцит +15%.";
            statusColor = "#00BFFF"; calorieModifier = 1.15;
        } else if (bmi < 25.5) {
            mode = "ATHLETIC FORM";
            recommendation = "Ціль: Рекімпозиція. Підтримка.";
            statusColor = "#FFC72C"; calorieModifier = 1.0;
        } else {
            mode = "WEIGHT LOSS MODE";
            recommendation = "Ціль: Жироспалювання. Дефіцит -20%.";
            statusColor = "#DA3E52"; calorieModifier = 0.80;
        }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetKcal = Math.round(bmr * 1.55 * calorieModifier);

        currentAnalysis = {
            targetKcal: targetKcal,
            mode: mode,
            recommendation: recommendation,
            statusColor: statusColor,
            water: (w * 0.035).toFixed(1),
            weight: w,
            bmi: bmi,
            p: Math.round(w * 2.2), // Професійна норма білка для атлетів
            f: Math.round(w * 0.9),
            c: Math.round((targetKcal - (w*2.2*4) - (w*0.9*9)) / 4)
        };

        // Зберігаємо в історію ваги (Scanner logic)
        try {
            const uid = getUserId();
            await window.db.collection('weight_history').add({
                userId: uid,
                weight: w,
                bmi: bmi,
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) { console.error("History Error:", err); }

        updateAllUI();
        loadHistory(getUserId());

        if (document.getElementById('get-diet-plan-btn')) 
            document.getElementById('get-diet-plan-btn').style.display = "block";
    }

    // --- UI RENDERING ---
    function updateAllUI() {
        if (!currentAnalysis) return;

        // Оновлюємо головний блок аналітики (PAC ANALYTICS)
        const topBox = document.getElementById('athlete-recommendation-box');
        if (topBox) {
            const allMeals = [...currentDailyPlan.brf, ...currentDailyPlan.lnc, ...currentDailyPlan.din];
            const eaten = allMeals.filter(m => m.eaten).reduce((acc, m) => {
                acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
            }, {k:0, p:0, f:0, c:0});

            const leftKcal = Math.max(0, currentAnalysis.targetKcal - eaten.k);

            topBox.innerHTML = `
                <div style="background:#000; padding:18px; border-radius:15px; border:1px solid #FFC72C;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="font-size:10px; color:${currentAnalysis.statusColor}; text-transform:uppercase; letter-spacing:1.5px; font-weight:700;">
                            ${currentAnalysis.mode}
                        </div>
                        <div style="font-size:14px; color:#fff; font-weight:bold;">${currentAnalysis.weight}kg</div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:10px;">
                        <div>
                            <div style="font-size:36px; color:#fff; font-weight:900; line-height:1;">${leftKcal}</div>
                            <div style="font-size:11px; color:#FFC72C; font-weight:600; margin-top:5px;">KCAL REMAINING</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:16px; color:${currentAnalysis.statusColor}; font-weight:800;">BMI: ${currentAnalysis.bmi}</div>
                            <div style="font-size:18px; color:#fff; font-weight:800; margin-top:5px;">💧 ${currentAnalysis.water}L</div>
                        </div>
                    </div>

                    <div style="margin-top:15px; font-size:10px; color:#FFC72C; border-top:1px solid #1a1a1a; padding-top:8px;">
                        ${currentAnalysis.recommendation}
                    </div>
                </div>`;
        }

        // Оновлюємо круговий сканер (якщо він є на сторінці)
        const mainValue = document.getElementById('fat-percentage-value');
        if (mainValue) {
            mainValue.innerHTML = `
                <span style="font-size:10px; color:#666; text-transform:uppercase;">Weight</span>
                <span style="font-size:30px; color:#FFC72C; font-weight:bold;">${currentAnalysis.weight}</span>
                <span style="font-size:12px; color:${currentAnalysis.statusColor};">BMI ${currentAnalysis.bmi}</span>
            `;
        }
    }

    // --- CHART & HISTORY LOGIC ---
    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        weightChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага (кг)', data: [], borderColor: '#FFC72C', backgroundColor: 'rgba(255,199,44,0.05)', tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    async function loadHistory(uid) {
        if (!uid || !weightChart) return;
        const snap = await window.db.collection('weight_history')
            .where('userId', '==', uid).orderBy('date', 'desc').limit(10).get();
        
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data()).reverse();
            weightChart.data.labels = docs.map(d => d.date.split('-').slice(1).reverse().join('.'));
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
        }
    }

    // --- DIET PLAN GENERATION (KEEP AS IS) ---
    window.generateWeeklyPlan = async function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;
        const slots = [{ id: 'brf', pct: 0.35, key: 'breakfasts' }, { id: 'lnc', pct: 0.35, key: 'lunches' }, { id: 'din', pct: 0.30, key: 'dinners' }];
        slots.forEach(slot => {
            currentDailyPlan[slot.id] = pickMeals(slot.key, currentAnalysis.targetKcal * slot.pct, selectedSpeed);
        });
        if (document.querySelector('.speed-selector')) document.querySelector('.speed-selector').style.display = 'none';
        document.getElementById('diet-tabs-wrapper').style.display = 'block';
        document.getElementById('get-diet-plan-btn').style.display = 'none';
        switchDietTab('brf');
        updateAllUI();
        await saveToFirebase();
    };

    function pickMeals(key, target, speed) {
        let currentKcal = 0; let selected = [];
        let available = [...dietDatabase[key].filter(m => m.speed === speed)];
        if (available.length < 2) available = [...dietDatabase[key]];
        while (currentKcal < target && available.length > 0) {
            let meal = available.splice(Math.floor(Math.random() * available.length), 1)[0];
            let kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            selected.push({ ...meal, kcal: Math.round(kcal), eaten: false, uid: Math.random().toString(36).substr(2, 9) });
            currentKcal += kcal;
        }
        return selected;
    }

    window.toggleMealStatus = async function(uid) {
        const meal = currentDailyPlan[activeTab].find(m => m.uid === uid);
        if (meal) {
            meal.eaten = !meal.eaten;
            renderMealList();
            updateAllUI();
            await saveToFirebase();
        }
    };

    function renderMealList() {
        const meals = currentDailyPlan[activeTab];
        const box = document.getElementById('diet-tab-content');
        if (!box || !meals) return;
        box.innerHTML = meals.map(meal => `
            <div style="background:transparent; padding:12px 0; border-bottom:1px solid #1a1a1a; display:flex; justify-content:space-between; align-items:center;">
                <div style="opacity: ${meal.eaten ? '0.2' : '1'}; flex: 1;">
                    <div style="color:#fff; font-size:13px; font-weight:600;">${meal.name.toUpperCase()}</div>
                    <div style="color:#555; font-size:9px;">${meal.p}P ${meal.f}F ${meal.c}C • <span style="color:#FFC72C;">${meal.kcal} KCAL</span></div>
                </div>
                <button onclick="window.toggleMealStatus('${meal.uid}')" style="background:${meal.eaten ? '#FFC72C' : 'transparent'}; border:1px solid ${meal.eaten ? '#FFC72C' : '#333'}; width:24px; height:24px; border-radius:6px; cursor:pointer;">
                    ${meal.eaten ? '✓' : ''}
                </button>
            </div>
        `).join('');
    }

    function switchDietTab(id) {
        activeTab = id;
        ['brf', 'lnc', 'din'].forEach(t => {
            const b = document.getElementById('btn-' + t);
            if (b) b.style.color = (t === id) ? "#FFC72C" : "#444";
        });
        renderMealList();
    }

    window.setSpeed = (s, btn) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(b => { b.style.background = "transparent"; b.style.color = "#555"; });
        if (btn) { btn.style.background = "#FFC72C"; btn.style.color = "#000"; }
    };
})();
