(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            
            await loadUserProfile(); 
            await checkDailyEntry(); // Приховує форму та показує результат
            await initWeightChart(); 
        } else {
            await firebase.auth().signInAnonymously();
        }
    });

    // --- 1. РОЗРАХУНОК ТА ВИВІД BMI (ЗАМІСТЬ НУЛІВ) ---
    function displayBMIResult(weight, height) {
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        
        const bmiValEl = document.getElementById('bmi-value');
        const bmiStatusEl = document.getElementById('bmi-status');
        const adviceEl = document.getElementById('nutrition-advice');
        const card = document.getElementById('bmi-result-card');

        if (!card) return;

        // Вставляємо реальне число BMI
        bmiValEl.textContent = bmi;

        // Налаштовуємо статус та колір залежно від результату
        if (bmi < 18.5) {
            bmiStatusEl.textContent = "Недостатня вага";
            card.style.borderLeft = "5px solid #FFD700"; // Золотий
            adviceEl.textContent = "Рекомендовано: Збільшити калорійність раціону та силові тренування.";
        } else if (bmi < 25) {
            bmiStatusEl.textContent = "Норма";
            card.style.borderLeft = "5px solid #4CAF50"; // Зелений
            adviceEl.textContent = "Ваш показник в нормі. Продовжуйте підтримувати поточний режим.";
        } else {
            bmiStatusEl.textContent = "Weight Loss Needed";
            card.style.borderLeft = "5px solid #DA3E52"; // Червоний
            adviceEl.textContent = "Рекомендовано: Дефіцит калорій та перегляд плану харчування.";
        }
        
        // Показуємо кнопку рецептів, якщо вона була прихована
        const recipeBtn = document.getElementById('recipe-link-container');
        if (recipeBtn) recipeBtn.style.display = 'block';
    }

    // --- 2. ПЕРЕВІРКА: ПРИХОВАТИ ВІКНО ВАГИ ТА ПОКАЗАТИ РЕЗУЛЬТАТ ---
    async function checkDailyEntry() {
        const today = new Date().toISOString().split('T')[0];
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .where("date", "==", today)
            .orderBy("timestamp", "desc").limit(1).get();

        if (!snap.empty) {
            // ПРИХОВУЄМО форму (form-card), щоб не займала місце
            const formCard = document.querySelector('.form-card');
            if (formCard) formCard.style.display = 'none';
            
            // Отримуємо сьогоднішню вагу та зріст з профілю для виводу BMI
            const todayData = snap.docs[0].data();
            const userDoc = await db.collection(COLL_USERS).doc(currentUserId).get();
            
            if (userDoc.exists && userDoc.data().height) {
                // ТЕПЕР ТУТ З'ЯВЛЯЄТЬСЯ РЕЗУЛЬТАТ ЗАМІСТЬ 0.0
                displayBMIResult(todayData.weight, userDoc.data().height);
            }
        }
    }

    // --- 3. ЗАВАНТАЖЕННЯ ДАНИХ КОРИСТУВАЧА ---
    async function loadUserProfile() {
        if (!window.db) return;
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
        }
    }

    // --- 4. ОБРОБКА ФОРМИ ТА ЗБЕРЕЖЕННЯ ---
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
                    userId: currentUserId,
                    weight: w,
                    date: today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection(COLL_USERS).doc(currentUserId).set({
                    height: h, age: a, lastWeight: w
                }, { merge: true });

                location.reload(); // Перезавантаження активує checkDailyEntry()
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
