(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await loadUserProfile();
            await checkDailyEntry();
            await initWeightChart();
        } else {
            window.location.href = 'login.html';
        }
    });

    async function loadUserProfile() {
        try {
            const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.height) document.getElementById('user-height').value = data.height;
                if (data.age) document.getElementById('user-age').value = data.age;
            }
        } catch (e) { console.error("Error loading profile:", e); }
    }

    async function checkDailyEntry() {
        try {
            const snap = await db.collection(COLL_HISTORY)
                .where("userId", "==", currentUserId)
                .orderBy("date", "desc").limit(1).get();
            if (!snap.empty) {
                const last = snap.docs[0].data();
                const h = document.getElementById('user-height').value;
                const a = document.getElementById('user-age').value;
                updateInterface(last.weight, h, a);
            }
        } catch (e) { console.error("Error checking entries:", e); }
    }

    function updateInterface(weight, height, age) {
        if (!weight || !height) return;

        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        // Розрахунок жиру
        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(3, fat).toFixed(1) + "%";

        // ЛОГІКА ГОЛОГРАМИ (SVG)
        const hologramGroup = document.getElementById('body-hologram-img');
        if (hologramGroup) {
            // Масштабування ширини
            let scaleX = 1 + (bmi - 22) * 0.035;
            scaleX = Math.min(1.4, Math.max(0.7, scaleX));
            
            hologramGroup.style.transition = "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)";
            hologramGroup.style.transformOrigin = "100px 250px";
            hologramGroup.style.transform = `scaleX(${scaleX})`;

            // Зміна кольору ліній залежно від стану здоров'я
            if (bmi < 17 || bmi > 30) {
                hologramGroup.style.stroke = "#DA3E52"; // Критичний стан (Червоний)
                hologramGroup.style.filter = "drop-shadow(0 0 10px #DA3E52)";
            } else if (bmi >= 25 && bmi <= 30) {
                hologramGroup.style.stroke = "#FFA500"; // Попередження (Помаранчевий)
                hologramGroup.style.filter = "drop-shadow(0 0 10px #FFA500)";
            } else {
                hologramGroup.style.stroke = "#FFC72C"; // Норма (Золотий)
                hologramGroup.style.filter = "url(#neon-glow)";
            }
        }

        // Оновлення блоку дієти
        const dietBox = document.getElementById('diet-plan-content');
        const statusText = document.getElementById('bmi-status-text');
        
        if (bmi < 18.5) {
            statusText.textContent = "(Дефіцит)";
            dietBox.innerHTML = `<strong>План: Гіпертрофія</strong>
                <ul class="diet-list">
                    <li>Калорійність: +20% від бази</li>
                    <li>Білки: 2.2г/кг для росту м'язів</li>
                    <li>Тренування: Силові, малі повтори</li>
                </ul>`;
        } else if (bmi < 25) {
            statusText.textContent = "(Норма)";
            dietBox.innerHTML = `<strong>План: Атлетизм</strong>
                <ul class="diet-list">
                    <li>Підтримка поточної ваги</li>
                    <li>Баланс мікроелементів (овочі/фрукти)</li>
                    <li>Тренування: Змішаний цикл</li>
                </ul>`;
        } else {
            statusText.textContent = "(Надмірна вага)";
            dietBox.innerHTML = `<strong>План: Рекомпозиція</strong>
                <ul class="diet-list">
                    <li>Дефіцит: -500 ккал/день</li>
                    <li>Клітковина: мін. 30г на добу</li>
                    <li>Тренування: Кардіо + Силові</li>
                </ul>`;
        }
    }

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
        } catch (err) { alert("Помилка запису!"); }
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
                    fill: true, tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
})();
