(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; 
    let currentAnalysis = null;

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

    // Вибір способу приготування
    window.setSpeed = function(speed, btn) {
        selectedSpeed = speed;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "#111";
            b.style.borderColor = "#333";
            b.style.color = "#fff";
        });
        btn.style.background = "#222";
        btn.style.borderColor = "#FFC72C";
        btn.style.color = "#FFC72C";
    };

    // Функція для кнопки "Отримати план"
    window.generateWeeklyPlan = async function() {
        if (!currentAnalysis) {
            alert("Спочатку введіть дані та натисніть 'Зберегти та аналізувати'");
            return;
        }
        
        const btn = document.getElementById('get-weekly-plan-btn');
        btn.textContent = "ГЕНЕРУЄМО...";
        btn.disabled = true;

        // Тут логіка збереження плану в Firebase для контролю тренером
        try {
            await firebase.firestore().collection('athlete_plans').doc(currentUserId).set({
                kcal: currentAnalysis.targetCalories,
                speed: selectedSpeed,
                status: currentAnalysis.status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            alert("План на 7 днів сформовано та збережено!");
            btn.textContent = "ОТРИМАТИ ПЛАН НА 7 ДНІВ";
            btn.disabled = false;
        } catch (e) { console.error(e); }
    };

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const analysis = calculateAthleteData(w, bmi, h, a);
        currentAnalysis = analysis;

        updateScannerUI(w, bmi, analysis);
        updateRecommendationUI(analysis);

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
        } catch (error) { console.error("Firebase Error:", error); }
    }

    function calculateAthleteData(w, bmi, h, a) {
        let status, color, modifier;
        if (bmi < 20.5) { status = "MUSCLE GAIN"; color = "#00BFFF"; modifier = 1.15; }
        else if (bmi < 25.5) { status = "ATHLETIC FORM"; color = "#FFC72C"; modifier = 1.0; }
        else { status = "WEIGHT LOSS"; color = "#DA3E52"; modifier = 0.85; }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const kcal = Math.round(bmr * 1.55 * modifier);
        return {
            status, statusColor: color, targetCalories: kcal,
            prot: Math.round((kcal * 0.3) / 4),
            fat: Math.round((kcal * 0.25) / 9),
            carb: Math.round((kcal * 0.45) / 4)
        };
    }

    // Повертаємо COMPOSITION SCAN як було
    function updateScannerUI(weight, bmi, data) {
        const bmiDisplay = document.getElementById('bmi-value');
        if (bmiDisplay) bmiDisplay.textContent = bmi;

        const circle = document.querySelector('.main-circle');
        if (circle) {
            circle.innerHTML = `
                <span style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Status</span>
                <div style="color: ${data.statusColor}; font-size: 14px; font-weight: bold; margin-bottom: 5px;">${data.status}</div>
                <span style="font-size: 38px; color: #FFC72C; font-weight: bold; line-height: 1;">${weight}kg</span>
                <span style="font-size: 14px; color: #fff; margin-top: 5px;">BMI: ${bmi}</span>
            `;
        }
    }

    // Оновлена секція рекомендацій з твоїм текстом та кнопкою
    function updateRecommendationUI(data) {
        const cards = document.querySelectorAll('.form-card');
        let dietCard = Array.from(cards).find(c => c.innerHTML.includes('АНАЛІЗ'));
        if (!dietCard) dietCard = cards[2];

        if (dietCard) {
            dietCard.innerHTML = `
                <h3>🍽 АНАЛІЗ ТА РЕКОМЕНДАЦІЇ</h3>
                <div style="border-left: 3px solid ${data.statusColor}; padding-left: 10px; margin-bottom: 15px;">
                    <p style="color:#eee; font-size:14px; margin:0;">Режим: <strong>${data.status}</strong></p>
                    <p style="color:#eee; font-size:13px; margin:8px 0 0 0; line-height:1.4;">
                        <strong>РЕКОМЕНДАЦІЯ:</strong> Тобі необхідно <strong>${data.targetCalories} ккал</strong> в день для досягнення пікової форми.
                    </p>
                </div>
                
                <p style="font-size:11px; color:#666; margin-bottom:8px; text-transform:uppercase;">Виберіть спосіб приготування:</p>
                <div style="display: flex; gap: 4px; margin-bottom: 15px;">
                    <button onclick="setSpeed('Easy', this)" class="speed-btn active" style="flex:1; background:#222; color:#FFC72C; border:1px solid #FFC72C; padding:8px 0; font-size:9px; cursor:pointer; font-weight:bold; border-radius:4px;">⚡ ШВИДКО</button>
                    <button onclick="setSpeed('Medium', this)" class="speed-btn" style="flex:1; background:#111; color:#fff; border:1px solid #333; padding:8px 0; font-size:9px; cursor:pointer; border-radius:4px;">🥗 СЕРЕДНЬО</button>
                    <button onclick="setSpeed('Hard', this)" class="speed-btn" style="flex:1; background:#111; color:#fff; border:1px solid #333; padding:8px 0; font-size:9px; cursor:pointer; border-radius:4px;">👨‍🍳 МАЮ ЧАС</button>
                </div>
                
                <button id="get-weekly-plan-btn" onclick="generateWeeklyPlan()" class="gold-button" style="width:100%; margin-top:10px; padding:12px;">ОТРИМАТИ ПЛАН ХАРЧУВАННЯ НА 7 ДНІВ</button>
            `;
        }
    }

    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        weightChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага', data: [], borderColor: '#FFC72C', tension: 0.4, fill: false }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('date', 'desc').limit(15).get();
        
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data());
            const chartData = [...docs].reverse();
            weightChart.data.labels = chartData.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
            weightChart.data.datasets[0].data = chartData.map(d => d.weight);
            weightChart.update();

            const last = docs[0];
            const analysis = calculateAthleteData(last.weight, last.bmi, 180, 25);
            currentAnalysis = analysis;
            updateScannerUI(last.weight, last.bmi, analysis);
            updateRecommendationUI(analysis);
        }
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const d = doc.data();
            if (document.getElementById('user-height')) document.getElementById('user-height').value = d.height || "";
            if (document.getElementById('user-age')) document.getElementById('user-age').value = d.age || "";
        }
    }
})();
