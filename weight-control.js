(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await loadUserData(); // Завантажуємо зріст/вік
            await checkTodayEntry(); // Перевіряємо, чи вже важився
            await loadWeightHistory(); // Будуємо графік
        }
    });

    // Завантаження збережених даних користувача (Зріст, Вік)
    async function loadUserData() {
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
            if (data.lastWeight) calculateBMI(data.lastWeight, data.height);
        }
    }

    // Перевірка, чи був запис сьогодні
    async function checkTodayEntry() {
        const today = new Date().toISOString().split('T')[0];
        const snapshot = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .where("date", "==", today)
            .get();

        if (!snapshot.empty) {
            const btn = document.getElementById('submit-btn');
            btn.disabled = true;
            btn.textContent = "Сьогодні вагу вже записано";
            btn.classList.add('disabled-button');
        }
    }

    function calculateBMI(weight, height) {
        const hMeter = height / 100;
        const bmi = (weight / (hMeter * hMeter)).toFixed(1);
        const bmiValEl = document.getElementById('bmi-value');
        const bmiStatusEl = document.getElementById('bmi-status');
        const adviceEl = document.getElementById('nutrition-advice');
        const recipeBtn = document.getElementById('recipe-link-container');

        bmiValEl.textContent = bmi;
        recipeBtn.style.display = 'block';

        if (bmi < 18.5) {
            bmiStatusEl.textContent = "Недостатня вага";
            bmiStatusEl.style.color = "#FFD700";
            adviceEl.textContent = "Рекомендовано: Профіцит калорій. Збільште споживання білків та складних вуглеводів.";
        } else if (bmi < 25) {
            bmiStatusEl.textContent = "Норма";
            bmiStatusEl.style.color = "#4CAF50";
            adviceEl.textContent = "Рекомендовано: Підтримка ваги. Збалансоване харчування.";
        } else {
            bmiStatusEl.textContent = "Weight Loss (Надмірна вага)";
            bmiStatusEl.style.color = "#DA3E52";
            adviceEl.textContent = "Рекомендовано: Дефіцит калорій. Оберіть низьковуглеводні рецепти та кардіо.";
        }
    }

    document.getElementById('weight-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const weight = parseFloat(document.getElementById('weight-value').value);
        const height = parseFloat(document.getElementById('user-height').value);
        const age = parseInt(document.getElementById('user-age').value);
        const today = new Date().toISOString().split('T')[0];

        try {
            // 1. Зберігаємо історію ваги
            await db.collection(COLL_HISTORY).add({
                userId: currentUserId,
                weight: weight,
                date: today,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Оновлюємо профіль користувача (зріст/вік)
            await db.collection(COLL_USERS).doc(currentUserId).set({
                height: height,
                age: age,
                lastWeight: weight
            }, { merge: true });

            alert("Дані успішно оновлено!");
            location.reload();
        } catch (err) {
            alert("Помилка: " + err.message);
        }
    });

    async function loadWeightHistory() {
        const snapshot = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc")
            .limit(14)
            .get();

        const labels = [];
        const data = [];
        snapshot.forEach(doc => {
            labels.push(doc.data().date.split('-').slice(1).join('/'));
            data.push(doc.data().weight);
        });
        renderChart(labels, data);
    }

    function renderChart(labels, data) {
        const ctx = document.getElementById('weightChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Вага (кг)',
                    data: data,
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
