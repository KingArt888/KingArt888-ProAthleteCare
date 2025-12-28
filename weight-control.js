(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await loadStaticData(); // Завантажуємо зріст та вік
            await checkDailyLimit(); // Блокування кнопки
            await loadHistoryAndChart(); // Графік
        }
    });

    // Завантаження збережених параметрів (Зріст/Вік)
    async function loadStaticData() {
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
            if (data.lastWeight) performAnalysis(data.lastWeight, data.height);
        }
    }

    // Аналіз BMI та рекомендації
    function performAnalysis(weight, height) {
        const bmi = (weight / ((height/100) ** 2)).toFixed(1);
        const panel = document.getElementById('bmi-result-panel');
        const valueEl = document.getElementById('bmi-value');
        const statusEl = document.getElementById('bmi-status');
        const adviceEl = document.getElementById('nutrition-advice');

        panel.style.display = 'block';
        valueEl.textContent = bmi;

        if (bmi < 18.5) {
            statusEl.textContent = "Недостатня вага ⚠️";
            statusEl.style.color = "#FFD700";
            adviceEl.textContent = "Вашому організму потрібно більше енергії. Рекомендовано профіцит калорій (+10-15%) та збільшення білків.";
        } else if (bmi < 25) {
            statusEl.textContent = "Вага в нормі ✅";
            statusEl.style.color = "#4CAF50";
            adviceEl.textContent = "Чудовий результат! Підтримуйте поточний рівень активності та збалансоване харчування.";
        } else {
            statusEl.textContent = "Weight Loss (Надмірна вага) 📉";
            statusEl.style.color = "#DA3E52";
            adviceEl.textContent = "Рекомендовано помірний дефіцит калорій (15-20%) та контроль вуглеводів. Перегляньте наші рецепти для схуднення.";
        }
    }

    // Перевірка на "раз на день"
    async function checkDailyLimit() {
        const today = new Date().toISOString().split('T')[0];
        const snapshot = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .where("date", "==", today)
            .get();

        if (!snapshot.empty) {
            const btn = document.getElementById('submit-btn');
            btn.disabled = true;
            btn.textContent = "Сьогодні вагу вже записано";
            btn.classList.add('disabled-button'); // Використовуємо ваш стиль з CSS
        }
    }

    document.getElementById('weight-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const weight = parseFloat(document.getElementById('weight-value').value);
        const height = parseFloat(document.getElementById('user-height').value);
        const age = parseInt(document.getElementById('user-age').value);
        const today = new Date().toISOString().split('T')[0];

        try {
            // Зберігаємо історію
            await db.collection(COLL_HISTORY).add({
                userId: currentUserId,
                weight: weight,
                date: today,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Запам'ятовуємо параметри в профілі користувача
            await db.collection(COLL_USERS).doc(currentUserId).set({
                height: height,
                age: age,
                lastWeight: weight
            }, { merge: true });

            alert("Дані збережено! Аналіз оновлено.");
            location.reload();
        } catch (err) {
            alert("Помилка: " + err.message);
        }
    });

    async function loadHistoryAndChart() {
        const snapshot = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc")
            .limit(14)
            .get();

        const labels = [], values = [];
        snapshot.forEach(doc => {
            labels.push(doc.data().date.split('-').slice(1).join('/'));
            values.push(doc.data().weight);
        });
        
        const ctx = document.getElementById('weightChart').getContext('2d');
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
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
})();
