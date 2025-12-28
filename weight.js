(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            
            await loadUserProfile(); 
            await checkDailyEntry(); 
            await initWeightChart(); 
        } else {
            await firebase.auth().signInAnonymously();
        }
    });

    // --- 1. РОЗРАХУНОК BMI, % ЖИРУ ТА ГОЛОГРАМА ---
    function displayBMIResult(weight, height, age) {
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        
        const bmiValEl = document.getElementById('bmi-value');
        const bmiStatusEl = document.getElementById('bmi-status');
        const adviceEl = document.getElementById('nutrition-advice');
        const card = document.getElementById('bmi-result-card');

        if (bmiValEl) bmiValEl.textContent = bmi;

        if (card) {
            if (bmi < 18.5) {
                bmiStatusEl.textContent = "Недостатня вага";
                card.style.borderLeft = "5px solid #FFD700";
                adviceEl.textContent = "Рекомендовано: Збільшити калорійність раціону та силові тренування.";
            } else if (bmi < 25) {
                bmiStatusEl.textContent = "Норма";
                card.style.borderLeft = "5px solid #4CAF50";
                adviceEl.textContent = "Ваш показник в нормі. Продовжуйте підтримувати поточний режим.";
            } else {
                bmiStatusEl.textContent = "Weight Loss Needed";
                card.style.borderLeft = "5px solid #DA3E52";
                adviceEl.textContent = "Рекомендовано: Дефіцит калорій та перегляд плану харчування.";
            }
        }

        // Оновлення голограми та % жиру
        updateHologram(weight, height, age);
        
        const recipeBtn = document.getElementById('recipe-link-container');
        if (recipeBtn) recipeBtn.style.display = 'block';
    }

    function updateHologram(weight, height, age) {
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        const bodyPath = document.getElementById('body-svg');
        const fatVal = document.getElementById('fat-percentage-value');

        if (!fatVal || !bodyPath) return;

        // Розрахунок відсотка жиру
        let fat = (1.20 * bmi) + (0.23 * age) - 16.2;
        if (fat < 3) fat = 3;
        fatVal.textContent = fat.toFixed(1) + "%";

        // Трансформація голограми
        let scaleX = 1 + (bmi - 22) * 0.03;
        if (scaleX > 1.4) scaleX = 1.4;
        if (scaleX < 0.7) scaleX = 0.7;

        bodyPath.style.transform = `scaleX(${scaleX})`;

        // Окрас голограми
        if (bmi > 25) {
            bodyPath.style.fill = "rgba(218, 62, 82, 0.3)";
            bodyPath.style.stroke = "#DA3E52";
            bodyPath.style.filter = "drop-shadow(0 0 15px rgba(218, 62, 82, 0.6))";
        } else {
            bodyPath.style.fill = "rgba(255, 199, 44, 0.2)";
            bodyPath.style.stroke = "#FFC72C";
            bodyPath.style.filter = "drop-shadow(0 0 15px rgba(255, 199, 44, 0.8))";
        }
    }

    // --- 2. ПЕРЕВІРКА ЗАПИСУ ---
    async function checkDailyEntry() {
        const today = new Date().toISOString().split('T')[0];
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .where("date", "==", today)
            .orderBy("timestamp", "desc").limit(1).get();

        const userDoc = await db.collection(COLL_USERS).doc(currentUserId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        if (!snap.empty) {
            const formCard = document.querySelector('.form-card');
            if (formCard) formCard.style.display = 'none';
            
            const todayData = snap.docs[0].data();
            if (userData && userData.height) {
                displayBMIResult(todayData.weight, userData.height, userData.age || 25);
            }
        }
    }

    // --- 3. ЗАВАНТАЖЕННЯ ПРОФІЛЮ ---
    async function loadUserProfile() {
        if (!window.db) return;
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
        }
    }

    // --- 4. ЗБЕРЕЖЕННЯ ---
    const weightForm = document.getElementById('weight-form');
    if (weightForm) {
        weightForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const w = parseFloat(document.getElementById('weight-value').value);
            const h = parseFloat(document.getElementById('user-height').value);
            const a = parseInt(document.getElementById('user-age').value);
            const today = new Date().toISOString().split('T')[0];

            try {
                await db.collection(COLL_HISTORY).add({
                    userId: currentUserId, weight: w, date: today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection(COLL_USERS).doc(currentUserId).set({
                    height: h, age: a, lastWeight: w
                }, { merge: true });

                location.reload(); 
            } catch (err) { alert("Помилка: " + err.message); }
        });
    }

    // --- 5. ГРАФІК ---
    async function initWeightChart() {
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc").limit(14).get();

        const labels = [], values = [];
        snap.forEach(d => {
            labels.push(d.data().date.split('-').slice(1).join('/'));
            values.push(d.data().weight);
        });

        const ctx = document.getElementById('weightChart');
        if (ctx && labels.length > 0) {
            if (weightChartInstance) weightChartInstance.destroy();
            weightChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Вага (кг)',
                        data: values,
                        borderColor: '#FFC72C',
                        backgroundColor: 'rgba(255, 199, 44, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { ticks: { color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: '#666' }, grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }
})();
