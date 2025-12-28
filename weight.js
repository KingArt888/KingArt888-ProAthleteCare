(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            
            // Налаштування маленької кнопки (не чіпаючи CSS)
            const btn = document.getElementById('submit-btn');
            if (btn) {
                btn.style.width = 'auto';
                btn.style.padding = '6px 15px';
                btn.style.fontSize = '0.85em';
                btn.style.borderRadius = '20px';
                btn.style.margin = '10px auto 0';
                btn.style.display = 'block';
            }

            await loadUserProfile(); 
            await checkDailyEntry(); // Тут основна логіка приховування та виводу BMI
            await initWeightChart(); 
            await loadWeightHistoryTable();
        } else {
            await firebase.auth().signInAnonymously();
        }
    });

    // --- 1. ФУНКЦІЯ РОЗРАХУНКУ ТА ВИВОДУ РЕЗУЛЬТАТУ ---
    function displayBMIResult(weight, height) {
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        
        const bmiValEl = document.getElementById('bmi-value');
        const bmiStatusEl = document.getElementById('bmi-status');
        const adviceEl = document.getElementById('nutrition-advice');
        const panel = document.getElementById('bmi-result-panel');

        if (!panel) return;
        
        panel.style.display = 'block'; // Показуємо панель
        bmiValEl.textContent = bmi; // Записуємо число замість 0

        if (bmi < 18.5) {
            bmiStatusEl.textContent = `Статус: Недостатня вага ⚠️`;
            bmiStatusEl.style.color = "#FFD700";
            adviceEl.textContent = "Рекомендовано: Профіцит калорій та збільшення білків.";
        } else if (bmi < 25) {
            bmiStatusEl.textContent = `Статус: Норма ✅`;
            bmiStatusEl.style.color = "#4CAF50";
            adviceEl.textContent = "Ваша вага в ідеальній нормі. Підтримуйте поточний режим.";
        } else {
            bmiStatusEl.textContent = `Статус: WEIGHT LOSS Needed 📉`;
            bmiStatusEl.style.color = "#DA3E52";
            adviceEl.textContent = "Рекомендовано: Дефіцит калорій та низьковуглеводні рецепти.";
        }
    }

    // --- 2. ПЕРЕВІРКА ЗАПИСУ ТА ПРИХОВУВАННЯ ФОРМИ ---
    async function checkDailyEntry() {
        const today = new Date().toISOString().split('T')[0];
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .where("date", "==", today)
            .orderBy("timestamp", "desc").limit(1).get();

        if (!snap.empty) {
            // Приховуємо вікно додавання ваги
            const formCard = document.querySelector('.form-card');
            if (formCard) formCard.style.display = 'none';
            
            // Отримуємо дані для BMI (вага з сьогоднішнього запису + зріст з профілю)
            const todayData = snap.docs[0].data();
            const userDoc = await db.collection(COLL_USERS).doc(currentUserId).get();
            
            if (userDoc.exists && userDoc.data().height) {
                // ВИКЛИКАЄМО РЕЗУЛЬТАТ (замість нулів)
                displayBMIResult(todayData.weight, userDoc.data().height);
            }
        }
    }

    async function loadUserProfile() {
        if (!window.db) return;
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
        }
    }

    // --- 3. ТАБЛИЦЯ ІСТОРІЇ ПІД ГРАФІКОМ ---
    async function loadWeightHistoryTable() {
        const container = document.getElementById('weight-history-list');
        if (!container) return;

        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "desc").limit(10).get();

        let tableHtml = `<table style="width:100%; color:#888; border-collapse:collapse; margin-top:20px;">
            <tr style="border-bottom:1px solid #333; color:#FFC72C; font-size:0.8em; text-transform:uppercase;">
                <th style="text-align:left; padding:10px;">Дата</th>
                <th style="text-align:right; padding:10px;">Вага</th>
            </tr>`;
        
        snap.forEach(doc => {
            const d = doc.data();
            tableHtml += `<tr style="border-bottom:1px solid #111;">
                <td style="padding:10px;">${d.date}</td>
                <td style="text-align:right; padding:10px; color:#fff;">${d.weight} кг</td>
            </tr>`;
        });
        tableHtml += `</table>`;
        container.innerHTML = tableHtml;
    }

    // --- 4. ЗБЕРЕЖЕННЯ ---
    const form = document.getElementById('weight-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
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

                location.reload(); 
            } catch (err) { alert(err.message); }
        });
    }

    // --- 5. ГРАФІК ---
    async function initWeightChart() {
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc").limit(14).get();

        const labels = [], data = [];
        snap.forEach(d => {
            labels.push(d.data().date.split('-').slice(1).join('/'));
            data.push(d.data().weight);
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
                    scales: {
                        y: { ticks: { color: '#666' }, grid: { color: '#1a1a1a' } },
                        x: { ticks: { color: '#666' }, grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }
})();
