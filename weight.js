(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    // Деталізований шлях атлетичного тіла (SVG Path)
    const ATHLETE_PATH = `
        M100,35 c-6,0 -11,5 -11,11 s5,11 11,11 s11,-5 11,-11 s-5,-11 -11,-11 z 
        M88,62 c-12,2 -22,12 -26,24 c-3,10 -1,35 -1,35 l6,55 l4,75 l-8,95 l12,75 h18 l4,-65 l4,65 h18 l12,-75 l-8,-95 l4,-75 l6,-55 c0,0 2,-25 -1,-35 c-4,-12 -14,-22 -26,-24 z
        M75,105 c4,8 12,12 25,12 s21,-4 25,-12 M82,165 h36 M86,205 h28 M65,85 l-20,65 l5,55 M135,85 l20,65 l-5,55
    `;

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

        // Розрахунок % жиру
        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(3, fat).toFixed(1) + "%";

        // ЛОГІКА ДЕТАЛІЗОВАНОЇ ГОЛОГРАМИ
        const hologramGroup = document.getElementById('body-hologram-img');
        if (hologramGroup) {
            // Очищуємо і малюємо атлета
            hologramGroup.innerHTML = `<path d="${ATHLETE_PATH}" fill="none" stroke-width="2" stroke-linecap="round" />`;
            
            hologramGroup.style.transition = "all 1s ease-in-out";
            hologramGroup.style.transform = "none"; // Вимикаємо розширення (scaleX)

            // Кольорова індикація стану
            if (bmi < 17 || bmi > 30) {
                hologramGroup.style.stroke = "#DA3E52"; // Критично (Червоний)
                hologramGroup.style.filter = "drop-shadow(0 0 15px #DA3E52)";
            } else if (bmi >= 25 && bmi <= 30) {
                hologramGroup.style.stroke = "#FFA500"; // Попередження (Помаранчевий)
                hologramGroup.style.filter = "drop-shadow(0 0 12px #FFA500)";
            } else {
                hologramGroup.style.stroke = "#FFC72C"; // Норма/Атлет (Золотий)
                hologramGroup.style.filter = "drop-shadow(0 0 15px rgba(255, 199, 44, 0.7))";
            }
        }

        // Оновлення рекомендацій (Дієта)
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
        try {
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
                        data: data,
                        borderColor: '#FFC72C',
                        backgroundColor: 'rgba(255, 199, 44, 0.1)',
                        fill: true, 
                        tension: 0.4,
                        borderWidth: 3
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#888' }, grid: { display: false } },
                        y: { ticks: { color: '#888' }, grid: { color: '#1a1a1a' } }
                    }
                }
            });
        } catch (e) { console.error("Chart error:", e); }
    }
})();
