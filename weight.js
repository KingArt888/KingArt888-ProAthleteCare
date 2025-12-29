(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; 
    let currentAnalysis = null;
    let currentDailyPlan = [];

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

    // --- 1. ЛОГІКА ВІДНІМАННЯ (Контрольна панель) ---
    window.toggleMeal = function(id, checkbox) {
        const meal = currentDailyPlan.find(m => m.id === id);
        if (meal) {
            meal.eaten = checkbox.checked;
            const card = document.getElementById(`meal-${id}`);
            if (card) card.style.opacity = meal.eaten ? "0.15" : "1";
            
            // Зберігаємо стан у пам'ять
            localStorage.setItem('proatlet_diet', JSON.stringify({
                plan: currentDailyPlan, 
                analysis: currentAnalysis, 
                date: new Date().toDateString()
            }));
            
            updateMacrosLeftUI();
        }
    };

    function updateMacrosLeftUI() {
        if (!currentAnalysis) return;
        
        const eaten = currentDailyPlan.filter(m => m.eaten).reduce((acc, m) => {
            acc.k += m.kcal; acc.p += m.p; acc.f += m.f; acc.c += m.c;
            return acc;
        }, {k:0, p:0, f:0, c:0});

        const leftKcal = currentAnalysis.targetCalories - eaten.k;
        const leftP = currentAnalysis.prot - eaten.p;
        const leftF = currentAnalysis.fat - eaten.f;
        const leftC = currentAnalysis.carb - eaten.c;

        // Оновлюємо основні цифри в HTML
        const kcalEl = document.getElementById('calories-left');
        if (kcalEl) {
            kcalEl.textContent = leftKcal;
            kcalEl.style.color = leftKcal < 0 ? "#DA3E52" : "#FFC72C";
        }
        
        if (document.getElementById('total-daily-kcal')) {
            document.getElementById('total-daily-kcal').textContent = currentAnalysis.targetCalories;
        }

        // Додаємо розширену панель залишку БЖУ
        let sub = document.getElementById('macros-left-sub');
        if (!sub) {
            sub = document.createElement('div');
            sub.id = 'macros-left-sub';
            sub.style.cssText = "font-size:11px; color:#555; text-align:right; margin-top:5px; font-family:monospace;";
            if (kcalEl) kcalEl.parentElement.appendChild(sub);
        }
        sub.innerHTML = `ЗАЛИШОК: Б:${leftP}г | Ж:${leftF}г | В:${leftC}г`;
    }

    // --- 2. ІСТОРІЯ ТА ВИДАЛЕННЯ ---
    async function loadHistory() {
        if (!currentUserId) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId)
            .orderBy('timestamp', 'desc').limit(7).get();

        const historyContainer = getOrCreateHistoryContainer();
        
        historyContainer.innerHTML = snap.docs.map(doc => {
            const d = doc.data();
            return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:8px 12px; margin-bottom:6px; border-radius:6px; border:1px solid #1a1a1a;">
                <div style="font-size:12px; color:#eee;"><strong>${d.weight} kg</strong> <span style="color:#444; font-size:10px; margin-left:5px;">${d.date}</span></div>
                <button onclick="deleteWeightEntry('${doc.id}')" style="background:none; border:none; color:#DA3E52; cursor:pointer; font-size:18px;">&times;</button>
            </div>`;
        }).join('');

        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data()).reverse();
            weightChart.data.labels = docs.map(d => d.date.split('.').slice(0,2).join('.'));
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
        }
    }

    window.deleteWeightEntry = async function(id) {
        if (!confirm("Видалити цей запис?")) return;
        try {
            await firebase.firestore().collection('weight_history').doc(id).delete();
            await loadHistory(); // Перемальовуємо список і графік
        } catch (e) { console.error("Помилка видалення:", e); }
    };

    function getOrCreateHistoryContainer() {
        let container = document.getElementById('compact-history-list');
        if (!container) {
            const chartCard = document.querySelector('.chart-card');
            const wrapper = document.createElement('div');
            wrapper.style.cssText = "margin-top:15px; border-top:1px solid #111; padding-top:10px;";
            wrapper.innerHTML = '<h4 style="font-size:10px; color:#444; text-transform:uppercase; margin-bottom:8px;">History Log</h4>';
            container = document.createElement('div');
            container.id = 'compact-history-list';
            wrapper.appendChild(container);
            chartCard.appendChild(wrapper);
        }
        return container;
    }

    // --- ДОПОМІЖНІ ФУНКЦІЇ (Розрахунок, Графік, Пам'ять) ---
    function calculateAthleteData(w, bmi, h, a) {
        let modifier = bmi < 20.5 ? 1.15 : (bmi < 25.5 ? 1.0 : 0.85);
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const target = Math.round(bmr * 1.55 * modifier);
        return { 
            targetCalories: target,
            prot: Math.round(target * 0.3 / 4), 
            fat: Math.round(target * 0.25 / 9), 
            carb: Math.round(target * 0.45 / 4),
            statusColor: bmi < 20.5 ? "#00BFFF" : (bmi < 25.5 ? "#FFC72C" : "#DA3E52")
        };
    }

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        currentAnalysis = calculateAthleteData(w, bmi, h, a);
        
        // Візуалізація в кругу
        const mainValue = document.getElementById('fat-percentage-value');
        if (mainValue) {
            mainValue.style.cssText = "display:flex; flex-direction:column; align-items:center; justify-content:center; position:absolute; inset:0;";
            mainValue.innerHTML = `<div style="font-size:32px; color:#FFC72C; font-weight:bold;">${w}</div><div style="font-size:12px; color:${currentAnalysis.statusColor};">BMI ${bmi}</div>`;
        }

        await firebase.firestore().collection('weight_history').add({
            userId: currentUserId, weight: w, bmi: bmi,
            date: new Date().toLocaleDateString('uk-UA'),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadHistory();
        updateMacrosLeftUI();
    }

    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        const mealKeys = ["breakfasts", "breakfasts", "lunches", "lunches", "dinners", "dinners"];
        currentDailyPlan = mealKeys.map((key, i) => {
            const meals = dietDatabase[key].filter(m => m.speed === selectedSpeed);
            const meal = meals[Math.floor(Math.random() * meals.length)];
            return { ...meal, kcal: (meal.p*4)+(meal.f*9)+(meal.c*4), id: Math.random().toString(36).substr(2,9), eaten: false };
        });
        renderDietPlan();
    }

    function renderDietPlan() {
        const container = document.getElementById('diet-container');
        if (!container) return;
        document.getElementById('get-diet-plan-btn').disabled = true;
        container.innerHTML = currentDailyPlan.map(meal => `
            <div id="meal-${meal.id}" style="background:rgba(255,255,255,0.02); border:1px solid #1a1a1a; padding:10px; border-radius:8px; margin-bottom:8px; border-left:4px solid #FFC72C; display:flex; align-items:center; justify-content:space-between; opacity:${meal.eaten ? '0.15' : '1'}">
                <div>
                    <div style="color:#fff; font-size:14px; font-weight:bold;">${meal.name}</div>
                    <div style="font-size:10px; color:#666;">Б:${meal.p} Ж:${meal.f} В:${meal.c} | ${meal.kcal} kcal</div>
                </div>
                <input type="checkbox" ${meal.eaten ? 'checked' : ''} style="width:18px; height:18px;" onchange="toggleMeal('${meal.id}', this)">
            </div>
        `).join('');
        updateMacrosLeftUI();
    }

    function checkSavedPlan() {
        const saved = localStorage.getItem('proatlet_diet');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.date === new Date().toDateString()) {
                currentDailyPlan = data.plan; currentAnalysis = data.analysis;
                renderDietPlan();
            }
        }
    }

    function initChart() {
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ data: [], borderColor: '#FFC72C', pointRadius: 2, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('user-height').value = d.height || "";
            document.getElementById('user-age').value = d.age || "";
        }
    }

    window.setSpeed = (s, b) => {
        selectedSpeed = s;
        document.querySelectorAll('.speed-btn').forEach(btn => { btn.style.background = "#111"; btn.style.color = "#555"; });
        b.style.background = "#FFC72C"; b.style.color = "#000";
    };
})();
