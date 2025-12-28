(function() {
    let weightChart = null;
    let currentUserId = null;

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUserId = user.uid;
                await loadHistory();
            }
        });
        document.getElementById("weight-form").addEventListener("submit", handleSubmission);
    });

    function initChart() {
        const ctx = document.getElementById("weightChart").getContext("2d");
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага', data: [], borderColor: '#FFC72C', backgroundColor: 'rgba(255,199,44,0.05)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: '#222' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
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

        document.getElementById("bmi-value").textContent = bmi;
        document.getElementById("fat-percentage-value").textContent = fat + "%";
        document.getElementById("lbm-value").textContent = lbm;
        
        const rank = document.getElementById("athlete-rank");
        const insight = document.getElementById("diet-plan-content");

        if (fat < 15) {
            rank.textContent = "PRO ATHLETE";
            insight.innerHTML = "✅ <b>AI Insight:</b> Оптимальний баланс. Пріоритет: Гідратація та LBM.";
        } else {
            rank.textContent = "ACTIVE";
            insight.innerHTML = "📈 <b>AI Insight:</b> Рекомендовано дефіцит 10% для покращення кондицій.";
        }

        await db.collection("weight_history").add({
            userId: currentUserId, weight: w, date: new Date().toISOString().split('T')[0], timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadHistory();
    }

    async function loadHistory() {
        const snap = await db.collection("weight_history").where("userId", "==", currentUserId).orderBy("date", "asc").limit(7).get();
        if (!snap.empty) {
            const data = snap.docs.map(d => d.data());
            weightChart.data.labels = data.map(d => d.date.split('-').reverse().slice(0,2).reverse().join('.'));
            weightChart.data.datasets[0].data = data.map(d => d.weight);
            weightChart.update();
        }
    }
})();
