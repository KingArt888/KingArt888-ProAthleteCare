// ===============================
// Weight Control – ProAthleteCare
// ===============================

const form = document.getElementById("weight-form");
const weightInput = document.getElementById("weight-value");
const heightInput = document.getElementById("user-height");
const ageInput = document.getElementById("user-age");

const bmiValue = document.getElementById("bmi-value");
const bmiStatusText = document.getElementById("bmi-status-text");
const fatValue = document.getElementById("fat-percentage-value");
const dietContent = document.getElementById("diet-plan-content");

let weightHistory = [];
let chart;

let currentUserId = null;
const COLL_USERS = "users";
const COLL_HISTORY = "weight_history";


// ===============================
// BMI + BODY FAT
// ===============================
function calculateBMI(weight, heightCm) {
    const h = heightCm / 100;
    return weight / (h * h);
}

function calculateBodyFat(bmi, age) {
    return (1.20 * bmi) + (0.23 * age) - 16.2; // Deurenberg formula
}

function getBMIStatus(bmi) {
    if (bmi < 18.5) return ["Underweight", "#3498db"];
    if (bmi < 25) return ["Optimal", "#2ecc71"];
    if (bmi < 30) return ["Overweight", "#f1c40f"];
    return ["High Risk", "#e74c3c"];
}

function generateDiet(bmi) {
    if (bmi < 20) return "🔹 Focus on caloric surplus, complex carbs, protein 2.0 g/kg.";
    if (bmi < 25) return "✅ Maintain balance: protein 1.6–1.8 g/kg, hydration, recovery.";
    return "⚠️ Mild caloric deficit, protein priority, reduce sugar & alcohol.";
}

// ===============================
// CHART
// ===============================
function initChart() {
    const ctx = document.getElementById("weightChart").getContext("2d");

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Weight (kg)",
                data: [],
                borderWidth: 2,
                borderColor: "#FFC72C",
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: false } }
        }
    });
}

// ===============================
// 3D MODEL CONTROL
// ===============================
function updateAthleteModel(bodyFat) {
    const model = document.getElementById("athlete-model");
    if (!model) return;

    // Зміна exposure / освітлення для “візуальної реакції”
    if (bodyFat < 12) model.exposure = 1.5;
    else if (bodyFat < 18) model.exposure = 1.3;
    else model.exposure = 1.1;
}

// ===============================
// FORM SUBMIT
// ===============================
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const weight = parseFloat(weightInput.value);
    const height = parseFloat(heightInput.value);
    const age = parseInt(ageInput.value);

    if (!weight || !height || !age) return;

    const bmi = calculateBMI(weight, height);
    const bodyFat = calculateBodyFat(bmi, age);
    const [status, color] = getBMIStatus(bmi);

    bmiValue.textContent = bmi.toFixed(1);
    bmiStatusText.textContent = status;
    bmiStatusText.style.color = color;

    fatValue.textContent = bodyFat.toFixed(1) + "%";
    dietContent.textContent = generateDiet(bmi);

    // Chart update
    weightHistory.push(weight);
    chart.data.labels.push(`Day ${weightHistory.length}`);
    chart.data.datasets[0].data.push(weight);
    chart.update();

    // 3D athlete feedback
    updateAthleteModel(bodyFat);

    // Save to Firebase
    if (currentUserId) {
        await db.collection(COLL_HISTORY).add({
            userId: currentUserId,
            weight,
            date: new Date().toISOString().split("T")[0]
        });

        await db.collection(COLL_USERS).doc(currentUserId).set({
            height,
            age
        }, { merge: true });
    }

    weightInput.value = "";
});

// ===============================
// FIREBASE AUTH
// ===============================
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return;
    currentUserId = user.uid;

    const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
    if (doc.exists) {
        heightInput.value = doc.data().height || 180;
        ageInput.value = doc.data().age || 25;
    }

    const snap = await db.collection(COLL_HISTORY)
        .where("userId", "==", currentUserId)
        .orderBy("date", "desc")
        .limit(10)
        .get();

    if (!snap.empty) {
        snap.docs.reverse().forEach(d => {
            const w = d.data().weight;
            weightHistory.push(w);
            chart.data.labels.push(d.data().date);
            chart.data.datasets[0].data.push(w);
        });
        chart.update();

        const lastWeight = weightHistory[weightHistory.length - 1];
        const bmi = calculateBMI(lastWeight, heightInput.value);
        const bodyFat = calculateBodyFat(bmi, ageInput.value);
        const [status, color] = getBMIStatus(bmi);

        bmiValue.textContent = bmi.toFixed(1);
        bmiStatusText.textContent = status;
        bmiStatusText.style.color = color;
        fatValue.textContent = bodyFat.toFixed(1) + "%";
        dietContent.textContent = generateDiet(bmi);

        updateAthleteModel(bodyFat);
    }
});

// ===============================
// INIT
// ===============================
initChart();
