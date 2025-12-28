(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    // 1. Константи графіки
    const BODY_OUTLINE = "M100,35 c-6.5,0 -11.8,5.3 -11.8,11.8 s5.3,11.8 11.8,11.8 s11.8,-5.3 11.8,-11.8 s-5.3,-11.8 -11.8,-11.8 z M88,65 c-15,2 -25,12 -30,28 c-3,10 -1,45 -1,45 l8,65 l5,85 l-12,110 l18,85 h24 l6,-80 l6,80 h24 l18,-85 l-12,-110 l5,-85 l8,-65 c0,0 2,-35 -1,-45 c-5,-16 -15,-26 -30,-28 z";
    const MUSCLE_DETAILS = `
        <path d="M78,105 q22,10 44,0" stroke-opacity="0.6" />
        <path d="M85,140 h30 M86,160 h28 M87,180 h26" stroke-opacity="0.4" />
        <path d="M65,95 l-25,75 l8,60 M135,95 l25,75 l-8,60" stroke-opacity="0.5" />
        <path d="M85,260 l-5,60 M115,260 l5,60" stroke-opacity="0.3" />
    `;

    // 2. Допоміжні функції (визначаємо ДО виклику)
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

    function updateInterface(weight, height, age) {
        if (!weight || !height) return;

        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        const bmiElement = document.getElementById('bmi-value');
        if (bmiElement) bmiElement.textContent = bmi;

        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        const fatElement = document.getElementById('fat-percentage-value');
        if (fatElement) fatElement.textContent = Math.max(3, fat).toFixed(1) + "%";

        const hologramGroup = document.getElementById('body-hologram-img');
        if (hologramGroup) {
            hologramGroup.innerHTML = `<path d="${BODY_OUTLINE}" fill="none" stroke-width="2" />${MUSCLE_DETAILS}`;
            
            // Кольорова індикація
            if (bmi < 18.5 || bmi > 28) {
                hologramGroup.style.stroke = "#DA3E52"; // Червоний
                hologramGroup.style.filter = "drop-shadow(0 0 15px #DA3E52)";
            } else if (bmi >= 25 && bmi <= 28) {
                hologramGroup.style.stroke = "#FFA500"; // Помаранчевий
            } else {
                hologramGroup.style.stroke = "#FFC72C"; // Золотий
                hologramGroup.style.filter = "url(#neon-glow)";
            }
        }

        const dietBox = document.getElementById('diet-plan-content');
        const statusText = document.getElementById('bmi-status-text');
        if (dietBox && statusText) {
            if (bmi < 18.5) {
                statusText.textContent = "(Дефіцит)";
                dietBox.innerHTML = `<strong>План: Гіпертрофія</strong><ul class="diet-list"><li>Калорії: +20%</li><li>Білок: 2.2г/кг</li></ul>`;
            } else if (bmi < 25) {
                statusText.textContent = "(Норма)";
                dietBox.innerHTML = `<strong>План: Атлетизм</strong><ul class="diet-list"><li>Підтримка ваги</li><li>Баланс БЖВ</li></ul>`;
            } else {
                statusText.textContent = "(Надмірна вага)";
                dietBox.innerHTML = `<strong>План: Рекомпозиція</strong><ul class="diet-list"><li>Дефіцит: -500 ккал</li><li>Кардіо: 40 хв</li></ul>`;
            }
        }
    }

    async function checkDailyEntry() {
        try {
            const snap = await db.collection(COLL_HISTORY)
                .where("userId", "==", currentUserId)
                .orderBy("date", "desc").limit(1).get();
            if (!snap.empty) {
                const last = snap.docs[0].data();
                const h = document.getElementById('user-height').value || 180;
                const a = document.getElementById('user-age').value || 25;
                updateInterface(last.weight, h, a);
            }
        } catch (e) { console.error("Error checking entries:", e); }
    }

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
                        fill: true, tension: 0.4, borderWidth: 3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        } catch (e) { console.error("Chart error:", e); }
    }

    // 3. Основний потік
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

    // 4. Слухач форми
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
                    userId: currentUserId, weight: w, date: today, timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                await db.collection(COLL_USERS).doc(currentUserId).set({ height: h, age: a }, { merge: true });
                location.reload();
            } catch (err) { alert("Помилка запису!"); }
        });
    }
})();
