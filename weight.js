(function() {
    const COLL_HISTORY = "weight_history";
    const COLL_USERS = "users";
    const GOLD = '#FFC72C';
    const GRID_COLOR = 'rgba(255, 255, 255, 0.05)';

    let weightChart = null;
    let currentUserId = null;

    // DOM Elements
    const form = document.getElementById("weight-form");
    const weightInput = document.getElementById("weight-value");
    const heightInput = document.getElementById("user-height");
    const ageInput = document.getElementById("user-age");
    const bmiValue = document.getElementById("bmi-value");
    const bmiStatusText = document.getElementById("bmi-status-text");
    const fatValue = document.getElementById("fat-percentage-value");
    const dietContent = document.getElementById("diet-plan-content");

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        
        // Перевірка авторизації
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                const urlParams = new URLSearchParams(window.location.search);
                currentUserId = urlParams.get('userId') || user.uid;
                await loadBaseData();
                await loadHistory();
            } else {
                firebase.auth().signInAnonymously();
            }
        });

        if (form) form.addEventListener("submit", handleSubmission);
    });

    // --- Розрахунки ---
    function getBMI(w, h) { return (w / ((h / 100) ** 2)).toFixed(1); }
    function getFat(bmi, age) { return ((1.20 * bmi) + (0.23 * age) - 16.2).toFixed(1); }

    function updateUI(bmi, fat) {
        bmiValue.textContent = bmi;
        fatValue.textContent = (fat > 0 ? fat : 0) + "%";
        
        let status = { text: "Оптимально", color: GOLD, diet: "✅ Пріоритет на підтримку м'язової маси та гідратацію." };
        if (bmi < 18.5) status = { text: "Дефіцит", color: "#3498db", diet: "🔹 Акцент на профіцит калорій та білок 2.0г/кг." };
        else if (bmi >= 25) status = { text: "Надмірна вага", color: "#f1c40f", diet: "⚠️ Помірний дефіцит калорій. Збільште споживання овочів." };

        bmiStatusText.textContent = `(${status.text})`;
        bmiStatusText.style.color = status.color;
        dietContent.textContent = status.diet;

        // Візуалізація SVG
        const svg = document.getElementById("athlete-svg");
        if (svg) {
            svg.style.filter = `drop-shadow(0 0 ${fat < 15 ? '15px' : '5px'} ${status.color})`;
            svg.style.fill = status.color;
        }
    }

    // --- Firebase ---
    async function loadBaseData() {
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            heightInput.value = doc.data().height || "180";
            ageInput.value = doc.data().age || "25";
        }
    }

    async function loadHistory() {
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc")
            .limit(10)
            .get();

        if (!snap.empty) {
            const data = snap.docs.map(d => d.data());
            weightChart.data.labels = data.map(d => d.date.split('-').slice(1).reverse().join('.'));
            weightChart.data.datasets[0].data = data.map(d => d.weight);
            weightChart.update();

            const last = data[data.length - 1];
            const bmi = getBMI(last.weight, heightInput.value);
            updateUI(bmi, getFat(bmi, ageInput.value));
        }
    }

    async function handleSubmission(e) {
        e.preventDefault();
        const w = parseFloat(weightInput.value);
        const h = parseFloat(heightInput.value);
        const a = parseInt(ageInput.value);
        if (!w || !h || !a) return;

        const bmi = getBMI(w, h);
        updateUI(bmi, getFat(bmi, a));

        try {
            await db.collection(COLL_HISTORY).add({
                userId: currentUserId,
                weight: w,
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection(COLL_USERS).doc(currentUserId).set({ height: h, age: a }, { merge: true });
            loadHistory();
            weightInput.value = "";
        } catch (err) { console.error("Помилка збереження:", err); }
    }

    function initChart() {
        const ctx = document.getElementById("weightChart").getContext("2d");
        weightChart = new Chart(ctx, {
            type: "line",
            data: { labels: [], datasets: [{ label: "кг", data: [], borderColor: GOLD, backgroundColor: 'rgba(255, 199, 44, 0.1)', fill: true, tension: 0.4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: GRID_COLOR }, ticks: { color: '#666' } },
                    x: { grid: { display: false }, ticks: { color: '#888' } }
                }
            }
        });
    }
})();
