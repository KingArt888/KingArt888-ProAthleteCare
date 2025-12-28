// ==========================================
// Weight Control – ProAthleteCare (FINAL)
// ==========================================

(function() {
    const COLL_HISTORY = "weight_history";
    const COLL_USERS = "users";
    const db = window.db;

    const GOLD = '#FFC72C';
    const GRID_COLOR = 'rgba(255, 255, 255, 0.05)';

    let weightChart = null;
    let currentUserId = null;

    // DOM Елементи
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
        
        window.auth.onAuthStateChanged(async (user) => {
            if (user) {
                const urlParams = new URLSearchParams(window.location.search);
                currentUserId = urlParams.get('userId') || user.uid;
                await loadUserData();
                await loadWeightHistory();
            } else {
                await window.auth.signInAnonymously();
            }
        });

        if (form) form.addEventListener("submit", handleFormSubmit);
    });

    // --- РОЗРАХУНКИ ---
    function calculateBMI(w, hCm) {
        const hM = hCm / 100;
        return (w / (hM * hM)).toFixed(1);
    }

    function calculateBodyFat(bmi, age) {
        // Deurenberg formula: (1.20 * BMI) + (0.23 * Age) - 16.2
        return ((1.20 * bmi) + (0.23 * age) - 16.2).toFixed(1);
    }

    function getBMIInfo(bmi) {
        if (bmi < 18.5) return { status: "Underweight", color: "#3498db", diet: "🔹 Focus on caloric surplus, complex carbs, protein 2.0 g/kg." };
        if (bmi < 25)   return { status: "Optimal", color: GOLD, diet: "✅ Maintain balance: protein 1.6–1.8 g/kg, hydration, recovery." };
        if (bmi < 30)   return { status: "Overweight", color: "#f1c40f", diet: "⚠️ Mild caloric deficit, protein priority, reduce sugar & alcohol." };
        return { status: "High Risk", color: "#e74c3c", diet: "🚨 Focus on fat loss, high protein, and low glycemic index foods." };
    }

    // --- ГРАФІК (З ФІКСОМ СКРОЛУ) ---
    function initChart() {
        const ctx = document.getElementById("weightChart");
        if (!ctx) return;

        weightChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: [],
                datasets: [{
                    label: "Weight (kg)",
                    data: [],
                    borderColor: GOLD,
                    backgroundColor: 'rgba(255, 199, 44, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: GOLD
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Запобігає "стрибкам" скролу
                plugins: { legend: { display: false } },
                scales: {
                    y: { 
                        grid: { color: GRID_COLOR },
                        ticks: { color: '#666', font: { size: 10 } },
                        beginAtZero: false 
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { color: '#888', font: { size: 10 } }
                    }
                }
            }
        });
    }

    // --- ОНОВЛЕННЯ 3D МОДЕЛІ ---
    function updateAthleteModel(bodyFat) {
        const model = document.getElementById("athlete-model");
        if (!model) return;
        // Візуальна реакція на % жиру через освітлення
        if (bodyFat < 12) model.exposure = 1.6;
        else if (bodyFat < 18) model.exposure = 1.2;
        else model.exposure = 0.8;
    }

    // --- FIREBASE ОПЕРАЦІЇ ---
    async function loadUserData() {
        const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
        if (doc.exists) {
            heightInput.value = doc.data().height || "";
            ageInput.value = doc.data().age || "";
        }
    }

    async function loadWeightHistory() {
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "asc")
            .limit(10)
            .get();

        if (!snap.empty) {
            const weights = [];
            const labels = [];
            snap.forEach(d => {
                weights.push(d.data().weight);
                const datePart = d.data().date.split('-').slice(1).reverse().join('.');
                labels.push(datePart);
            });

            weightChart.data.labels = labels;
            weightChart.data.datasets[0].data = weights;
            weightChart.update();

            // Оновлюємо UI останніми даними
            const lastWeight = weights[weights.length - 1];
            refreshUI(lastWeight, heightInput.value, ageInput.value);
        }
    }

    function refreshUI(w, h, a) {
        if (!w || !h || !a) return;
        const bmi = calculateBMI(w, h);
        const fat = calculateBodyFat(bmi, a);
        const info = getBMIInfo(bmi);

        bmiValue.textContent = bmi;
        bmiStatusText.textContent = `(${info.status})`;
        bmiStatusText.style.color = info.color;
        fatValue.textContent = (fat > 0 ? fat : 0) + "%";
        dietContent.textContent = info.diet;
        
        updateAthleteModel(fat);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const weight = parseFloat(weightInput.value);
        const height = parseFloat(heightInput.value);
        const age = parseInt(ageInput.value);
        const dateStr = new Date().toISOString().split("T")[0];

        if (!weight || !height || !age) return;

        refreshUI(weight, height, age);

        try {
            await db.collection(COLL_HISTORY).add({
                userId: currentUserId,
                weight,
                date: dateStr,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await db.collection(COLL_USERS).doc(currentUserId).set({
                height, age
            }, { merge: true });

            await loadWeightHistory();
            weightInput.value = "";
        } catch (err) {
            console.error("Save error:", err);
        }
    }
})();
