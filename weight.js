(function() {
    let currentAnalysis = null;
    let currentDailyPlan = { brf: [], lnc: [], din: [] };
    let activeTab = 'brf';
    let selectedSpeed = 'Easy';
    
    // Вкажи тут реальний ID користувача (наприклад, firebase.auth().currentUser.uid)
    const userId = "athlete_pro_1"; 

    document.addEventListener('DOMContentLoaded', () => {
        const weightForm = document.getElementById('weight-form');
        if (weightForm) weightForm.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);

        ['brf', 'lnc', 'din'].forEach(id => {
            const btn = document.getElementById('btn-' + id);
            if (btn) btn.onclick = () => switchDietTab(id);
        });

        // Завантажуємо дані з хмари замість кешу
        loadFromFirebase();
    });

    // --- ФУНКЦІЇ FIREBASE ---

    async function saveToFirebase() {
        if (!currentAnalysis) return;
        try {
            // Зберігаємо в колекцію 'athlete_plans'
            await db.collection("athlete_plans").doc(userId).set({
                plan: currentDailyPlan,
                analysis: currentAnalysis,
                selectedSpeed: selectedSpeed,
                lastUpdate: new Date().toISOString(),
                serverDate: new Date().toDateString() // Для перевірки актуальності дня
            });
            console.log("Plan synced with Firebase");
        } catch (e) {
            console.error("Error saving to Firebase: ", e);
        }
    }

    async function loadFromFirebase() {
        try {
            const doc = await db.collection("athlete_plans").doc(userId).get();
            if (doc.exists) {
                const data = doc.data();
                // Перевіряємо, чи план сьогоднішній
                if (data.serverDate === new Date().toDateString()) {
                    currentDailyPlan = data.plan;
                    currentAnalysis = data.analysis;
                    selectedSpeed = data.selectedSpeed || 'Easy';

                    const speedSelector = document.querySelector('.speed-selector');
                    if (speedSelector) speedSelector.style.display = 'none';
                    const wrapper = document.getElementById('diet-tabs-wrapper');
                    if (wrapper) wrapper.style.display = 'block';

                    updateAllUI();
                    switchDietTab('brf');
                }
            }
        } catch (e) {
            console.error("Error loading from Firebase: ", e);
        }
    }

    // --- МОДИФІКОВАНІ ФУНКЦІЇ ПЛАНУ ---

    window.generateWeeklyPlan = async function() {
        if (!currentAnalysis || typeof dietDatabase === 'undefined') return;

        const slots = [
            { id: 'brf', pct: 0.40, key: 'breakfasts' },
            { id: 'lnc', pct: 0.30, key: 'lunches' },
            { id: 'din', pct: 0.30, key: 'dinners' }
        ];

        slots.forEach(slot => {
            currentDailyPlan[slot.id] = pickMeals(slot.key, currentAnalysis.targetKcal * slot.pct);
        });

        document.querySelector('.speed-selector').style.display = 'none';
        document.getElementById('diet-tabs-wrapper').style.display = 'block';
        document.getElementById('get-diet-plan-btn').style.display = 'none';

        switchDietTab('brf');
        updateAllUI();
        
        // Зберігаємо в хмару
        await saveToFirebase();
    };

    window.toggleMealStatus = async function(uid) {
        const meal = currentDailyPlan[activeTab].find(m => m.uid === uid);
        if (meal) {
            meal.eaten = !meal.eaten;
            renderMealList();
            updateAllUI();
            // Оновлюємо статус в хмарі
            await saveToFirebase();
        }
    };

    window.replaceOneMeal = async function(uid) {
        const slotKeyMap = { 'brf': 'breakfasts', 'lnc': 'lunches', 'din': 'dinners' };
        const dbKey = slotKeyMap[activeTab];
        const index = currentDailyPlan[activeTab].findIndex(m => m.uid === uid);
        if (index === -1) return;

        const currentNames = currentDailyPlan[activeTab].map(m => m.name);
        let available = dietDatabase[dbKey].filter(m => m.speed === selectedSpeed && !currentNames.includes(m.name));

        if (available.length > 0) {
            let meal = available[Math.floor(Math.random() * available.length)];
            let kcal = (meal.p * 4) + (meal.f * 9) + (meal.c * 4);
            currentDailyPlan[activeTab][index] = { 
                ...meal, 
                kcal: Math.round(kcal), 
                eaten: false, 
                uid: Math.random().toString(36).substr(2, 9) 
            };
            renderMealList();
            updateAllUI();
            // Синхронізуємо заміну
            await saveToFirebase();
        }
    };

    // (Функції handleAthleteAnalysis, pickMeals, renderMealList, switchDietTab, updateAllUI та setSpeed залишаються без змін, як у попередньому компактному варіанті)

    // ... (встав сюди решту функцій з попередньої відповіді) ...

})();
