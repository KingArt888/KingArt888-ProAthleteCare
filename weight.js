(function() {
    let weightChart = null;
    let currentUserId = null;
    const GOLD = '#FFC72C';

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUserId = user.uid;
                await loadBaseData();
                await loadHistory();
            }
        });
        document.getElementById("weight-form").addEventListener("submit", handleSubmission);
    });

    function initChart() {
        const ctx = document.getElementById("weightChart").getContext("2d");
        weightChart = new Chart(ctx, {
            type: "line",
            data: { labels: [], datasets: [{ label: "Weight (kg)", data: [], borderColor: GOLD, backgroundColor: 'rgba(255,199,44,0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#1a1a1a' }, ticks: { color: '#666' } }, x: { grid: { display: false }, ticks: { color: '#666' } } } }
        });
    }

    async function handleSubmission(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById("weight-value").value);
        const h = parseFloat(document.getElementById("user-height").value);
        const a = parseInt(document.getElementById("user-age").value);

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const fat = ((1.20 * bmi) + (0.23 * a) - 16.2).toFixed(1);
        const lbm = (w * (1 - (fat / 100))).toFixed(1);

        updateMetricsUI(bmi, fat, lbm);
        
        try {
            await db.collection("weight_history").add({
                userId: currentUserId, weight: w, date: new Date().toISOString().split('T')[0], timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection("users").doc(currentUserId).set({ height: h, age: a }, { merge: true });
            loadHistory();
        } catch (err) { console.error("Firebase Error:", err); }
    }

    function updateMetricsUI(bmi, fat, lbm) {
        document.getElementById("bmi-value").textContent = bmi;
        document.getElementById("fat-percentage-value").textContent = fat + " %";
        document.getElementById("lbm-value").textContent = lbm + " KG";
        
        const rankEl = document.getElementById("athlete-rank");
        const insightEl = document.getElementById("diet-plan-content");

        if (fat < 15) {
            rankEl.textContent = "PRO CONDITION";
            insightEl.innerHTML = "✅ Пріоритет: Підтримка м'язової маси (LBM) та контроль гідратації.";
        } else {
            rankEl.textContent = "RECOVERY/MASS";
            insightEl.innerHTML = "📈 Рекомендовано: Помірна корекція раціону та збільшення активності.";
        }
    }

    async function loadBaseData() {
        const doc = await db.collection("users").doc(currentUserId).get();
        if (doc.exists) {
            document.getElementById("user-height").value = doc.data().height || "";
            document.getElementById("user-age").value = doc.data().age || "";
        }
    }

    async function loadHistory() {
        const snap = await db.collection("weight_history").where("userId", "==", currentUserId).orderBy("date", "asc").limit(10).get();
        if (!snap.empty) {
            const data = snap.docs.map(d => d.data());
            weightChart.data.labels = data.map(d => d.date.split('-').slice(1).reverse().join('.'));
            weightChart.data.datasets[0].data = data.map(d => d.weight);
            weightChart.update();
        }
    }
})();
