(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await loadUserProfile();
            await initWeightChart();
            await checkDailyEntry();
        } else {
            await firebase.auth().signInAnonymously();
        }
    });

    // 1. Завантаження даних профілю
    async function loadUserProfile() {
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
        }
    }

    // 2. Перевірка сьогоднішнього запису та оновлення візуалу
    async function checkDailyEntry() {
        const today = new Date().toISOString().split('T')[0];
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "desc").limit(1).get();

        if (!snap.empty) {
            const lastEntry = snap.docs[0].data();
            const h = document.getElementById('user-height').value;
            const a = document.getElementById('user-age').value;
            
            updateBodyComposition(lastEntry.weight, h, a);
            
            if (lastEntry.date === today) {
                document.querySelector('.form-card').style.opacity = "0.5";
                document.getElementById('submit-btn').innerText = "Оновлено сьогодні";
            }
        }
    }

    // 3. Розрахунок композиції тіла та голограми
    function updateBodyComposition(weight, height, age) {
        if (!weight || !height) return;
        
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        // Формула % жиру (Deurenberg)
        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(2, fat).toFixed(1) + "%";

        // Трансформація голограми (зміна ширини)
        const bodyPath = document.getElementById('body-svg');
        let scaleX = 1 + (bmi - 22) * 0.04; // База BMI 22
        scaleX = Math.min(1.4, Math.max(0.7, scaleX));
        bodyPath.style.transform = `scaleX(${scaleX})`;

        // Статус та поради
        const status = document.getElementById('bmi-status');
        const advice = document.getElementById('nutrition-advice');
        if (bmi < 18.5) {
            status.textContent = "Deficit";
            advice.textContent = "Потребується профіцит калорій.";
        } else if (bmi < 25) {
            status.textContent = "Athlete Normal";
            advice.textContent = "Вага в ідеальній нормі.";
        } else {
            status.textContent = "Overweight";
            advice.textContent = "Рекомендовано контроль жирів.";
        }
    }

    // 4. Збереження історії
    document.getElementById('weight-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        const today = new Date().toISOString().split('T')[0];

        try {
            await db.collection(COLL_HISTORY).add({
                userId: currentUserId, weight: w, date: today, timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection(COLL_USERS).doc(currentUserId).set({ height: h, age: a }, { merge: true });
            location.reload();
        } catch (err) { console.error(err); }
    });

    // 5. Графік історії
    async function initWeightChart() {
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc").limit(10).get();

        const labels = [], data = [];
        snap.forEach(doc => {
            labels.push(doc.data().date.slice(5));
            data.push(doc.data().weight);
        });

        const ctx = document.getElementById('weightChart').getContext('2d');
        if (weightChartInstance) weightChartInstance.destroy();
        weightChartInstance = new Chart(ctx, {
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
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    x: { ticks: { color: '#666' } },
                    y: { ticks: { color: '#666' } }
                }
            }
        });
    }
})();
