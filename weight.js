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

// ===============================
// BMI + BODY FAT
// ===============================
function calculateBMI(weight, heightCm) {
    const h = heightCm / 100;
    return weight / (h * h);
}

function calculateBodyFat(bmi, age) {
    // Deurenberg formula (male, athlete-friendly approx)
    return (1.20 * bmi) + (0.23 * age) - 16.2;
}

function getBMIStatus(bmi) {
    if (bmi < 18.5) return ["Underweight", "#3498db"];
    if (bmi < 25) return ["Optimal", "#2ecc71"];
    if (bmi < 30) return ["Overweight", "#f1c40f"];
    return ["High Risk", "#e74c3c"];
}

// ===============================
// DIET LOGIC
// ===============================
function generateDiet(bmi) {
    if (bmi < 20) {
        return "🔹 Focus on caloric surplus, complex carbs, protein 2.0 g/kg.";
    }
    if (bmi < 25) {
        return "✅ Maintain balance: protein 1.6–1.8 g/kg, hydration, recovery.";
    }
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
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// ===============================
// MODEL VIEWER CONTROL
// ===============================
function updateAthleteModel(bodyFat) {
    const model = document.getElementById("athlete-model");
    if (!model) return;

    // simple visual feedback via exposure
    if (bodyFat < 12) model.exposure = 1.5;
    else if (bodyFat < 18) model.exposure = 1.3;
    else model.exposure = 1.1;
}

// ===============================
// FORM SUBMIT
// ===============================
form.addEventListener("submit", (e) => {
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

    // chart
    weightHistory.push(weight);
    chart.data.labels.push(`Day ${weightHistory.length}`);
    chart.data.datasets[0].data.push(weight);
    chart.update();

    // 3D athlete reaction
    updateAthleteModel(bodyFat);

    weightInput.value = "";
});

// ===============================
initChart();
