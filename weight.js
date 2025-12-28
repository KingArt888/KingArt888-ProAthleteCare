(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    // --- 1. ІНІЦІАЛІЗАЦІЯ ТА СТИЛІ КНОПКИ ---
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            
            // Стилізація кнопки прямо через JS для компактності
            const btn = document.getElementById('submit-btn');
            if (btn) {
                btn.style.width = 'auto';
                btn.style.padding = '8px 20px';
                btn.style.fontSize = '0.9em';
                btn.style.borderRadius = '20px';
                btn.style.margin = '15px auto 0';
                btn.style.display = 'block';
            }

            await loadUserData(); 
            await checkDailyLimit(); 
            await loadWeightChart(); 
        } else {
            await firebase.auth().signInAnonymously();
        }
    });

    // --- 2. ЗАВАНТАЖЕННЯ ПАРАМЕТРІВ (Зріст/Вік) ---
    async function loadUserData() {
        if (!window.db) return;
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            // Наступного разу графа вже записана, але можна редагувати
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
            
            // Якщо є дані, показуємо аналіз BMI
            if (data.lastWeight && data.height) {
                updateBMIAnalysis(data.lastWeight, data.height);
            }
        }
    }

    // --- 3. РОЗРАХУНОК BMI ТА РЕКОМЕНДАЦІЇ ---
    function updateBMIAnalysis(weight, height) {
        const bmi = (weight / ((height/100) ** 2)).toFixed(1);
        const bmiValue = document.getElementById('bmi-value');
        const bmiStatus = document.getElementById('bmi-status');
        const advice = document.getElementById('nutrition-advice');
        const panel = document.getElementById('bmi-result-panel');

        if (!panel) return;
        panel.style.display = 'block';
        bmiValue.textContent = bmi;

        if (bmi < 18.5) {
            bmiStatus.textContent = "Недостатня вага ⚠️";
            bmiStatus.style.color = "#FFD700"; // Золотий
            advice.textContent = "Рекомендовано: Профіцит калорій. Збільште споживання білків та складних вуглеводів.";
        } else if (bmi < 25) {
            bmiStatus.textContent = "В нормі ✅";
            bmiStatus.style.color = "#4CAF50"; // Зелений
            advice.textContent = "Ваша вага в ідеальному діапазоні. Продовжуйте збалансоване харчування.";
        } else {
            bmiStatus.textContent = "WEIGHT LOSS (Надмірна вага) 📉";
            bmiStatus.style.color = "#DA3E52"; // Червоний (з вашого CSS)
            advice.textContent = "Рекомендовано: Дефіцит калорій. Перегляньте рецепти з низьким вмістом жирів.";
        }
    }

    // --- 4. ОБМЕЖЕННЯ ЗАПИСУ (1 раз на день) ---
    async function checkDailyLimit() {
        const today = new Date().toISOString().split('T')[0];
        const snapshot = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .where("date", "==", today)
            .get();

        if (!snapshot.empty) {
            const btn = document.getElementById('submit-btn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = "Записано сьогодні";
                btn.style.opacity = "0.6";
                btn.style.cursor = "not-allowed";
                btn.classList.add('disabled-button'); // Використовуємо клас з CSS
            }
        }
    }

    // --- 5. ЗБЕРЕЖЕННЯ ДАНИХ ---
    const form = document.getElementById('weight-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const w = parseFloat(document.getElementById('weight-value').value);
            const h = parseFloat(document.getElementById('user-height').value);
            const a = parseInt(document.getElementById('user-age').value);
            const today = new Date().toISOString().split('T')[0];

            try {
                // Зберігаємо в історію
                await db.collection(COLL_HISTORY).add({
                    userId: currentUserId,
                    weight: w,
                    date: today,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Оновлюємо профіль (merge: true щоб не затерти інше)
                await db.collection(COLL_USERS).doc(currentUserId).set({
                    height: h,
                    age: a,
                    lastWeight: w
                }, { merge: true });

                alert("Дані успішно збережені!");
                location.reload();
            } catch (err) {
                alert("Помилка: " + err.message);
            }
        });
    }

    // --- 6. ГРАФІК ВАГИ ---
    async function loadWeightChart() {
        const snapshot = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc")
            .limit(10)
            .get();

        const labels = [], data = [];
        snapshot.forEach(doc => {
            labels.push(doc.data().date.split('-').slice(1).join('/'));
            data.push(doc.data().weight);
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
                        data: data,
                        borderColor: 'rgb(255, 215, 0)', // GOLD_COLOR
                        backgroundColor: 'rgba(255, 215, 0, 0.2)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                        x: { ticks: { color: '#888' } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }
})();
