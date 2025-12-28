(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    // --- 1. АВТОРИЗАЦІЯ ТА СТИЛЬ КНОПКИ ---
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            
            const btn = document.getElementById('submit-btn');
            if (btn) {
                btn.style.width = 'auto'; // Маленька кнопка
                btn.style.padding = '6px 15px';
                btn.style.fontSize = '0.85em';
                btn.style.borderRadius = '20px';
                btn.style.margin = '10px auto 0';
                btn.style.display = 'block';
            }

            await loadUserProfile(); 
            await checkDailyEntry(); 
            await initWeightChart(); 
        } else {
            await firebase.auth().signInAnonymously();
        }
    });

    // --- 2. BMI: РОЗРАХУНОК ТА ВІДОБРАЖЕННЯ ---
    function updateBMIAnalysis(w, h) {
        // Розрахунок Body Mass Index: вага / (зріст у метрах)^2
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        
        const bmiVal = document.getElementById('bmi-value');
        const bmiStatus = document.getElementById('bmi-status');
        const advice = document.getElementById('nutrition-advice');
        const panel = document.getElementById('bmi-result-panel');

        if (!panel) return;
        panel.style.display = 'block';
        
        // Виводимо число BMI
        bmiVal.textContent = bmi; 

        if (bmi < 18.5) {
            bmiStatus.textContent = `BMI: ${bmi} — Недостатня вага ⚠️`;
            bmiStatus.style.color = "#FFD700"; // GOLD_COLOR
            advice.textContent = "Ваш ІМТ нижче норми. Рекомендується збільшити калорійність раціону.";
        } else if (bmi < 25) {
            bmiStatus.textContent = `BMI: ${bmi} — Норма ✅`;
            bmiStatus.style.color = "#4CAF50"; 
            advice.textContent = "Ідеальний показник. Підтримуйте поточний баланс БЖУ.";
        } else {
            // Використовуємо колір для Weight Loss з вашого CSS
            bmiStatus.textContent = `BMI: ${bmi} — Weight Loss Needed 📉`;
            bmiStatus.style.color = "#DA3E52"; 
            advice.textContent = "Ваш ІМТ вказує на надмірну вагу. Рекомендується дефіцит калорій.";
        }
    }

    // --- 3. ЗАВАНТАЖЕННЯ ДАНИХ (Зріст/Вік) ---
    async function loadUserProfile() {
        if (!window.db) return;
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
            
            // Якщо є зріст і вага, виводимо BMI
            if (data.lastWeight && data.height) {
                updateBMIAnalysis(data.lastWeight, data.height);
            }
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
                btn.classList.add('disabled-button'); // Клас з вашого CSS
            }
        }
    }

    // --- 5. ЗБЕРЕЖЕННЯ ---
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

                alert("Дані збережено!");
                location.reload();
            } catch (err) { alert(err.message); }
        });
    }

    // --- 6. ГРАФІК ---
    async function initWeightChart() {
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc").limit(10).get();

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
                        borderColor: 'rgb(255, 215, 0)', // GOLD_COLOR
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
