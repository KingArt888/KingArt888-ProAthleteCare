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

    async function loadUserProfile() {
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            if (d.height) document.getElementById('user-height').value = d.height;
            if (d.age) document.getElementById('user-age').value = d.age;
        }
    }

    function updateHologramAndBMI(w, h, a) {
        if (!w || !h) return;
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        // Розрахунок % жиру
        let fat = (1.20 * bmi) + (0.23 * (a || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(3, fat).toFixed(1) + "%";

        // Візуальна зміна голограми
        const img = document.getElementById('body-hologram-img');
        if (img) {
            let scaleX = 1 + (bmi - 22) * 0.035; // Розрахунок ширини відносно норми
            img.style.transform = `scaleX(${Math.min(1.4, Math.max(0.7, scaleX))})`;
            
            // Зміна кольору неону при критичних показниках
            img.style.filter = bmi > 28 
                ? "drop-shadow(0 0 20px #DA3E52) brightness(1.2)" 
                : "drop-shadow(0 0 15px #FFC72C) brightness(1.1)";
        }

        const status = document.getElementById('bmi-status');
        if (bmi < 18.5) status.textContent = "Deficit";
        else if (bmi < 25) status.textContent = "Athletic Normal";
        else status.textContent = "Overweight";
    }

    async function checkDailyEntry() {
        const today = new Date().toISOString().split('T')[0];
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId).orderBy("date", "desc").limit(1).get();

        if (!snap.empty) {
            const entry = snap.docs[0].data();
            const h = document.getElementById('user-height').value;
            const a = document.getElementById('user-age').value;
            updateHologramAndBMI(entry.weight, h, a);
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
        const snap = await db.collection(COLL_HISTORY).where("userId", "==", currentUserId).orderBy("date", "asc").limit(12).get();
        const labels = [], values = [];
        snap.forEach(doc => { labels.push(doc.data().date.slice(5)); values.push(doc.data().weight); });

        const ctx = document.getElementById('weightChart').getContext('2d');
        if (weightChartInstance) weightChartInstance.destroy();
        weightChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
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
                scales: { x: { ticks: { color: '#555' } }, y: { ticks: { color: '#555' } } }
            }
        });
    }
})();
