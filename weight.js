(function() {
    let weightChart = null;
    let currentUserId = null;
    let remainingKcal = 0;
    let totalTargetKcal = 0;
    let selectedSpeed = 'Easy'; 

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

        const dietBtn = document.getElementById('get-diet-plan-btn');
        if (dietBtn) {
            dietBtn.addEventListener('click', () => {
                const w = parseFloat(document.getElementById('weight-value').value);
                const h = parseFloat(document.getElementById('user-height').value);
                const a = parseInt(document.getElementById('user-age').value);
                const bmi = (w / ((h / 100) ** 2)).toFixed(1);
                const analysis = calculateAthleteData(w, bmi, h, a);
                generateWeeklyPlan(analysis.targetCalories, analysis.prot, analysis.fat, analysis.carb);
            });
        }
    });

    window.setSpeed = function(speed, btn) {
        selectedSpeed = speed;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "#222";
            b.style.color = "#fff";
            b.classList.remove('active');
        });
        btn.style.background = "#FFC72C";
        btn.style.color = "#000";
        btn.classList.add('active');
    };

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const analysis = calculateAthleteData(w, bmi, h, a);

        totalTargetKcal = analysis.targetCalories;
        remainingKcal = analysis.targetCalories;

        // Оновлення UI
        document.getElementById('total-daily-kcal').textContent = totalTargetKcal;
        document.getElementById('calories-left').textContent = remainingKcal;
        document.getElementById('get-diet-plan-btn').style.display = 'block';
        document.getElementById('bmi-value').textContent = bmi;
        
        updateScannerUI(w, bmi, analysis.status, analysis.targetCalories, analysis.prot, analysis.fat, analysis.carb, analysis.statusColor, analysis.recommendation);

        try {
            await firebase.firestore().collection('weight_history').add({
                userId: currentUserId,
                weight: w,
                bmi: bmi,
                target_kcal: analysis.targetCalories,
                macros: { p: analysis.prot, f: analysis.fat, c: analysis.carb },
                status: analysis.status,
                statusColor: analysis.statusColor,
                recommendation: analysis.recommendation,
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await firebase.firestore().collection('users').doc(currentUserId).set({ height: h, age: a }, { merge: true });
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "ОНОВЛЕНО";
                submitBtn.style.opacity = "0.5";
            }
            loadHistory();
        } catch (error) { console.error("Firebase Error:", error); }
    }

    function calculateAthleteData(w, bmi, h, a) {
        let status, recommendation, statusColor, modifier, pR, fR, cR;
        if (bmi < 20.5) {
            status = "MUSCLE GAIN MODE"; statusColor = "#00BFFF"; modifier = 1.15; pR = 0.25; fR = 0.25; cR = 0.50;
            recommendation = "Ціль: Гіпертрофія. Профіцит +15%.";
        } else if (bmi < 25.5) {
            status = "ATHLETIC FORM"; statusColor = "#FFC72C"; modifier = 1.0; pR = 0.30; fR = 0.25; cR = 0.45;
            recommendation = "Ціль: Рекімпозиція. Підтримка форми.";
        } else {
            status = "WEIGHT LOSS MODE"; statusColor = "#DA3E52"; modifier = 0.80; pR = 0.35; fR = 0.25; cR = 0.40;
            recommendation = "Ціль: Жироспалювання. Дефіцит -20%.";
        }
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const target = Math.round(bmr * 1.55 * modifier);
        return {
            status, statusColor, recommendation, targetCalories: target,
            prot: Math.round((target * pR) / 4), fat: Math.round((target * fR) / 9), carb: Math.round((target * cR) / 4)
        };
    }

    function updateScannerUI(weight, bmi, status, kcal, p, f, c, color, rec) {
        const mainValue = document.getElementById('fat-percentage-value');
        if (mainValue) {
            mainValue.innerHTML = `<span style="font-size: 34px; color: #FFC72C;">${weight}kg</span>`;
        }
        document.getElementById('athlete-recommendation-box').innerHTML = `
            <div style="color:${color}; font-weight:bold;">${status}</div>
            <div style="font-size:11px; color:#aaa; margin-top:5px;">Б:${p}г Ж:${f}г В:${c}г</div>
            <div style="margin-top:5px;">${rec}</div>
        `;
    }

    window.generateWeeklyPlan = function(targetKcal, pT, fT, cT) {
        const container = document.getElementById('diet-container');
        if (!container || !window.dietDatabase) return;
        container.innerHTML = `<h4 style="color:#FFC72C; text-align:center; font-size:12px; margin: 15px 0;">7-ДЕННИЙ ПЛАН (РЕЖИМ: ${selectedSpeed})</h4>`;
        
        const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
        days.forEach(day => {
            const bOps = dietDatabase.breakfasts.filter(m => m.speed === selectedSpeed);
            const lOps = dietDatabase.lunches.filter(m => m.speed === selectedSpeed);
            const dOps = dietDatabase.dinners.filter(m => m.speed === selectedSpeed);

            const meals = [
                { ...bOps[Math.floor(Math.random() * bOps.length)], type: "Сніданок", r: 0.3 },
                { ...lOps[Math.floor(Math.random() * lOps.length)], type: "Обід", r: 0.4 },
                { ...dOps[Math.floor(Math.random() * dOps.length)], type: "Вечеря", r: 0.3 }
            ];

            const dayDiv = document.createElement('div');
            dayDiv.style.cssText = "background:#111; padding:10px; border-radius:6px; margin-bottom:10px; border-left:3px solid #FFC72C;";
            dayDiv.innerHTML = `<div style="color:#FFC72C; font-size:11px; font-weight:bold;">${day}</div>`;

            meals.forEach(meal => {
                const mk = Math.round(targetKcal * meal.r);
                const item = document.createElement('div');
                item.style.cssText = "display:flex; align-items:center; gap:8px; margin-top:5px; font-size:12px; color:#eee;";
                item.innerHTML = `
                    <input type="checkbox" onchange="completeMeal(this, ${mk})">
                    <span>${meal.type}: ${meal.name} (${mk} ккал)</span>
                `;
                dayDiv.appendChild(item);
            });
            container.appendChild(dayDiv);
        });
    };

    window.completeMeal = function(checkbox, kcal) {
        if (checkbox.checked) {
            remainingKcal -= kcal;
            checkbox.parentElement.style.opacity = "0.4";
        } else {
            remainingKcal += kcal;
            checkbox.parentElement.style.opacity = "1";
        }
        document.getElementById('calories-left').textContent = Math.max(0, remainingKcal);
    };

    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        weightChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага (кг)', data: [], borderColor: '#FFC72C', backgroundColor: 'rgba(255,199,44,0.05)', tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('date', 'desc').limit(20).get();
        if (!snap.empty) {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const chartData = [...docs].reverse();
            weightChart.data.labels = chartData.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
            weightChart.data.datasets[0].data = chartData.map(d => d.weight);
            weightChart.update();
        }
    }

    async function loadBaseData() {
        if (!currentUserId) return;
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('user-height').value = data.height || "";
            document.getElementById('user-age').value = data.age || "";
        }
    }
})();
