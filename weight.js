(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            
            // Стилізація кнопки відправки
            const btn = document.getElementById('submit-btn');
            if (btn) {
                btn.style.width = 'auto';
                btn.style.padding = '6px 15px';
                btn.style.fontSize = '0.85em';
                btn.style.borderRadius = '20px';
                btn.style.display = 'block';
                btn.style.margin = '10px auto';
            }

            await loadUserProfile(); 
            await checkDailyEntry(); 
            await initWeightChart(); 
            await loadWeightHistoryTable(); // Завантаження історії під графіком
        } else {
            await firebase.auth().signInAnonymously();
        }
    });

    // --- 1. РОЗРАХУНОК ТА ВІДОБРАЖЕННЯ BODY MASS INDEX (ІМТ) ---
    function displayBMI(w, h) {
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const panel = document.getElementById('bmi-result-panel');
        const bmiValEl = document.getElementById('bmi-value');
        const bmiStatusEl = document.getElementById('bmi-status');
        const adviceEl = document.getElementById('nutrition-advice');

        if (!panel) return;
        
        panel.style.display = 'block';
        panel.style.borderLeft = "4px solid #FFC72C";
        bmiValEl.textContent = bmi;

        if (bmi < 18.5) {
            bmiStatusEl.textContent = `ІМТ: ${bmi} — Недостатня вага`;
            bmiStatusEl.style.color = "#FFD700";
            adviceEl.textContent = "Рекомендовано: Профіцит калорій та силові тренування.";
        } else if (bmi < 25) {
            bmiStatusEl.textContent = `ІМТ: ${bmi} — Норма`;
            bmiStatusEl.style.color = "#4CAF50";
            adviceEl.textContent = "Ваша вага в нормі. Підтримуйте поточний баланс харчування.";
        } else {
            bmiStatusEl.textContent = `ІМТ: ${bmi} — Weight Loss Needed`;
            bmiStatusEl.style.color = "#DA3E52";
            adviceEl.textContent = "Рекомендовано: Помірний дефіцит калорій та кардіо-навантаження.";
        }
    }

    // --- 2. ПЕРЕВІРКА ЗАПИСУ (ПРИХОВУВАННЯ ФОРМИ) ---
    async function checkDailyEntry() {
        const today = new Date().toISOString().split('T')[0];
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .where("date", "==", today).get();

        if (!snap.empty) {
            // ПРИХОВУЄМО форму, якщо запис вже є
            const formCard = document.querySelector('.form-card');
            if (formCard) formCard.style.display = 'none';
            
            // Розраховуємо BMI на основі останнього запису
            const lastData = snap.docs[0].data();
            const userDoc = await db.collection(COLL_USERS).doc(currentUserId).get();
            if (userDoc.exists && userDoc.data().height) {
                displayBMI(lastData.weight, userDoc.data().height);
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

    // --- 3. ІСТОРІЯ ЗАПИСІВ ПІД ГРАФІКОМ ---
    async function loadWeightHistoryTable() {
        const historyContainer = document.getElementById('weight-history-list'); // Має бути в HTML під графіком
        if (!historyContainer) return;

        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "desc").limit(7).get();

        let html = `<table style="width:100%; color:#ccc; border-collapse:collapse; margin-top:15px; font-size:0.9em;">
                    <tr style="border-bottom:1px solid #333; color:#FFC72C;">
                        <th style="text-align:left; padding:8px;">Дата</th>
                        <th style="text-align:right; padding:8px;">Вага</th>
                    </tr>`;
        
        snap.forEach(doc => {
            const d = doc.data();
            html += `<tr style="border-bottom:1px solid #1a1a1a;">
                        <td style="padding:8px;">${d.date}</td>
                        <td style="text-align:right; padding:8px;">${d.weight} кг</td>
                    </tr>`;
        });
        html += `</table>`;
        historyContainer.innerHTML = html;
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

                alert("Вагу успішно записано!");
                location.reload(); 
            } catch (err) { alert("Помилка: " + err.message); }
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
                        tension: 0.4,
                        pointRadius: 4
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
