(function() {
    let weightChart = null;
    let currentUserId = null;

    // 1. ПАРАМЕТРИ URL ТА АВТОРИЗАЦІЯ (Твій блок без змін)
    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Якщо є userId в URL - ми в режимі адміна, якщо ні - беремо ID поточного юзера
            currentUserId = viewUserId || user.uid;
            console.log("ProAthleteCare Active ID:", currentUserId);
            loadBaseData();
            loadHistory();
        } else {
            // Анонімний вхід для стабільності сесії
            firebase.auth().signInAnonymously().catch(e => console.error("Auth error:", e));
        }
    });

    // 2. ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ
    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const form = document.getElementById('weight-form');
        if (form) {
            form.addEventListener('submit', handleAthleteAnalysis);
        }
    });

    // 3. ГОЛОВНА ЛОГІКА: АНАЛІЗ, РОЗРАХУНОК ТА ЗБЕРЕЖЕННЯ
    async function handleAthleteAnalysis(e) {
        e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        // Розрахунок BMI
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        
        // Визначення стратегії харчування
        let status, recommendation, statusColor, calorieModifier, pRatio, fRatio, cRatio;

        if (bmi < 20.5) { 
            // РЕЖИМ НАБОРУ МАСИ
            status = "MUSCLE GAIN MODE";
            recommendation = "Ціль: Гіпертрофія. Профіцит +15%. Вуглеводи — паливо для росту.";
            statusColor = "#00BFFF"; // Синій
            calorieModifier = 1.15;  
            pRatio = 0.25; fRatio = 0.25; cRatio = 0.50; 
        } else if (bmi < 25.5) {
            // ПІДТРИМКА ТА РЕКОМПОЗИЦІЯ
            status = "ATHLETIC FORM";
            recommendation = "Ціль: Рекімпозиція. Підтримка форми та якісне відновлення.";
            statusColor = "#FFC72C"; // Золотий
            calorieModifier = 1.0;
            pRatio = 0.30; fRatio = 0.25; cRatio = 0.45;
        } else {
            // РЕЖИМ СХУДНЕННЯ
            status = "WEIGHT LOSS MODE";
            recommendation = "Ціль: Жироспалювання. Дефіцит -20%. Високий білок для захисту м'язів.";
            statusColor = "#DA3E52"; // Червоний
            calorieModifier = 0.80;  
            pRatio = 0.35; fRatio = 0.25; cRatio = 0.40;
        }

        // Професійний розрахунок калорій (Mifflin-St Jeor)
        const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        const maintenance = Math.round(bmr * 1.55); // Коефіцієнт активного атлета
        const targetCalories = Math.round(maintenance * calorieModifier);

        // Розрахунок БЖВ у грамах
        const prot = Math.round((targetCalories * pRatio) / 4);
        const fat = Math.round((targetCalories * fRatio) / 9);
        const carb = Math.round((targetCalories * cRatio) / 4);

        // ОНОВЛЕННЯ ІНТЕРФЕЙСУ (Блок COMPOSITION SCAN)
        const mainCircleValue = document.getElementById('fat-percentage-value');
        if (mainCircleValue) {
            mainCircleValue.textContent = bmi;
            mainCircleValue.style.color = statusColor;
        }
        
        const smallLabel = document.querySelector('.main-circle small');
        if (smallLabel) smallLabel.textContent = "BMI INDEX";

        const bmiBadge = document.getElementById('bmi-value');
        if (bmiBadge) bmiBadge.textContent = bmi;

        // Виведення статусу та рекомендацій
        let rankElement = document.getElementById('athlete-rank');
        if (!rankElement) {
            // Створюємо елемент, якщо його немає в HTML
            rankElement = document.createElement('div');
            rankElement.id = 'athlete-rank';
            rankElement.style.textAlign = 'center';
            rankElement.style.marginTop = '15px';
            document.querySelector('.form-card:nth-child(2)').appendChild(rankElement);
        }

        rankElement.innerHTML = `
            <div style="color:${statusColor}; font-size: 18px; font-weight: bold; margin-bottom: 5px;">${status}</div>
            <div style="color:#fff; font-size: 24px; font-weight: bold;">${targetCalories} ккал</div>
            <div style="color:#aaa; font-size: 13px; margin-top: 5px;">
                Б: ${prot}г | Ж: ${fat}г | В: ${carb}г
            </div>
            <div style="color:#FFC72C; font-size: 11px; margin-top: 10px; padding: 10px; background: rgba(255,199,44,0.05); border-radius: 6px; border: 1px dashed rgba(255,199,44,0.2);">
                ${recommendation}
            </div>
        `;

        // ЗБЕРЕЖЕННЯ В FIREBASE (v8)
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
                height: h,
                age: a
            }, { merge: true });
            
            loadHistory();
        } catch (error) {
            console.error("Firebase Save Error:", error);
        }
    }

    // 4. ГРАФІК (Chart.js)
    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { 
                labels: [], 
                datasets: [{ 
                    label: 'Вага (кг)', 
                    data: [], 
                    borderColor: '#FFC72C', 
                    backgroundColor: 'rgba(255,199,44,0.05)',
                    borderWidth: 2,
                    pointBackgroundColor: '#FFC72C',
                    tension: 0.4,
                    fill: true 
                }] 
            },
            options: { 
                responsive: true,
