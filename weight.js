(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await loadUserProfile();
            await checkDailyEntry(); // Викликаємо функцію, що оголошена нижче
            await initWeightChart();
        }
    });

    async function loadUserProfile() {
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
        }
    }

    // Головна функція розрахунків та візуалізації
    function updateInterface(weight, height, age) {
        if (!weight || !height) return;
        
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        // 1. Відсоток жиру
        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(3, fat).toFixed(1) + "%";

        // 2. Трансформація голограми (м'язи стають ширшими)
        const img = document.getElementById('body-hologram-img');
        if (img) {
            let scaleX = 1 + (bmi - 22) * 0.035;
            img.style.transform = `scaleX(${Math.min(1.4, Math.max(0.7, scaleX))})`;
        }

        // 3. Генерація дієти та рекомендацій
        const dietBox = document.getElementById('diet-plan-content');
        const statusText = document.getElementById('bmi-status-text');
        
        if (bmi < 18.5) {
            statusText.textContent = "(Дефіцит)";
            dietBox.innerHTML = `<strong>План: Набір маси</strong>
                <ul class="diet-list">
                    <li>Профіцит калорій (+300-500 ккал)</li>
                    <li>Білки: 2г/кг, Вуглеводи: 4-5г/кг</li>
                    <li>Силові тренування 3 рази на тиждень</li>
                </ul>`;
        } else if (bmi < 25) {
            statusText.textContent = "(Норма)";
            dietBox.innerHTML = `<strong>План: Підтримка рельєфу</strong>
                <ul class="diet-list">
                    <li>Баланс КБЖВ</li>
                    <li>Мінімум 2л води на день</li>
                    <li>Фокус на якісному сні та відновленні</li>
                </ul>`;
        } else {
            statusText.textContent = "(Надмірна вага)";
            dietBox.innerHTML = `<strong>План: Жироспалювання</strong>
                <ul class="diet-list">
                    <li>Дефіцит калорій (-15-20%)</li>
                    <li>Збільшити кількість овочів та клітковини</li>
                    <li>Кардіо 40 хв після силового тренування</li>
                </ul>`;
        }
    }

    async function checkDailyEntry() {
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId).orderBy("date", "desc").limit(1).get();
        if (!snap.empty) {
            const last = snap.docs[0].data();
            const h = document.getElementById('user-height').value;
            const a = document.getElementById('user-age').value;
            updateInterface(last.weight, h, a);
        }
    }

    document.getElementById('weight-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        const today = new Date().toISOString().split('T')[0];

        await db.collection(COLL_HISTORY).add({
            userId: currentUserId, weight: w, date: today, timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection(COLL_USERS).doc(currentUserId).set({ height: h, age: a }, { merge: true });
        location.reload();
    });

    async function initWeightChart() {
        const snap = await db.collection(COLL_HISTORY).where("userId", "==", currentUserId).orderBy("date", "asc").limit(10).get();
        const labels = [], data = [];
        snap.forEach(doc => { labels.push(doc.data().date.slice(5)); data.push(doc.data().weight); });

        const ctx = document.getElementById('weightChart').getContext('2d');
        if (weightChartInstance) weightChartInstance.destroy();
        weightChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    borderColor: '#FFC72C',
                    backgroundColor: 'rgba(255, 199, 44, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
})();
