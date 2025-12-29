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
        if (form) {
            form.addEventListener('submit', handleAthleteAnalysis);
        }
    });

    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const analysis = calculateAthleteData(w, bmi, h, a);

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
        let status, recommendation, statusColor, calorieModifier, pRatio, fRatio, cRatio;

        if (bmi < 20.5) { 
            status = "MUSCLE GAIN MODE";
            recommendation = "Ціль: Гіпертрофія. Профіцит +15%.";
            statusColor = "#00BFFF"; calorieModifier = 1.15; pRatio = 0.25; fRatio = 0.25; cRatio = 0.50; 
        } else if (bmi < 25.5) {
            status = "ATHLETIC FORM";
            recommendation = "Ціль: Рекімпозиція. Підтримка форми.";
            statusColor = "#FFC72C"; calorieModifier = 1.0; pRatio = 0.30; fRatio = 0.25; cRatio = 0.45;
        } else {
            status = "WEIGHT LOSS MODE";
            recommendation = "Ціль: Жироспалювання. Дефіцит -20%.";
            statusColor = "#DA3E52"; calorieModifier = 0.80; pRatio = 0.35; fRatio = 0.25; cRatio = 0.40;
        }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const targetCalories = Math.round(bmr * 1.55 * calorieModifier);
        
        return {
            status, recommendation, statusColor, targetCalories,
            prot: Math.round((targetCalories * pRatio) / 4),
            fat: Math.round((targetCalories * fRatio) / 9),
            carb: Math.round((targetCalories * cRatio) / 4)
        };
    }

    function updateScannerUI(weight, bmi, status, kcal, p, f, c, color, rec) {
        const mainValue = document.getElementById('fat-percentage-value');
        const smallLabel = document.querySelector('.main-circle small');
        
        // Приховуємо оригінальний <small>, бо ми малюємо свій напис всередині для кращого контролю
        if (smallLabel) smallLabel.style.display = "none";

        if (mainValue) { 
            let bmiColor = "#4CAF50"; 
            const bmiNum = parseFloat(bmi);
            if (bmiNum < 18.5) bmiColor = "#00BFFF"; 
            else if (bmiNum >= 25 && bmiNum < 30) bmiColor = "#FFC72C"; 
            else if (bmiNum >= 30) bmiColor = "#DA3E52"; 

            mainValue.style.display = "flex";
            mainValue.style.flexDirection = "column";
            mainValue.style.alignItems = "center";
            mainValue.style.justifyContent = "center";
            mainValue.style.height = "100%";
            mainValue.style.textAlign = "center";

            mainValue.innerHTML = `
                <span style="font-size: 10px; color: #666; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 5px;">Current Weight</span>
                <span style="font-size: 34px; color: #FFC72C; font-weight: bold; line-height: 1;">${weight}kg</span>
                <span style="font-size: 15px; color: ${bmiColor}; font-weight: bold; margin-top: 8px;">BMI: ${bmi}</span>
            `;
        }
        
        let rankElement = document.getElementById('athlete-rank');
        if (!rankElement) {
            rankElement = document.createElement('div');
            rankElement.id = 'athlete-rank';
            rankElement.style.textAlign = 'center';
            rankElement.style.marginTop = '15px';
            document.querySelector('.form-card:nth-child(2)').appendChild(rankElement);
        }
        rankElement.innerHTML = `<div style="color:${color}; font-size:18px; font-weight:bold;">${status}</div>
            <div style="color:#fff; font-size:24px; font-weight:bold;">${kcal} ккал</div>
            <div style="color:#aaa; font-size:11px;">Б: ${p}г | Ж: ${f}г | В: ${c}г</div>
            <div style="color:#FFC72C; font-size:11px; margin-top:10px; border-top:1px solid #222; padding-top:5px;">${rec}</div>`;
    }

    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId).orderBy('date', 'desc').limit(20).get();
        
        const historyContainer = getOrCreateCompactHistory();
        historyContainer.innerHTML = "";

        if (!snap.empty) {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const last = docs[0];
            
            const today = new Date().toISOString().split('T')[0];
            if (last.date === today) {
                const submitBtn = document.querySelector('#weight-form button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "ОНОВЛЕНО";
                    submitBtn.style.opacity = "0.5";
                }
            }

            updateScannerUI(last.weight, last.bmi, last.status, last.target_kcal, last.macros.p, last.macros.f, last.macros.c, last.statusColor, last.recommendation);

            const chartData = [...docs].reverse();
            weightChart.data.labels = chartData.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
            weightChart.data.datasets[0].data = chartData.map(d => d.weight);
            weightChart.update();

            docs.forEach(entry => {
                const item = document.createElement('div');
                item.style.cssText = "display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1a1a1a; padding:8px 0; font-size:13px;";
                item.innerHTML = `
                    <div style="color:#fff;"><strong>${entry.weight} kg</strong> <span style="color:#666; font-size:11px; margin-left:8px;">${entry.date}</span></div>
                    <button onclick="deleteWeightEntry('${entry.id}')" style="background:none; border:none; color:#DA3E52; cursor:pointer; font-size:14px;">✕</button>
                `;
                historyContainer.appendChild(item);
            });
        }
    }

    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        weightChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Вага (кг)', data: [], borderColor: '#FFC72C', backgroundColor: 'rgba(255,199,44,0.05)', tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    window.deleteWeightEntry = async (id) => {
        if (confirm("Видалити запис?")) {
            try { await firebase.firestore().collection('weight_history').doc(id).delete(); location.reload(); }
            catch (e) { console.error(e); }
        }
    };

    function getOrCreateCompactHistory() {
        let container = document.getElementById('compact-history');
        if (!container) {
            const chartCard = document.querySelector('.chart-card');
            const wrapper = document.createElement('div');
            wrapper.style.cssText = "margin-top:15px; max-height:180px; overflow-y:auto; padding-right:5px;";
            container = document.createElement('div');
            container.id = 'compact-history';
            wrapper.appendChild(container);
            chartCard.appendChild(wrapper);
        }
        return container;
    }

    async function loadBaseData() {
        if (!currentUserId) return;
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (document.getElementById('user-height')) document.getElementById('user-height').value = data.height || "";
            if (document.getElementById('user-age')) document.getElementById('user-age').value = data.age || "";
        }
    }
})();
