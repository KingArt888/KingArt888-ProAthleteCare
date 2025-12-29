(function() {
    let weightChart = null;
    let currentUserId = null;
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
        if (form) {
            form.addEventListener('submit', handleAthleteAnalysis);
        }
    });

    // Функція вибору швидкості приготування
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

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const analysis = calculateAthleteData(w, bmi, h, a);

        updateScannerUI(w, bmi, analysis);
        updateRecommendationUI(analysis);

        try {
            await firebase.firestore().collection('weight_history').add({
                userId: currentUserId,
                weight: w,
                bmi: bmi,
                target_kcal: analysis.targetCalories,
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
        let status, color, modifier, motivation;
        if (bmi < 20.5) { 
            status = "MUSCLE GAIN"; color = "#00BFFF"; modifier = 1.15;
            motivation = "Твоє тіло — це будівельний майданчик. Дай йому достатньо енергії для росту!";
        } else if (bmi < 25.5) {
            status = "ATHLETIC FORM"; color = "#FFC72C"; modifier = 1.0;
            motivation = "Ти у чудовій формі! Підтримуй цей баланс для максимальної продуктивності.";
        } else {
            status = "WEIGHT LOSS"; color = "#DA3E52"; modifier = 0.85;
            motivation = "Кожен крок наближає тебе до пікової форми. Дисципліна б'є талант!";
        }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const kcal = Math.round(bmr * 1.55 * modifier);
        return { status, statusColor: color, targetCalories: kcal, motivation };
    }

    // Модуль COMPOSITION SCAN (Status, Вага, BMI)
    function updateScannerUI(weight, bmi, data) {
        const circle = document.getElementById('scan-main-circle');
        if (circle) {
            circle.innerHTML = `
                <span style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Status</span>
                <div style="color: ${data.statusColor}; font-size: 14px; font-weight: bold; margin-bottom: 5px;">${data.status}</div>
                <span style="font-size: 38px; color: #FFC72C; font-weight: bold; line-height: 1;">${weight}kg</span>
                <span style="font-size: 14px; color: #fff; margin-top: 5px;">BMI: ${bmi}</span>
            `;
        }
    }

    // Модуль АНАЛІЗ ТА РЕКОМЕНДАЦІЇ
    function updateRecommendationUI(data) {
        const box = document.getElementById('athlete-recommendation-box');
        const selector = document.getElementById('speed-selector-container');
        
        if (box) {
            box.innerHTML = `
                <div style="border-left: 3px solid ${data.statusColor}; padding-left: 10px; margin-bottom: 15px;">
                    <p style="color:#eee; font-size:14px; margin:0;">Режим: <strong>${data.status}</strong></p>
                    <p style="color:#eee; font-size:13px; margin:8px 0 0 0; line-height:1.4;">
                        <strong>РЕКОМЕНДАЦІЯ:</strong> Тобі необхідно <strong>${data.targetCalories} ккал</strong> в день для досягнення пікової форми.
                    </p>
                    <p style="color:#FFC72C; font-size:12px; font-style:italic; margin-top:10px;">"${data.motivation}"</p>
                </div>
            `;
        }
        if (selector) selector.style.display = 'block';
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
            const last = docs[0];
            const analysis = calculateAthleteData(last.weight, last.bmi, 180, 25);
            
            updateScannerUI(last.weight, last.bmi, analysis);
            updateRecommendationUI(analysis);

            const chartData = [...docs].reverse();
            weightChart.data.labels = chartData.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
            weightChart.data.datasets[0].data = chartData.map(d => d.weight);
            weightChart.update();
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
