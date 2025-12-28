(function() {
    const COLL_HISTORY = "weight_history";
    const COLL_USERS = "users";
    const GOLD = '#FFC72C';

    let weightChart = null;
    let currentUserId = null;

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
            data: { labels: [], datasets: [{ label: "кг", data: [], borderColor: GOLD, backgroundColor: 'rgba(255,199,44,0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#222' } }, x: { grid: { display: false } } } }
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

        updateBioDisplay(fat, lbm, bmi);
        
        try {
            await db.collection(COLL_HISTORY).add({
                userId: currentUserId,
                weight: w,
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection(COLL_USERS).doc(currentUserId).set({ height: h, age: a }, { merge: true });
            loadHistory();
        } catch (err) { console.error(err); }
    }

    function updateBioDisplay(fat, lbm, bmi) {
        // Оновлення значень
        document.getElementById("fat-percentage-value").textContent = fat + "%";
        document.getElementById("lbm-value").textContent = lbm + " KG";
        document.getElementById("bmi-value").textContent = bmi;

        // Анімація кола (283 - довжина кола)
        const offset = 283 - (283 * Math.min(fat, 50) / 50);
        document.getElementById("fat-progress").style.strokeDashoffset = offset;

        // Ранги та рекомендації
        const rankEl = document.getElementById("athlete-rank");
        const insightEl = document.getElementById("diet-plan-content");
        
        if (fat < 12) {
            rankEl.textContent = "ELITE/PRO";
            insightEl.innerHTML = "💎 <strong>Статус: Елітний.</strong> Фокус на збереженні Lean Mass. Протокол: 2.2г білка на кг.";
        } else if (fat < 18) {
            rankEl.textContent = "PRO ATHLETE";
            insightEl.innerHTML = "✅ <strong>Статус: Атлет.</strong> Оптимальна форма. Підтримуйте поточний метаболізм.";
        } else {
            rankEl.textContent = "FITNESS";
            insightEl.innerHTML = "📈 <strong>Статус: Кондиція.</strong> Рекомендується LISS-кардіо для корекції відсотка жиру.";
        }
    }

    async function loadBaseData() {
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            document.getElementById("user-height").value = doc.data().height || "";
            document.getElementById("user-age").value = doc.data().age || "";
        }
    }

    async function loadHistory() {
        const snap = await db.collection(COLL_HISTORY).where("userId", "==", currentUserId).orderBy("date", "asc").limit(7).get();
        if (!snap.empty) {
            const data = snap.docs.map(d => d.data());
            weightChart.data.labels = data.map(d => d.date.split('-').reverse().slice(0,2).reverse().join('.'));
            weightChart.data.datasets[0].data = data.map(d => d.weight);
            weightChart.update();
            const last = data[data.length - 1];
            const h = document.getElementById("user-height").value;
            const a = document.getElementById("user-age").value;
            if(h && a) {
                const bmi = (last.weight / ((h / 100) ** 2)).toFixed(1);
                const fat = ((1.20 * bmi) + (0.23 * a) - 16.2).toFixed(1);
                updateBioDisplay(fat, (last.weight * (1 - fat/100)).toFixed(1), bmi);
            }
        }
    }
})();
