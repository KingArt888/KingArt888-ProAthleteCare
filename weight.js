(function() {
    let weightChart = null;
    let currentUserId = null;

    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = viewUserId || user.uid;
            loadBaseData();
            loadHistory();
        } else {
            firebase.auth().signInAnonymously();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        document.getElementById('weight-form').addEventListener('submit', handleAthleteAnalysis);
    });

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        // 1. РОЗРАХУНОК BMI ТА СТАТУСУ
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let status = "";
        let recommendation = "";

        if (bmi < 18.5) {
            status = "UNDERWEIGHT (Дефіцит маси)";
            recommendation = "Weight Gain: Профіцит калорій +500 ккал. Акцент на складні вуглеводи та білок (2г/кг).";
        } else if (bmi < 25) {
            status = "NORMAL (Норма)";
            recommendation = "Maintenance: Підтримка поточної форми. Баланс БЖВ: 30/30/40.";
        } else {
            status = "WEIGHT LOSS (Надлишкова маса)";
            recommendation = "Fat Loss: Дефіцит калорій -15% від норми. Збільшити інтенсивність кардіо.";
        }

        // 2. ПРОФЕСІЙНИЙ РОЗРАХУНОК КАЛОРІЙ (Mifflin-St Jeor)
        // Для чоловіків: (10 × вага) + (6.25 × зріст) - (5 × вік) + 5
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const maintenance = Math.round(bmr * 1.55); // Коефіцієнт середньої активності атлета

        // 3. ВИСНОВОК В ІНТЕРФЕЙС
        const fatDisplay = document.getElementById('fat-percentage-value');
        if (fatDisplay) fatDisplay.textContent = w + " kg";

        const bmiDisplay = document.getElementById('bmi-value');
        if (bmiDisplay) bmiDisplay.textContent = bmi;

        // Висновок рекомендацій у підпис під сканером (athlete-rank)
        const rankElement = document.getElementById('athlete-rank');
        if (rankElement) {
            rankElement.innerHTML = `<span style="color:#FFC72C">${status}</span><br>
                                     <small>BMR: ${maintenance} kcal/day</small>`;
        }

        // 4. ЗБЕРЕЖЕННЯ
        await firebase.firestore().collection('weight_history').add({
            userId: currentUserId,
            weight: w,
            bmi: bmi,
            calories_norm: maintenance,
            date: new Date().toISOString().split('T')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await firebase.firestore().collection('users').doc(currentUserId).set({ height: h, age: a }, { merge: true });
        loadHistory();
    }

    // --- Решта функцій initChart, loadBaseData, loadHistory залишаються без змін як у минулому коді ---
    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        weightChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага (кг)', data: [], borderColor: '#FFC72C', tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('user-height').value = data.height || "";
            document.getElementById('user-age').value = data.age || "";
        }
    }

    async function loadHistory() {
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('date', 'asc').limit(10).get();
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data());
            weightChart.data.labels = docs.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
        }
    }
})();
