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
        }
    });

    // Оновлення візуалізації голограми
    function updateVisuals(weight, height, age) {
        if (!weight || !height) return;

        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        // Формула % жиру
        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(3, fat).toFixed(1) + "%";

        // Трансформація зображення тіла (масштабування по горизонталі)
        const img = document.getElementById('body-hologram-img');
        if (img) {
            let scaleX = 1 + (bmi - 22) * 0.035; // база BMI 22
            scaleX = Math.min(1.4, Math.max(0.7, scaleX)); // обмеження
            img.style.transform = `scaleX(${scaleX})`;
        }

        const status = document.getElementById('bmi-status');
        if (bmi < 18.5) status.textContent = "(Дефіцит)";
        else if (bmi < 25) status.textContent = "(Норма)";
        else status.textContent = "(Надмірна вага)";
    }

    async function loadUserProfile() {
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.height) document.getElementById('user-height').value = data.height;
            if (data.age) document.getElementById('user-age').value = data.age;
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

    // Решта коду для графіка...
    async function initWeightChart() {
        // Логіка Chart.js завантаження даних з Firestore
    }
})();
