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

    // --- FIREBASE ---
    async function saveToFirebase() {
        if (!currentAnalysis) return;
        try {
            const uid = getUserId();
            await window.db.collection("athlete_plans").doc(uid).set({
                plan: currentDailyPlan,
                analysis: currentAnalysis,
                selectedSpeed: selectedSpeed,
                lastUpdate: new Date().toISOString(),
                serverDate: new Date().toDateString()
            });
        } catch (e) { console.error("Firebase Save Error:", e); }
    }

    async function loadFromFirebase() {
        try {
            const uid = getUserId();
            const doc = await window.db.collection("athlete_plans").doc(uid).get();
            loadHistory(uid);
            if (doc.exists) {
                const data = doc.data();
                if (data.serverDate === new Date().toDateString()) {
                    currentDailyPlan = data.plan;
                    currentAnalysis = data.analysis;
                    selectedSpeed = data.selectedSpeed || 'Easy';
                    if (document.querySelector('.speed-selector')) document.querySelector('.speed-selector').style.display = 'none';
                    if (document.getElementById('diet-tabs-wrapper')) document.getElementById('diet-tabs-wrapper').style.display = 'block';
                    updateAllUI();
                    switchDietTab(activeTab);
                }
            }
        } catch (e) { console.log("Load error:", e); }
    }

    // --- LOGIC ---
    async function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let mode, statusColor, calorieModifier;

        // Кольори та режими з твого сканера
        if (bmi < 20.5) { 
            mode = "MUSCLE GAIN MODE"; statusColor = "#00BFFF"; calorieModifier = 1.15;
        } else if (bmi < 25.5) {
            mode = "ATHLETIC FORM"; statusColor = "#FFC72C"; calorieModifier = 1.0;
        } else {
            mode = "WEIGHT LOSS MODE"; statusColor = "#DA3E52"; calorieModifier = 0.80;
        }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetKcal = Math.round(bmr * 1.55 * calorieModifier);

        currentAnalysis = {
            targetKcal, mode, statusColor, weight: w, bmi,
            water: (w * 0.035).toFixed(1),
            p: Math.round(w * 2.2),
            f: Math.round(w * 0.9),
            c: Math.round((targetKcal - (w*2.2*4) - (w*0.9*9)) / 4)
        };

        try {
            await window.db.collection('weight_history').add({
                userId: getUserId(), weight: w, bmi, date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) { console.error(err); }

        updateAllUI();
        loadHistory(getUserId());
        if (document.getElementById('get-diet-plan-btn')) document.getElementById('get-diet-plan-btn').style.display = "block";
    }

    function updateAllUI() {
        if (!currentAnalysis) return;
        const all = [...currentDailyPlan.brf, ...currentDailyPlan.lnc, ...currentDailyPlan.din];
        const eaten = all.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        // Віднімання залишків ЖБУ
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
                            <div style="font-size:10px; color:#555; font-weight:600;">💧 ${currentAnalysis.water}L WATER</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:15px; margin-top:20px; padding-top:15px; border-top:1px solid #1a1a1a;">
                        <div style="flex:1;"><div style="font-size:9px; color:#555; margin-bottom:3px;">PROTEIN</div><div style="font-size:14px; color:#fff; font-weight:bold;">${leftP}g</div></div>
                        <div style="flex:1;"><div style="font-size:9px; color:#555; margin-bottom:3px;">FATS</div><div style="font-size:14px; color:#fff; font-weight:bold;">${leftF}g</div></div>
                        <div style="flex:1;"><div style="font-size:9px; color:#555; margin-bottom:3px;">CARBS</div><div style="font-size:14px; color:#fff; font-weight:bold;">${leftC}g</div></div>
                    </div>
                </div>`;
        }
    }

    // Решта функцій (generateWeeklyPlan, renderMealList, initChart і т.д.) залишаються без змін як у фіналі
    window.generateWeeklyPlan = async function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;
        const slots = [{ id: 'brf', pct: 0.35, key: 'breakfasts' }, { id: 'lnc', pct: 0.35, key: 'lunches' }, { id: 'din', pct: 0.30, key: 'dinners' }];
        slots.forEach(slot => {
            currentDailyPlan[slot.id] = pickMeals(slot.key, currentAnalysis.targetKcal * slot.pct, selectedSpeed);
        });
        document.querySelector('.speed-selector').style.display = 'none';
        document.getElementById('diet-tabs-wrapper').style.display = 'block';
        document.getElementById('get-diet-plan-btn').style.display = 'none';
        switchDietTab(activeTab);
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
                <button onclick="window.toggleMealStatus('${meal.uid}')" style="background:${meal.eaten ? '#FFC72C' : 'transparent'}; border:1px solid ${meal.eaten ? '#FFC72C' : '#333'}; width:24px; height:24px; border-radius:6px;">
                    ${meal.eaten ? '✓' : ''}
                </button>
            </div>
        `).join('');
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

    function switchDietTab(id) {
        activeTab = id;
        ['brf', 'lnc', 'din'].forEach(t => {
            const b = document.getElementById('btn-' + t);
            if (b) {
                b.style.color = (t === id) ? "#FFC72C" : "#444";
                b.style.borderBottom = (t === id) ? "2px solid #FFC72C" : "none";
            }
        });
        renderMealList();
    }

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
        const snap = await window.db.collection('weight_history').where('userId', '==', uid).orderBy('date', 'desc').limit(10).get();
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data()).reverse();
            weightChart.data.labels = docs.map(d => d.date.split('-').slice(1).reverse().join('.'));
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
        }
    }

    window.setSpeed = (s, btn) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(b => { b.style.background = "transparent"; b.style.color = "#555"; });
        if (btn) { btn.style.background = "#FFC72C"; btn.style.color = "#000"; }
    };
})();
