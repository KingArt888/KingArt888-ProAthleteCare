(function() {
    let weightChart = null;
    let currentUserId = null;
    let selectedSpeed = 'Easy'; 
    let currentAnalysis = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            loadBaseData();
            loadHistory();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const form = document.getElementById('weight-form');
        if (form) form.addEventListener('submit', handleAthleteAnalysis);
        
        const planBtn = document.getElementById('get-diet-plan-btn');
        if (planBtn) planBtn.addEventListener('click', generateWeeklyPlan);
    });

    // 1. ФУНКЦІЯ ВИДАЛЕННЯ (Тепер працює!)
    window.deleteWeightEntry = async (id) => {
        if (confirm("Видалити цей запис?")) {
            try {
                await firebase.firestore().collection('weight_history').doc(id).delete();
                loadHistory(); // Оновлюємо список і графік миттєво
            } catch (e) {
                console.error("Помилка видалення:", e);
            }
        }
    };

    // 2. ОБРОБКА ТА РОЗРАХУНОК
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
                status: analysis.status,
                statusColor: analysis.statusColor,
                target_kcal: analysis.targetCalories,
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
        return { status, statusColor: color, targetCalories: kcal };
    }

    // 3. ОНОВЛЕННЯ COMPOSITION SCAN (ID виправлено!)
    function updateScannerUI(weight, bmi, data) {
        const bmiSpan = document.getElementById('bmi-value');
        if (bmiSpan) bmiSpan.textContent = bmi;

        const circle = document.getElementById('scan-main-circle');
        if (circle) {
            circle.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
                    <span style="font-size: 10px; color: #666; text-transform: uppercase;">Status</span>
                    <div style="color: ${data.statusColor}; font-size: 14px; font-weight: bold; margin-bottom: 5px;">${data.status}</div>
                    <span style="font-size: 38px; color: #FFC72C; font-weight: bold; line-height: 1;">${weight}kg</span>
                    <span style="font-size: 12px; color: #fff; margin-top: 5px;">BMI: ${bmi}</span>
                </div>
            `;
        }
    }

    function updateRecommendationUI(data) {
        const box = document.getElementById('athlete-recommendation-box');
        const selector = document.getElementById('speed-selector-container');
        if (box) {
            box.innerHTML = `
                <div style="border-left: 3px solid ${data.statusColor}; padding-left: 12px; background: rgba(255,255,255,0.03); padding: 10px; border-radius: 4px;">
                    <p style="color:#eee; font-size:14px; margin:0;">Режим: <strong>${data.status}</strong></p>
                    <p style="color:#ccc; font-size:13px; margin:5px 0 0 0; line-height:1.4;">
                        Тобі необхідно <strong>${data.targetCalories} ккал</strong> для досягнення цілі.
                    </p>
                </div>
            `;
        }
        if (selector) selector.style.display = 'block';
    }

    // 4. ІСТОРІЯ ТА ГРАФІК
    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(10).get();
        
        const docs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        
        // Оновлення графіка
        const chartData = [...docs].reverse();
        weightChart.data.labels = chartData.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
        weightChart.data.datasets[0].data = chartData.map(d => d.weight);
        weightChart.update();

        // Оновлення списку історії
        updateHistoryListUI(docs);

        // Якщо є дані, оновлюємо SCAN останній записом
        if (docs.length > 0) {
            const last = docs[0];
            const analysis = calculateAthleteData(last.weight, last.bmi, 180, 25);
            updateScannerUI(last.weight, last.bmi, analysis);
        }
    }

    function updateHistoryListUI(docs) {
        let list = document.getElementById('compact-history-list');
        if (!list) {
            const chartCard = document.querySelector('.chart-card');
            list = document.createElement('div');
            list.id = 'compact-history-list';
            list.style.cssText = "margin-top:15px; border-top:1px solid #222; padding-top:10px;";
            chartCard.appendChild(list);
        }

        list.innerHTML = docs.map(doc => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#111; padding:8px 12px; margin-bottom:6px; border-radius:4px; border:1px solid #1a1a1a;">
                <div>
                    <span style="color:#666; font-size:10px;">${doc.date.split('-').reverse().join('.')}</span>
                    <div style="color:#fff; font-weight:bold; font-size:13px;">${doc.weight} kg <small style="color:#444;">(${doc.bmi})</small></div>
                </div>
                <button onclick="deleteWeightEntry('${doc.id}')" style="background:none; border:none; color:#DA3E52; cursor:pointer; font-size:18px; padding:0 5px;">&times;</button>
            </div>
        `).join('');
    }

    // 5. ГЕНЕРАЦІЯ ТА ЗБЕРЕЖЕННЯ
    window.setSpeed = (speed, btn) => {
        selectedSpeed = speed;
        document.querySelectorAll('.speed-btn').forEach(b => {
            b.style.background = "#111"; b.style.borderColor = "#333";
        });
        btn.style.background = "#222"; btn.style.borderColor = "#FFC72C";
    };

    async function generateWeeklyPlan() {
        if (!currentAnalysis) return;
        const btn = document.getElementById('get-diet-plan-btn');
        btn.textContent = "ЗБЕРЕЖЕННЯ...";
        try {
            await firebase.firestore().collection('athlete_plans').doc(currentUserId).set({
                kcal: currentAnalysis.targetCalories,
                speed: selectedSpeed,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            document.getElementById('diet-container').innerHTML = `
                <div style="background: rgba(255,199,44,0.1); border: 1px solid #FFC72C; color:#fff; padding:10px; border-radius:4px; font-size:11px; text-align:center; margin-top:10px;">
                    ✅ ПЛАН НА 7 ДНІВ ЗАФІКСОВАНО
                </div>`;
            btn.textContent = "ГЕНЕРУВАТИ ПЛАН НА ТИЖДЕНЬ";
        } catch (e) { console.error(e); }
    }

    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        weightChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага', data: [], borderColor: '#FFC72C', backgroundColor: 'rgba(255,199,44,0.05)', tension: 0.4, fill: true }] },
            options: { 
                responsive: true, maintainAspectRatio: false,
                scales: { 
                    x: { ticks: { color: '#666', font: { size: 9 } }, grid: { display: false } },
                    y: { ticks: { color: '#666', font: { size: 9 } }, grid: { color: '#222' } }
                }
            }
        });
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
