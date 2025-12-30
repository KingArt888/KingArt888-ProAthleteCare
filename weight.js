(function() {
    let currentAnalysis = null;
    let currentDailyPlan = { brf: [], lnc: [], din: [] };
    let activeTab = 'brf';
    let selectedSpeed = 'Easy';
    
    const getUserId = () => (window.auth && window.auth.currentUser) ? window.auth.currentUser.uid : "guest_athlete_1";

    document.addEventListener('DOMContentLoaded', () => {
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
            console.log("🚀 PAC: План збережено");
        } catch (e) { console.error("Firebase Save Error:", e); }
    }

    async function loadFromFirebase() {
        try {
            const uid = getUserId();
            const doc = await window.db.collection("athlete_plans").doc(uid).get();
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

    // --- LOGIC ---
    function handleAthleteAnalysis(e) {
        if (e) e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value')?.value);
        const h = parseFloat(document.getElementById('user-height')?.value);
        const a = parseInt(document.getElementById('user-age')?.value);
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let mode = "MAINTENANCE", mult = 1.55;
        if (bmi < 18.5) { mode = "MASS GAIN"; mult = 1.85; }
        else if (bmi > 25.5) { mode = "WEIGHT LOSS"; mult = 1.35; }

        currentAnalysis = {
            targetKcal: Math.round(((10 * w) + (6.25 * h) - (5 * a) + 5) * mult),
            mode, water: (w * 0.035).toFixed(1),
            p: Math.round(w * 2), f: Math.round(w * 0.9), c: Math.round(w * 3)
        };

        updateAllUI();
        if (document.getElementById('get-diet-plan-btn')) 
            document.getElementById('get-diet-plan-btn').style.display = "block";
    }

    window.generateWeeklyPlan = async function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        const slots = [
            { id: 'brf', pct: 0.35, key: 'breakfasts' },
            { id: 'lnc', pct: 0.35, key: 'lunches' },
            { id: 'din', pct: 0.30, key: 'dinners' }
        ];

        // ГЕНЕРУЄМО ПЛАН ВРАХОВУЮЧИ ШВИДКІСТЬ
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

    function pickMeals(key, target, speed) {
        let currentKcal = 0;
        let selected = [];
        // Фільтруємо базу за обраною швидкістю
        let available = [...dietDatabase[key].filter(m => m.speed === speed)];
        
        // Якщо раптом у базі мало страв цієї швидкості, додаємо інші як запасні
        if (available.length < 2) available = [...dietDatabase[key]];

        while (currentKcal < target && available.length > 0) {
            let randomIndex = Math.floor(Math.random() * available.length);
            let meal = available.splice(randomIndex, 1)[0];
            let kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            
            selected.push({ 
                ...meal, 
                kcal: Math.round(kcal), 
                eaten: false, 
                uid: Math.random().toString(36).substr(2, 9) 
            });
            currentKcal += kcal;
        }
        return selected;
    }

    window.replaceOneMeal = async function(uid) {
        const slotKeyMap = { 'brf': 'breakfasts', 'lnc': 'lunches', 'din': 'dinners' };
        const dbKey = slotKeyMap[activeTab];
        const index = currentDailyPlan[activeTab].findIndex(m => m.uid === uid);
        if (index === -1) return;

        const choice = prompt("Select speed:\n1 - ⚡ Easy\n2 - 🥗 Medium\n3 - 👨‍🍳 Hard", "1");
        let newSpeed = "Easy";
        if (choice === "2") newSpeed = "Medium";
        if (choice === "3") newSpeed = "Hard";

        let available = dietDatabase[dbKey].filter(m => m.speed === newSpeed);
        if (available.length > 0) {
            let meal = available[Math.floor(Math.random() * available.length)];
            currentDailyPlan[activeTab][index] = { 
                ...meal, 
                kcal: Math.round((meal.p*4)+(meal.f*9)+(meal.c*4)), 
                eaten: false, 
                uid: Math.random().toString(36).substr(2, 9) 
            };
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
                    <div style="color:#fff; font-size:13px; font-weight:600; letter-spacing:0.5px;">${meal.name.toUpperCase()}</div>
                    <div style="color:#555; font-size:9px; font-family:monospace; margin-top:3px;">
                        ${meal.p}P ${meal.f}F ${meal.c}C <span style="color:#FFC72C; opacity:0.8;">• ${meal.kcal} KCAL</span>
                    </div>
                </div>
                <div style="display:flex; gap:15px; align-items:center;">
                    <button onclick="window.replaceOneMeal('${meal.uid}')" style="background:transparent; border:none; color:#333; font-size:10px; font-weight:bold; cursor:pointer;">ALT</button>
                    <button onclick="window.toggleMealStatus('${meal.uid}')" style="background:${meal.eaten ? '#FFC72C' : 'transparent'}; border:1px solid ${meal.eaten ? '#FFC72C' : '#333'}; width:24px; height:24px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition: 0.2s;">
                        ${meal.eaten ? '<span style="color:#000; font-size:14px; font-weight:bold;">✓</span>' : ''}
                    </button>
                </div>
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

    function updateAllUI() {
        if (!currentAnalysis) return;
        const allMeals = [...currentDailyPlan.brf, ...currentDailyPlan.lnc, ...currentDailyPlan.din];
        const eaten = allMeals.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c; return acc;
        }, {k:0, p:0, f:0, c:0});

        const leftKcal = Math.max(0, currentAnalysis.targetKcal - eaten.k);
        const leftP = Math.max(0, currentAnalysis.p - eaten.p);
        const leftF = Math.max(0, currentAnalysis.f - eaten.f);
        const leftC = Math.max(0, currentAnalysis.c - eaten.c);
        
        const topBox = document.getElementById('athlete-recommendation-box');
        if (topBox) {
            topBox.innerHTML = `
                <div style="background:#000; padding:18px; border-radius:15px; border:1px solid #FFC72C; box-shadow: 0 4px 20px rgba(255,199,44,0.1);">
                    <div style="font-size:10px; color:#FFC72C; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px; font-weight:700;">PAC ANALYTICS • ${currentAnalysis.mode}</div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                        <div>
                            <div style="font-size:36px; color:#fff; font-weight:900; line-height:1;">${leftKcal}</div>
                            <div style="font-size:11px; color:#FFC72C; font-weight:600; margin-top:5px;">KCAL REMAINING</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:20px; color:#fff; font-weight:800;">💧 ${currentAnalysis.water}L</div>
                            <div style="font-size:10px; color:#555; font-weight:600;">DAILY WATER GOAL</div>
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

    window.setSpeed = (s, btn) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "transparent"; b.style.color = "#555"; b.style.borderColor = "#222";
        });
        if (btn) { 
            btn.style.background = "#FFC72C"; 
            btn.style.color = "#000"; 
            btn.style.borderColor = "#FFC72C";
        }
    };

})();
