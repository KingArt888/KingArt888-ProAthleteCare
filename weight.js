(function() {
    // Константи Firestore
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    
    let currentUserId = null;
    let weightChartInstance = null;

    // Пряме посилання на ваш файл з GitHub
    const BODY_IMAGE_URL = "https://raw.githubusercontent.com/KingArt888/ProAthleteCare/main/human_body_outline.png";

    // Слідкуємо за авторизацією
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            
            // Встановлюємо картинку при завантаженні
            const imgElement = document.getElementById('body-hologram-img');
            if (imgElement) imgElement.src = BODY_IMAGE_URL;

            await loadUserProfile();
            await checkDailyEntry();
            await initWeightChart();
        } else {
            console.log("Користувач не авторизований");
        }
    });

    // 1. Завантаження даних профілю (зріст, вік)
    async function loadUserProfile() {
        try {
            const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.height) document.getElementById('user-height').value = data.height;
                if (data.age) document.getElementById('user-age').value = data.age;
            }
        } catch (e) { console.error("Помилка профілю:", e); }
    }

    // 2. Перевірка останнього запису ваги
    async function checkDailyEntry() {
        try {
            const snap = await db.collection(COLL_HISTORY)
                .where("userId", "==", currentUserId)
                .orderBy("date", "desc")
                .limit(1)
                .get();

            if (!snap.empty) {
                const lastEntry = snap.docs[0].data();
                const h = document.getElementById('user-height').value;
                const a = document.getElementById('user-age').value;
                
                // Оновлюємо візуал на основі останніх даних
                updateInterface(lastEntry.weight, h, a);
            }
        } catch (e) { console.error("Помилка завантаження ваги:", e); }
    }

    // 3. Оновлення інтерфейсу (Голограма + ІМТ + Дієта)
    function updateInterface(weight, height, age) {
        if (!weight || !height) return;

        // Розрахунок ІМТ
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        // Розрахунок % жиру (Формула Deurenberg)
        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(2, fat).toFixed(1) + "%";

        // ТРАНСФОРМАЦІЯ ГОЛОГРАМИ
        const img = document.getElementById('body-hologram-img');
        if (img) {
            // scaleX змінюється відносно норми (BMI 22)
            let scaleX = 1 + (bmi - 22) * 0.035;
            scaleX = Math.min(1.4, Math.max(0.7, scaleX)); // Ліміти, щоб не зламати картинку
            img.style.transform = `scaleX(${scaleX})`;
        }

        // ОНОВЛЕННЯ ДІЄТИ ТА СТАТУСУ
        const dietBox = document.getElementById('diet-plan-content');
        const statusText = document.getElementById('bmi-status-text');
        
        let dietHTML = "";
        if (bmi < 18.5) {
            statusText.textContent = "(Дефіцит ваги)";
            dietHTML = `<strong>Ціль: Профіцит калорій</strong>
                <ul class="diet-list">
                    <li>Збільште порції складних вуглеводів</li>
                    <li>Додайте корисні жири (горіхи, масла)</li>
                    <li>Білок: 1.6 - 2г на кг маси</li>
                </ul>`;
        } else if (bmi < 25) {
            statusText.textContent = "(Нормальна вага)";
            dietHTML = `<strong>Ціль: Підтримка рельєфу</strong>
                <ul class="diet-list">
                    <li>Збалансоване харчування 4-5 разів на день</li>
                    <li>Контроль гідратації (30мл на кг)</li>
                    <li>Фокус на якості продуктів</li>
                </ul>`;
        } else {
            statusText.textContent = "(Надмірна вага)";
            dietHTML = `<strong>Ціль: Жироспалювання</strong>
                <ul class="diet-list">
                    <li>Дефіцит калорій 10-15%</li>
                    <li>Мінімум цукру та білого борошна</li>
                    <li>Більше клітковини (овочі, висівки)</li>
                </ul>`;
        }
        if(dietBox) dietBox.innerHTML = dietHTML;
    }

    // 4. Обробка форми запису
    document.getElementById('weight-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        const today = new Date().toISOString().split('T')[0];

        try {
            const btn = document.getElementById('submit-btn');
            btn.disabled = true;
            btn.textContent = "Зберігаю...";

            // Запис в історію
            await db.collection(COLL_HISTORY).add({
                userId: currentUserId,
                weight: w,
                date: today,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Оновлення профілю користувача
            await db.collection(COLL_USERS).doc(currentUserId).set({
                height: h,
                age: a
            }, { merge: true });

            location.reload(); // Перезавантаження для оновлення графіка
        } catch (err) {
            alert("Помилка збереження!");
            console.error(err);
        }
    });

    // 5. Графік історії ваги
    async function initWeightChart() {
        try {
            const snap = await db.collection(COLL_HISTORY)
                .where("userId", "==", currentUserId)
                .orderBy("date", "asc")
                .limit(10)
                .get();
            
            const labels = [], weights = [];
            snap.forEach(doc => {
                labels.push(doc.data().date.slice(5)); // Місяць-День
                weights.push(doc.data().weight);
            });

            const ctx = document.getElementById('weightChart').getContext('2d');
            if (weightChartInstance) weightChartInstance.destroy();

            weightChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Вага (кг)',
                        data: weights,
                        borderColor: '#FFC72C',
                        backgroundColor: 'rgba(255, 199, 44, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: '#222' }, ticks: { color: '#555' } },
                        x: { grid: { display: false }, ticks: { color: '#555' } }
                    }
                }
            });
        } catch (e) { console.error("Помилка графіка:", e); }
    }
})();
