(function() {
    let weightChart = null;
    let currentUserId = null;

    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    // 1. АВТОРИЗАЦІЯ ТА РЕЖИМ АДМІНА
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = viewUserId || user.uid;
            console.log("ProAthleteCare Active ID:", currentUserId);
            loadBaseData();
            loadHistory(); // Завантажує і графік, і список під ним
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

    // 2. АНАЛІЗ ТА ЗБЕРЕЖЕННЯ
    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        let status, recommendation, statusColor, calorieModifier, pRatio, fRatio, cRatio;

        if (bmi < 20.5) { 
            status = "MUSCLE GAIN MODE";
            recommendation = "Ціль: Гіпертрофія. Профіцит +15%. Вуглеводи — паливо для росту.";
            statusColor = "#00BFFF"; 
            calorieModifier = 1.15;  
            pRatio = 0.25; fRatio = 0.25; cRatio = 0.50; 
        } else if (bmi < 25.5) {
            status = "ATHLETIC FORM";
            recommendation = "Ціль: Рекімпозиція. Підтримка форми та якісне відновлення.";
            statusColor = "#FFC72C"; 
            calorieModifier = 1.0;
            pRatio = 0.30; fRatio = 0.25; cRatio = 0.45;
        } else {
            status = "WEIGHT LOSS MODE";
            recommendation = "Ціль: Жироспалювання. Дефіцит -20%. Високий білок для захисту м'язів.";
            statusColor = "#DA3E52"; 
            calorieModifier = 0.80;  
            pRatio = 0.35; fRatio = 0.25; cRatio = 0.40;
        }

        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const maintenance = Math.round(bmr * 1.55); 
        const targetCalories = Math.round(maintenance * calorieModifier);
        const prot = Math.round((targetCalories * pRatio) / 4);
        const fat = Math.round((targetCalories * fRatio) / 9);
        const carb = Math.round((targetCalories * cRatio) / 4);

        // Оновлення UI Сканера
        updateScannerUI(bmi, status, targetCalories, prot, fat, carb, statusColor, recommendation);

        // Збереження в Firebase
        try {
            await firebase.firestore().collection('weight_history').add({
                userId: currentUserId,
                weight: w,
                bmi: bmi,
                target_kcal: targetCalories,
                macros: { p: prot, f: fat, c: carb },
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await firebase.firestore().collection('users').doc(currentUserId).set({
                height: h, age: a
            }, { merge: true });
            
            loadHistory();
        } catch (error) {
            console.error("Firebase Save Error:", error);
        }
    }

    function updateScannerUI(bmi, status, kcal, p, f, c, color, rec) {
        const mainCircleValue = document.getElementById('fat-percentage-value');
        if (mainCircleValue) {
            mainCircleValue.textContent = bmi;
            mainCircleValue.style.color = color;
        }
        
        let rankElement = document.getElementById('athlete-rank');
        if (!rankElement) {
            rankElement = document.createElement('div');
            rankElement.id = 'athlete-rank';
            rankElement.style.textAlign = 'center';
            rankElement.style.marginTop = '15px';
            document.querySelector('.form-card:nth-child(2)').appendChild(rankElement);
        }

        rankElement.innerHTML = `
            <div style="color:${color}; font-size: 18px; font-weight: bold;">${status}</div>
            <div style="color:#fff; font-size: 24px; font-weight: bold;">${kcal} ккал</div>
            <div style="color:#aaa; font-size: 12px;">Б: ${p}г | Ж: ${f}г | В: ${c}г</div>
            <div style="color:#FFC72C; font-size: 11px; margin-top: 10px; border-top: 1px solid #222; padding-top: 5px;">${rec}</div>
        `;
    }

    // 3. ГРАФІК ТА ІСТОРІЯ (СПИСОК)
    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        weightChart = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: { 
                labels: [], 
                datasets: [{ 
                    label: 'Вага (кг)', 
                    data: [], 
                    borderColor: '#FFC72C', 
                    backgroundColor: 'rgba(255,199,44,0.05)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true 
                }] 
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId)
            .orderBy('date', 'desc').limit(20).get();
        
        const historyContainer = getOrCreateHistoryContainer();
        historyContainer.innerHTML = ""; // Очистка списку

        if (!snap.empty) {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Оновлення графіка (треба реверснути для хронології зліва направо)
            const chartData = [...docs].reverse();
            weightChart.data.labels = chartData.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
            weightChart.data.datasets[0].data = chartData.map(d => d.weight);
            weightChart.update();

            // Побудова списку (як в Injury)
            docs.forEach(entry => {
                const item = document.createElement('div');
                item.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#0d0d0d; padding:12px; margin-bottom:8px; border-radius:6px; border-left:3px solid #FFC72C;";
                item.innerHTML = `
                    <div>
                        <span style="color:#FFC72C; font-weight:bold; font-size:16px;">${entry.weight} kg</span>
                        <div style="color:#666; font-size:11px;">${entry.date} | BMI: ${entry.bmi}</div>
                    </div>
                    <button onclick="deleteWeightEntry('${entry.id}')" style="background:none; border:none; color:#DA3E52; cursor:pointer; font-size:18px;">🗑</button>
                `;
                historyContainer.appendChild(item);
            });
        }
    }

    // Функція видалення (глобальна для onclick)
    window.deleteWeightEntry = async (id) => {
        if (confirm("Видалити цей запис ваги?")) {
            try {
                await firebase.firestore().collection('weight_history').doc(id).delete();
                loadHistory();
            } catch (e) { console.error(e); }
        }
    };

    function getOrCreateHistoryContainer() {
        let container = document.getElementById('weight-history-list');
        if (!container) {
            const mainContent = document.querySelector('.main-content');
            const historyTitle = document.createElement('h3');
            historyTitle.textContent = "📜 ІСТОРІЯ ЗАПИСІВ";
            historyTitle.style.cssText = "color:#FFC72C; margin-top:30px; font-size:16px; letter-spacing:1px;";
            
            container = document.createElement('div');
            container.id = 'weight-history-list';
            container.style.marginTop = "15px";
            
            mainContent.appendChild(historyTitle);
            mainContent.appendChild(container);
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
