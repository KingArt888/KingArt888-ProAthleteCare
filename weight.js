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
        const form = document.getElementById('weight-form');
        if (form) form.addEventListener('submit', handleAthleteAnalysis);
    });

    // Функція вибору швидкості (публічна для кнопок, які ми додамо динамічно)
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
        if (currentMacros) renderDietPlan();
    };

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const analysis = calculateAthleteData(w, bmi, h, a);
        currentMacros = analysis;

        updateScannerUI(w, bmi, analysis);
        setupDietSection(analysis);

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
        let modifier = bmi < 20.5 ? 1.15 : (bmi < 25.5 ? 1.0 : 0.85);
        let status = bmi < 20.5 ? "MUSCLE GAIN" : (bmi < 25.5 ? "ATHLETIC FORM" : "WEIGHT LOSS");
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
        const bmiDisplay = document.getElementById('bmi-value');
        if (bmiDisplay) bmiDisplay.textContent = bmi;

        const circle = document.querySelector('.main-circle');
        if (circle) {
            circle.style.width = "160px";
            circle.style.height = "160px";
            circle.innerHTML = `
                <span style="font-size:10px; color:#666; text-transform:uppercase; letter-spacing:1px;">Status</span>
                <div style="color:${data.statusColor}; font-size:14px; font-weight:bold; margin-bottom:5px;">${data.status}</div>
                <span style="font-size:32px; color:#FFC72C; font-weight:bold; line-height:1;">${w}kg</span>
                <div style="color:#fff; font-size:18px; font-weight:bold; margin-top:5px;">${data.targetCalories} kcal</div>
                <div style="font-size:9px; color:#aaa; margin-top:5px;">P:${data.prot}g | F:${data.fat}g | C:${data.carb}g</div>
            `;
        }
    }

    function setupDietSection(data) {
        // Оскільки в HTML немає контейнера, ми створюємо його в третій картці (або після сканера)
        let dietCard = document.querySelector('.diet-card');
        if (!dietCard) {
            // Якщо класу diet-card немає, беремо останню картку перед графіком
            const cards = document.querySelectorAll('.form-card');
            dietCard = cards[cards.length - 1];
        }

        dietCard.innerHTML = `
            <h3>🍽 АНАЛІЗ ТА РЕКОМЕНДАЦІЇ</h3>
            <div style="border-left: 3px solid ${data.statusColor}; padding-left: 10px; margin-bottom: 20px;">
                <p style="color:#eee; font-size:13px; margin:0;">Режим: <strong>${data.status}</strong></p>
                <p style="color:#666; font-size:11px; margin:5px 0 0 0;">План розраховано на ${data.targetCalories} ккал для досягнення пікової форми.</p>
            </div>
            
            <div style="display: flex; gap: 5px; margin-bottom: 20px;">
                <button onclick="setSpeed('Easy', this)" class="speed-btn" style="flex:1; background:#222; color:#FFC72C; border:1px solid #FFC72C; padding:8px 0; font-size:10px; cursor:pointer; border-radius:4px; font-weight:bold;">⚡ ШВИДКО</button>
                <button onclick="setSpeed('Medium', this)" class="speed-btn" style="flex:1; background:#111; color:#fff; border:1px solid #333; padding:8px 0; font-size:10px; cursor:pointer; border-radius:4px;">🥗 СЕРЕДНЬО</button>
                <button onclick="setSpeed('Hard', this)" class="speed-btn" style="flex:1; background:#111; color:#fff; border:1px solid #333; padding:8px 0; font-size:10px; cursor:pointer; border-radius:4px;">👨‍🍳 МАЮ ЧАС</button>
            </div>
            
            <div id="diet-plan-container"></div>
        `;
        renderDietPlan();
    }

    function renderDietPlan() {
        const container = document.getElementById('diet-plan-container');
        if (!container || !window.dietDatabase) return;

        const days = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];
        container.innerHTML = "";

        days.slice(0, 3).forEach(day => { // Показуємо перші 3 дні для компактності
            const b = dietDatabase.breakfasts.filter(m => m.speed === selectedSpeed)[0];
            const l = dietDatabase.lunches.filter(m => m.speed === selectedSpeed)[0];
            const d = dietDatabase.dinners.filter(m => m.speed === selectedSpeed)[0];

            const dayBox = document.createElement('div');
            dayBox.style.cssText = "background:#111; padding:12px; border-radius:6px; margin-bottom:10px; border: 1px solid #1a1a1a;";
            dayBox.innerHTML = `
                <div style="color:#FFC72C; font-size:11px; font-weight:bold; margin-bottom:8px; text-transform:uppercase;">${day}</div>
                <div style="font-size:12px; color:#eee; margin-bottom:4px;">🍳 ${b ? b.name : 'Сніданок PAC'}</div>
                <div style="font-size:12px; color:#eee; margin-bottom:4px;">🍱 ${l ? l.name : 'Обід PAC'}</div>
                <div style="font-size:12px; color:#eee;">🍗 ${d ? d.name : 'Вечеря PAC'}</div>
            `;
            container.appendChild(dayBox);
        });
    }

    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        weightChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага (кг)', data: [], borderColor: '#FFC72C', backgroundColor: 'rgba(255,199,44,0.05)', tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: '#1a1a1a' }, ticks: { color: '#666' } }, x: { grid: { display: false }, ticks: { color: '#666' } } }, plugins: { legend: { display: false } } }
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

            // Оновлюємо інтерфейс останню вагу
            const last = docs[0];
            updateScannerUI(last.weight, last.bmi, calculateAthleteData(last.weight, last.bmi, 180, 25));
            setupDietSection(calculateAthleteData(last.weight, last.bmi, 180, 25));
        }
    }

    async function loadBaseData() {
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (document.getElementById('user-height')) document.getElementById('user-height').value = data.height || "";
            if (document.getElementById('user-age')) document.getElementById('user-age').value = data.age || "";
        }
    }
})();
