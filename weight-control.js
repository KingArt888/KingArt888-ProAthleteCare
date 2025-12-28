(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    // --- 1. АВТОРИЗАЦІЯ ТА ЗАПУСК ---
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("Weight Control: Авторизовано як", currentUserId);
            
            await loadStaticData(); // Завантажуємо зріст, вік та показуємо аналіз
            await checkDailyLimit(); // Блокуємо кнопку, якщо запис вже є
            await loadHistoryAndChart(); // Малюємо графік
        } else {
            // Якщо не залогінений, входимо анонімно (як у wellness.js)
            await firebase.auth().signInAnonymously();
        }
    });

    // --- 2. ЗАВАНТАЖЕННЯ ДАНИХ КОРИСТУВАЧА (Зріст/Вік) ---
    async function loadStaticData() {
        if (!window.db) return;
        try {
            const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
            if (doc.exists) {
                const data = doc.data();
                // Заповнюємо поля, щоб користувач не вводив їх знову
                if (data.height) document.getElementById('user-height').value = data.height;
                if (data.age) document.getElementById('user-age').value = data.age;
                
                // Якщо є остання вага, одразу робимо аналіз
                if (data.lastWeight && data.height) {
                    performAnalysis(data.lastWeight, data.height);
                }
            }
        } catch (e) {
            console.error("Помилка завантаження профілю:", e);
        }
    }

    // --- 3. BMI КАЛЬКУЛЯТОР ТА РЕКОМЕНДАЦІЇ ---
    function performAnalysis(weight, height) {
        const bmi = (weight / ((height/100) ** 2)).toFixed(1);
        const panel = document.getElementById('bmi-result-panel');
        const valueEl = document.getElementById('bmi-value');
        const statusEl = document.getElementById('bmi-status');
        const adviceEl = document.getElementById('nutrition-advice');

        if (!panel) return;
        panel.style.display = 'block';
        valueEl.textContent = bmi;

        // Логіка статусів та кольорів
        if (bmi < 18.5) {
            statusEl.textContent = "Недостатня вага ⚠️";
            statusEl.style.color = "#FFD700"; // Золотий
            adviceEl.textContent = "Вашому організму потрібно більше енергії. Рекомендовано профіцит калорій та збільшення білків у раціоні.";
        } else if (bmi < 25) {
            statusEl.textContent = "Вага в нормі ✅";
            statusEl.style.color = "#4CAF50"; // Зелений
            adviceEl.textContent = "Чудовий результат! Підтримуйте поточний рівень активності та збалансоване харчування.";
        } else {
            statusEl.textContent = "Weight Loss (Надмірна вага) 📉";
            statusEl.style.color = "#DA3E52"; // Червоний
            adviceEl.textContent = "Рекомендовано помірний дефіцит калорій та контроль вуглеводів. Оберіть рецепти з низьким вмістом жирів.";
        }
    }

    // --- 4. ПЕРЕВІРКА ОБМЕЖЕННЯ (Раз на день) ---
    async function checkDailyLimit() {
        const today = new Date().toISOString().split('T')[0];
        try {
            const snapshot = await db.collection(COLL_HISTORY)
                .where("userId", "==", currentUserId)
                .where("date", "==", today)
                .get();

            if (!snapshot.empty) {
                const btn = document.getElementById('submit-btn');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = "Сьогодні вагу вже записано";
                    btn.classList.add('disabled-button'); // Стиль із wellness.css
                }
            }
        } catch (e) {
            console.error("Помилка перевірки ліміту:", e);
        }
    }

    // --- 5. ОБРОБКА ФОРМИ ТА ЗБЕРЕЖЕННЯ ---
    const form = document.getElementById('weight-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const weight = parseFloat(document.getElementById('weight-value').value);
            const height = parseFloat(document.getElementById('user-height').value);
            const age = parseInt(document.getElementById('user-age').value);
            const today = new Date().toISOString().split('T')[0];

            if (!weight || !height) return alert("Будь ласка, заповніть усі поля!");

            try {
                // Зберігаємо запис в історію
                await db.collection(COLL_HISTORY).add({
                    userId: currentUserId,
                    weight: weight,
                    date: today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Оновлюємо "постійні" дані в профілі користувача
                await db.collection(COLL_USERS).doc(currentUserId).set({
                    height: height,
                    age: age,
                    lastWeight: weight
                }, { merge: true });

                alert("Дані збережено та проаналізовано!");
                location.reload(); 
            } catch (err) {
                alert("Помилка при збереженні: " + err.message);
            }
        });
    }

    // --- 6. ГРАФІК ДИНАМІКИ ВАГИ ---
    async function loadHistoryAndChart() {
        if (!window.db) return;
        try {
            const snapshot = await db.collection(COLL_HISTORY)
                .where("userId", "==", currentUserId)
                .orderBy("date", "asc")
                .limit(14) // Останні 14 записів
                .get();

            const labels = [];
            const values = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                labels.push(data.date.split('-').slice(1).join('/')); // Формат MM/DD
                values.push(data.weight);
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
                            borderColor: '#FFC72C', // Золотий
                            backgroundColor: 'rgba(255, 199, 44, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            x: { ticks: { color: '#888' }, grid: { display: false } }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }
        } catch (e) {
            console.error("Помилка побудови графіка:", e);
        }
    }
})();
