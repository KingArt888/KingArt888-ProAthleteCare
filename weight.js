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
            firebase.auth().signInAnonymously().catch(e => console.error("Auth error:", e));
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const form = document.getElementById('weight-form');
        if (form) form.addEventListener('submit', handleAthleteAnalysis);
    });

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        // 1. РОЗРАХУНОК BMI ТА СТАТУСУ
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let status, recommendation, color;

        if (bmi < 18.5) {
            status = "UNDERWEIGHT (Muscle Gain Mode)";
            recommendation = "Ціль: Гіпертрофія. Профіцит +15%. Білок: 2.2г/кг.";
            color = "#00BFFF"; // Блакитний
        } else if (bmi < 25) {
            status = "ATHLETIC FORM (Maintenance)";
            recommendation = "Ціль: Рекімпозиція. Підтримка форми. Білок: 2.0г/кг.";
            color = "#FFC72C"; // Золотий
        } else {
            status = "WEIGHT LOSS (Fat Burn Mode)";
            recommendation = "Ціль: Дефіцит -20%. Акцент на інтенсивність. Білок: 2.5г/кг.";
            color = "#DA3E52"; // Червоний
        }

        // 2. ПРОФЕСІЙНИЙ РОЗРАХУНОК КАЛОРІЙ (Mifflin-St Jeor)
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const tdee = Math.round(bmr * 1.55); // Середня активність атлета

        // Розрахунок БЖВ (професійна пропорція для атлетів 30/30/40)
        const protein = Math.round((tdee * 0.30) / 4);
        const fats = Math.round((tdee * 0.25) / 9);
        const carbs = Math.round((tdee * 0.45) / 4);

        // 3. ВИСНОВОК В ІНТЕРФЕЙС
        // Оновлюємо коло SCAN
        const fatDisplay = document.getElementById('fat-percentage-value');
        if (fatDisplay) fatDisplay.textContent = w + "kg";

        const bmiDisplay = document.getElementById('bmi-value');
        if (bmiDisplay) bmiDisplay.textContent = bmi;

        // Оновлюємо статус та калорії (у блок під сканером)
        const rankElement = document.getElementById('athlete-rank');
        if (rankElement) {
            rankElement.style.color = color;
            rankElement.innerHTML = `
                <div style="font-size: 16px; margin-bottom: 5px;">${status}</div>
                <div style="font-size: 20px; color: #fff;">${tdee} kcal</div>
                <div style="font-size: 11px; color: #888; margin-top: 5px;">
                    P: ${protein}g | F: ${fats}g | C: ${carbs}g
                </div>
            `;
        }

        // Додаємо детальні рекомендації в блок нотаток (якщо він є у вашому шаблоні)
        const dietNote = document.getElementById('diet-plan-content');
        if (dietNote) {
            dietNote.style.display = 'block';
            dietNote.innerHTML = `<strong>ПЛАН:</strong> ${recommendation}`;
        }

        // 4. ЗБЕРЕЖЕННЯ
        try {
            await firebase.firestore().collection('weight_history').add({
                userId: currentUserId,
                weight: w,
                bmi: bmi,
                daily_kcal: tdee,
                macros: { p: protein, f: fats, c: carbs },
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await firebase.firestore().collection('users').doc(currentUserId).set({ height: h, age: a }, { merge: true });
            loadHistory();
        } catch (e) { console.error(e); }
    }

    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        weightChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага', data: [], borderColor: '#FFC72C', tension: 0.4, fill: true, backgroundColor: 'rgba(255,199,44,0.05)' }] },
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
            .where('userId', '==', currentUserId).orderBy('date', 'asc').limit(15).get();
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data());
            weightChart.data.labels = docs.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
        }
    }
})();
