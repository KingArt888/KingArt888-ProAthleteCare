(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy';
    let currentMacros = null;

    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = viewUserId || user.uid;
            loadBaseData();
            loadHistory();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        document.getElementById('weight-form').addEventListener('submit', handleAthleteAnalysis);
        document.getElementById('get-diet-plan-btn').addEventListener('click', saveAndGenerateDiet);
    });

    // Вибір швидкості приготування
    window.setSpeed = function(speed, btn) {
        selectedSpeed = speed;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "#111";
            b.style.borderColor = "#333";
            b.classList.remove('active');
        });
        btn.style.background = "#222";
        btn.style.borderColor = "#FFC72C";
        btn.classList.add('active');
    };

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const analysis = calculateAthleteData(w, bmi, h, a);
        currentMacros = analysis;

        updateScannerUI(w, bmi, analysis);
        showDietSelection(analysis);

        try {
            await firebase.firestore().collection('weight_history').add({
                userId: currentUserId,
                weight: w,
                bmi: bmi,
                target_kcal: analysis.targetCalories,
                macros: { p: analysis.prot, f: analysis.fat, c: analysis.carb },
                status: analysis.status,
                statusColor: analysis.statusColor,
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await firebase.firestore().collection('users').doc(currentUserId).set({ height: h, age: a }, { merge: true });
            loadHistory();
        } catch (error) { console.error(error); }
    }

    function calculateAthleteData(w, bmi, h, a) {
        let modifier = bmi < 20.5 ? 1.15 : (bmi < 25.5 ? 1.0 : 0.80);
        let status = bmi < 20.5 ? "MUSCLE GAIN" : (bmi < 25.5 ? "MAINTENANCE" : "FAT LOSS");
        let color = bmi < 20.5 ? "#00BFFF" : (bmi < 25.5 ? "#FFC72C" : "#DA3E52");
        
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const kcal = Math.round(bmr * 1.55 * modifier);

        return {
            targetCalories: kcal,
            status: status,
            statusColor: color,
            prot: Math.round((kcal * 0.3) / 4),
            fat: Math.round((kcal * 0.25) / 9),
            carb: Math.round((kcal * 0.45) / 4)
        };
    }

    function updateScannerUI(w, bmi, data) {
        const circle = document.getElementById('scan-main-circle');
        document.getElementById('bmi-value').textContent = bmi;
        
        circle.innerHTML = `
            <span style="font-size:10px; color:#666; text-transform:uppercase;">Current</span>
            <span style="font-size:32px; color:#FFC72C; font-weight:bold;">${w}kg</span>
            <div style="color:${data.statusColor}; font-size:12px; font-weight:bold; margin-top:5px;">${data.status}</div>
            <div style="color:#fff; font-size:18px; margin-top:5px;">${data.targetCalories} kcal</div>
            <div style="font-size:9px; color:#aaa; margin-top:5px;">P:${data.prot} F:${data.fat} C:${data.carb}</div>
        `;
    }

    function showDietSelection(data) {
        document.getElementById('speed-selector-container').style.display = 'block';
        document.getElementById('athlete-recommendation-box').innerHTML = `
            <div style="border-left: 3px solid ${data.statusColor}; padding-left: 10px;">
                <strong style="color:${data.statusColor}">${data.status} MODE</strong>
                <p style="font-size:12px; color:#eee; margin: 5px 0;">Система готова згенерувати план на основі ваших ${data.targetCalories} ккал.</p>
            </div>
        `;
    }

    async function saveAndGenerateDiet() {
        if (!currentMacros || !window.dietDatabase) return;
        
        const container = document.getElementById('diet-container');
        container.innerHTML = `<p style="color:#FFC72C; text-align:center; font-size:11px;">Генеруємо план...</p>`;

        // Логіка вибору страв з diet-data.js
        const plan = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map(day => {
            return {
                day: day,
                meals: [
                    { ...dietDatabase.breakfasts.filter(m => m.speed === selectedSpeed)[0], type: "Сніданок" },
                    { ...dietDatabase.lunches.filter(m => m.speed === selectedSpeed)[0], type: "Обід" },
                    { ...dietDatabase.dinners.filter(m => m.speed === selectedSpeed)[0], type: "Вечеря" }
                ]
            };
        });

        // Зберігаємо план в Firebase, щоб ти міг його бачити
        await firebase.firestore().collection('athlete_plans').doc(currentUserId).set({
            plan: plan,
            speed: selectedSpeed,
            kcal: currentMacros.targetCalories,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        renderDietPlan(plan);
    }

    function renderDietPlan(plan) {
        const container = document.getElementById('diet-container');
        container.innerHTML = "";
        document.getElementById('kcal-balance').style.display = 'block';
        document.getElementById('calories-left').textContent = currentMacros.targetCalories;

        plan.forEach(day => {
            const dayBox = document.createElement('div');
            dayBox.style.cssText = "background:#111; padding:10px; border-radius:5px; margin-bottom:8px; border-left:2px solid #FFC72C;";
            dayBox.innerHTML = `<div style="font-size:11px; color:#FFC72C; font-weight:bold; margin-bottom:5px;">${day.day}</div>`;
            
            day.meals.forEach(meal => {
                const mealDiv = document.createElement('div');
                mealDiv.style.cssText = "display:flex; justify-content:space-between; font-size:11px; color:#eee; margin-bottom:3px;";
                mealDiv.innerHTML = `<span>${meal.type}: ${meal.name}</span>`;
                dayBox.appendChild(mealDiv);
            });
            container.appendChild(dayBox);
        });
    }

    // --- CHART & HISTORY (Твій стандартний код) ---
    function initChart() {
        const ctx = document.getElementById('weightChart').getContext('2d');
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага', data: [], borderColor: '#FFC72C', tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    async function loadHistory() {
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('date', 'desc').limit(15).get();
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data()).reverse();
            weightChart.data.labels = docs.map(d => d.date.split('-').slice(1).join('.'));
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
            
            const last = docs[docs.length - 1];
            updateScannerUI(last.weight, last.bmi, calculateAthleteData(last.weight, last.bmi, 178, 30)); // Приблизні дані для ініціалізації
        }
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            document.getElementById('user-height').value = doc.data().height || "";
            document.getElementById('user-age').value = doc.data().age || "";
        }
    }

})();
