(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    // --- 1. АВТОРИЗАЦІЯ ТА НАЛАШТУВАННЯ КНОПКИ ---
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            
            // Робимо кнопку маленькою через JS (не чіпаючи CSS)
            const btn = document.getElementById('submit-btn');
            if (btn) {
                btn.style.width = 'auto';
                btn.style.padding = '6px 15px';
                btn.style.fontSize = '0.85em';
                btn.style.borderRadius = '20px';
                btn.style.margin = '10px auto 0';
                btn.style.display = 'block';
            }

            await loadUserProfile(); // Підтягуємо зріст/вік
            await checkDailyEntry(); // Перевіряємо ліміт на день
            await initWeightChart(); // Малюємо графік
        } else {
            await firebase.auth().signInAnonymously();
        }
    });

    // --- 2. ЗАВАНТАЖЕННЯ ПАРАМЕТРІВ (Зріст/Вік) ---
    async function loadUserProfile() {
        if (!window.db) return;
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            // Запам'ятовуємо зріст та вік
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
            
            // Якщо є остання вага, одразу показуємо аналітику BMI
            if (data.lastWeight && data.height) {
                calculateBMI(data.lastWeight, data.height);
            }
        }
    }

    // --- 3. РОЗРАХУНОК BMI ТА РЕКОМЕНДАЦІЇ ---
    function calculateBMI(w, h) {
        const bmi = (w / ((h/100) ** 2)).toFixed(1);
        const bmiVal = document.getElementById('bmi-value');
        const bmiStatus = document.getElementById('bmi-status');
        const advice = document.getElementById('nutrition-advice');
        const panel = document.getElementById('bmi-result-panel');

        if (!panel) return;
        panel.style.display = 'block';
        bmiVal.textContent = bmi;

        if (bmi < 18.5) {
            bmiStatus.textContent = "Недостатня вага ⚠️";
            bmiStatus.style.color = "#FFD700"; // Золотий
            advice.textContent = "Потрібен профіцит калорій. Рекомендуємо отримати рецепти для набору маси.";
        } else if (bmi < 25) {
            bmiStatus.textContent = "Норма ✅";
            bmiStatus.style.color = "#4CAF50"; // Зелений
            advice.textContent = "Ваша вага в нормі. Підтримуйте поточний режим харчування.";
        } else {
            bmiStatus.textContent = "WEIGHT LOSS (Надмірна вага) 📉";
            bmiStatus.style.color = "#DA3E52"; // Червоний
            advice.textContent = "Рекомендовано дефіцит калорій. Натисніть кнопку нижче для перегляду дієтичних рецептів.";
        }
    }

    // --- 4. ОБМЕЖЕННЯ (1 РАЗ НА ДЕНЬ) ---
    async function checkDailyEntry() {
        const today = new Date().toISOString().split('T')[0];
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .where("date", "==", today).get();

        if (!snap.empty) {
            const btn = document.getElementById('submit-btn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = "Записано";
                btn.classList.add('disabled-button'); // Використовуємо ваш клас
            }
        }
    }

    // --- 5. ЗБЕРЕЖЕННЯ ДАНИХ ---
    const weightForm = document.getElementById('weight-form');
    if (weightForm) {
        weightForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const w = parseFloat(document.getElementById('weight-value').value);
            const h = parseFloat(document.getElementById('user-height').value);
            const a = parseInt(document.getElementById('user-age').value);
            const today = new Date().toISOString().split('T')[0];

            try {
                // Записуємо в історію
                await db.collection(COLL_HISTORY).add({
                    userId: currentUserId,
                    weight: w,
                    date: today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Оновлюємо сталі параметри в профілі
                await db.collection(COLL_USERS).doc(currentUserId).set({
                    height: h,
                    age: a,
                    lastWeight: w
                }, { merge: true });

                alert("Дані збережено!");
                location.reload();
            } catch (err) {
                alert("Помилка: " + err.message);
            }
        });
    }

    // --- 6. ГРАФІК (ЗОЛОТИЙ СТИЛЬ) ---
    async function initWeightChart() {
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc").limit(12).get();

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
                        label: 'Вага',
                        data: values,
                        borderColor: 'rgb(255, 215, 0)', // GOLD
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: '#888' }, grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }
})();
