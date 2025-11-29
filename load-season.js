// load-season.js
// ІНІЦІАЛІЗАЦІЯ ПІСЛЯ ЗАВАНТАЖЕННЯ DOM
document.addEventListener('DOMContentLoaded', initLoadControl);

function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

function initLoadControl() {
    if (typeof Chart === 'undefined') {
        console.error("Chart.js не завантажено. Перевірте підключення бібліотеки у load-season.html.");
        return;
    }
    
    // --- КОНСТАНТИ ACWR ---
    const STORAGE_KEY = 'proathletecare_load_data';
    const ACWR_OPTIMAL_MIN = 0.8;
    const ACWR_OPTIMAL_MAX = 1.3;
    const ACWR_HIGH_RISK = 1.5;
    const ACWR_LOW_RISK = 0.5;

    // --- ЕЛЕМЕНТИ DOM ---
    const loadForm = document.getElementById('load-form');
    const submitLoadBtn = document.getElementById('submit-load-btn');
    const acwrRpeValue = document.getElementById('acwr-rpe-value');
    const riskStatusCard = document.getElementById('risk-status-card');
    const acwrRpeTrendIcon = document.getElementById('acwr-rpe-trend-icon');

    // --- Екземпляри графіків ---
    let acwrChartInstance;
    let miniLoadTrendChartInstance; // Міні-графік
    let loadTrendChartInstance;
    let distanceChartInstance;

    // Встановлюємо сьогоднішню дату за замовчуванням
    document.getElementById('load-date').value = getTodayDateString();

    // --- ФУНКЦІЇ ЗБЕРІГАННЯ ДАНИХ ---
    function loadData() {
        try {
            const json = localStorage.getItem(STORAGE_KEY);
            // Сортуємо дані, щоб вони завжди були в хронологічному порядку
            return json ? JSON.parse(json).sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
        } catch (e) {
            console.error("Помилка завантаження даних:", e);
            return [];
        }
    }

    function saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // --- ФУНКЦІЯ РОЗРАХУНКУ ACWR ---
    function calculateACWR(data, type = 'rpe') {
        const results = [];
        if (data.length === 0) return results;

        const loadMap = new Map();
        data.forEach(d => {
            let loadValue = 0;
            // Розрахунок Internal Load (Session-RPE)
            if (type === 'rpe' && d.duration && d.rpe) {
                loadValue = d.duration * d.rpe; 
            // Розрахунок External Load (Дистанція)
            } else if (type === 'distance' && d.distance) {
                loadValue = d.distance; 
            }
            loadMap.set(d.date, loadValue);
        });

        // Визначаємо період розрахунку
        const sortedDates = data.map(d => new Date(d.date)).sort((a, b) => a - b);
        if (sortedDates.length === 0) return results;

        const today = new Date();
        const endDate = new Date(Math.max(sortedDates[sortedDates.length - 1].getTime(), today.getTime()));
        
        // Починаємо розрахунок за 27 днів до першої дати, щоб отримати повний хронічний лоад
        const effectiveStartDate = new Date(sortedDates[0]);
        effectiveStartDate.setDate(effectiveStartDate.getDate() - 27);

        let current = effectiveStartDate;

        while (current <= endDate) {
            const currentDateStr = current.toISOString().split('T')[0];
            
            // --- Acute Load (7 days Sum) ---
            let acuteLoadSum = 0;
            for (let i = 0; i < 7; i++) {
                const date = new Date(current);
                date.setDate(current.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                acuteLoadSum += (loadMap.get(dateStr) || 0);
            }
            const acute = acuteLoadSum;

            // --- Chronic Load (28 days Sum / 28) ---
            let chronicLoadSum = 0;
            for (let i = 0; i < 28; i++) {
                const date = new Date(current);
                date.setDate(current.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                chronicLoadSum += (loadMap.get(dateStr) || 0);
            }
            const chronicAvg = chronicLoadSum / 28;
            
            let acwr = null;
            if (chronicAvg > 0) {
                acwr = acute / chronicAvg;
            }

            // Додаємо результат, тільки якщо ми в рамках періоду, за який є дані (або пізніше)
            if (current >= sortedDates[0]) {
                 results.push({
                    date: currentDateStr,
                    acwr: acwr,
                    acute: acute,
                    chronic: chronicAvg * 7, // Для порівняння: 7-денний Acute vs 7-денний Chronic
                    dailyLoad: (loadMap.get(currentDateStr) || 0)
                });
            }
            current.setDate(current.getDate() + 1);
        }
        return results;
    }

    // --- ОБРОБКА ФОРМИ ---
    if (loadForm) {
        loadForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!document.querySelector('input[name="rpe"]:checked')) {
                alert('Будь ласка, оберіть суб’єктивне навантаження (RPE) від 1 до 10.');
                return;
            }

            const data = new FormData(loadForm);
            const date = data.get('date');
            const duration = parseInt(data.get('duration'));
            const distance = parseInt(data.get('distance')) || 0; 
            const rpe = parseInt(document.querySelector('input[name="rpe"]:checked').value); // Беремо значення з обраного radio

            const allData = loadData();
            const newDataEntry = { date, duration, distance, rpe };

            const existingIndex = allData.findIndex(item => item.date === date);
            if (existingIndex !== -1) {
                if (!confirm(`Дані за ${date} вже існують. Ви хочете їх оновити?`)) {
                    return;
                }
                allData[existingIndex] = newDataEntry;
            } else {
                allData.push(newDataEntry);
            }
            
            saveData(allData);
            alert('Дані про тренування успішно зафіксовано!');
            
            loadForm.reset();
            document.getElementById('load-date').value = getTodayDateString(); 
            updateDashboard();
        });
    }

    // --- ОНОВЛЕННЯ ДАШБОРДУ ТА ГРАФІКІВ ---
    function updateDashboard() {
        const allData = loadData();
        
        if (allData.length < 7) { 
            acwrRpeValue.textContent = "N/A";
            if (acwrRpeTrendIcon) acwrRpeTrendIcon.style.display = 'none';
            submitLoadBtn.className = 'gold-button status-grey';
            submitLoadBtn.textContent = 'Недостатньо даних (потрібно >7 дн.)';
            riskStatusCard.className = 'chart-card status-grey';
            riskStatusCard.innerHTML = `<p style="font-size: 1.1em; color: #999; font-weight: bold; margin: 0;">Збір даних</p>
                                        <p style="font-size: 0.8em; color: #888; margin: 5px 0 0 0;">(Потрібно 28 днів для повного ACWR)</p>`;
             if (acwrChartInstance) acwrChartInstance.destroy();
             if (loadTrendChartInstance) loadTrendChartInstance.destroy();
             if (distanceChartInstance) distanceChartInstance.destroy();
            return;
        }

        const acwrRpeResults = calculateACWR(allData, 'rpe');
        const acwrDistanceResults = calculateACWR(allData, 'distance');

        const latestRpeResult = acwrRpeResults[acwrRpeResults.length - 1];
        let latestACWR = null;
        
        if (latestRpeResult && latestRpeResult.acwr !== null) {
            latestACWR = parseFloat(latestRpeResult.acwr.toFixed(2));
            acwrRpeValue.textContent = latestACWR;
            if (acwrRpeTrendIcon) acwrRpeTrendIcon.style.display = 'inline'; 

            let statusText = '';
            let statusClass = '';
            let buttonClass = '';
            let emoji = '';

            // Визначення ризику
            if (latestACWR >= ACWR_HIGH_RISK) {
                statusText = 'Високий Ризик Травми';
                statusClass = 'status-danger';
                buttonClass = 'status-danger';
                emoji = '🔴';
            } else if (latestACWR >= ACWR_OPTIMAL_MAX) {
                statusText = 'Підвищений Ризик (Увага)';
                statusClass = 'status-warning';
                buttonClass = 'status-warning';
                emoji = '⚠️';
            } else if (latestACWR >= ACWR_OPTIMAL_MIN) {
                statusText = 'Оптимальна Зона';
                statusClass = 'status-optimal';
                buttonClass = 'status-optimal';
                emoji = '✅';
            } else if (latestACWR >= ACWR_LOW_RISK) {
                statusText = 'Недостатній Обсяг (Увага)';
                statusClass = 'status-warning';
                buttonClass = 'status-warning';
                emoji = '⚠️';
            } else {
                statusText = 'Низький Обсяг (Детренування)';
                statusClass = 'status-danger';
                buttonClass = 'status-danger';
                emoji = '🔴';
            }

            // Визначення тренду
            let trendIcon = '';
            let trendColor = '';
            if (acwrRpeResults.length > 1) {
                const prevACWR = acwrRpeResults[acwrRpeResults.length - 2].acwr || latestACWR; 
                if (latestACWR > prevACWR) {
                    trendIcon = '▲ Зростання';
                    trendColor = '#DA3E52'; 
                } else if (latestACWR < prevACWR) {
                    trendIcon = '▼ Зниження';
                    trendColor = '#4CAF50'; 
                } else {
                    trendIcon = '— Стабільність';
                    trendColor = '#CCCCCC';
                }
            } else {
                trendIcon = '';
                trendColor = '#CCCCCC';
            }
            
            riskStatusCard.className = `chart-card ${statusClass}`;
            riskStatusCard.innerHTML = `
                <p style="font-size: 1.1em; color: ${statusClass === 'status-danger' ? '#DA3E52' : statusClass === 'status-warning' ? '#FF9800' : '#4CAF50'}; font-weight: bold; margin: 0;">
                    <span style="font-size: 1.5em; margin-right: 5px;">${emoji}</span> ${statusText}
                </p>
                <p style="font-size: 0.8em; color: #999; margin: 5px 0 0 0;">0.8 — 1.3 (Оптимально)</p>
            `;
            
            if (acwrRpeTrendIcon) acwrRpeTrendIcon.innerHTML = `<span style="color: ${trendColor};">${trendIcon}</span>`;

            // Оновлення кнопки
            submitLoadBtn.className = `gold-button ${buttonClass}`;
            submitLoadBtn.textContent = 'Зафіксувати Навантаження';

        } 

        // Рендер графіків
        renderACWRChart(acwrRpeResults);
        renderMiniLoadTrendChart(acwrRpeResults);
        renderLoadTrendChart(acwrRpeResults);
        renderDistanceChart(acwrDistanceResults);
    }

    // --- БАЗОВІ НАЛАШТУВАННЯ ГРАФІКІВ ---
    const baseChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#BBBBBB' } },
            tooltip: { backgroundColor: 'rgba(13, 13, 13, 0.9)', titleColor: '#FFC72C', bodyColor: '#CCCCCC', borderColor: '#333', borderWidth: 1 }
        },
        scales: {
            x: { grid: { color: '#1a1a1a' }, ticks: { color: '#BBBBBB' } },
            y: { grid: { color: '#1a1a1a' }, ticks: { color: '#BBBBBB' } }
        }
    };

    // --- 3.1. ACWR Chart (Головний графік ризику) ---
    function renderACWRChart(results) {
        const ctx = document.getElementById('acwrChart');
        if (!ctx) return;

        if (acwrChartInstance) acwrChartInstance.destroy();

        const filteredResults = results.slice(-60); // 60 днів
        const labels = filteredResults.map(r => r.date.slice(5)); 
        const acwrData = filteredResults.map(r => r.acwr);
        const acuteData = filteredResults.map(r => r.acute);
        const chronicData = filteredResults.map(r => r.chronic);

        const data = {
            labels: labels,
            datasets: [{
                label: 'ACWR (Співвідношення)',
                data: acwrData,
                borderColor: '#FFC72C', // ACWR - Золота лінія
                backgroundColor: 'rgba(255, 199, 44, 0.2)',
                tension: 0.2,
                fill: false,
                yAxisID: 'yACWR',
                borderWidth: 2,
            },
            {
                label: 'Гостре Навантаження (7 днів)',
                data: acuteData,
                borderColor: '#4CAF50', // Гостре - Зелений
                backgroundColor: 'transparent',
                tension: 0.2,
                fill: false,
                yAxisID: 'yLoad',
                borderWidth: 1,
                hidden: true // Можемо приховати за замовчуванням
            },
            {
                label: 'Хронічне Навантаження (28 днів)',
                data: chronicData,
                borderColor: '#00BFFF', // Хронічне - Блакитний
                backgroundColor: 'transparent',
                tension: 0.2,
                fill: false,
                yAxisID: 'yLoad',
                borderWidth: 1,
                hidden: true // Можемо приховати за замовчуванням
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                ...baseChartOptions,
                scales: {
                    x: baseChartOptions.scales.x,
                    yACWR: { // Ліва вісь для ACWR (0.0 - 2.0)
                        type: 'linear',
                        position: 'left',
                        min: 0,
                        max: 2.0,
                        ticks: { ...baseChartOptions.scales.y.ticks, stepSize: 0.2 },
                        title: { display: true, text: 'ACWR', color: '#BBBBBB' },
                        grid: baseChartOptions.scales.y.grid
                    },
                    yLoad: { // Права вісь для Acute/Chronic Load (великі значення)
                        type: 'linear',
                        position: 'right',
                        grid: { drawOnChartArea: false }, // Не малюємо сітку для цієї осі
                        ticks: { ...baseChartOptions.scales.y.ticks }
                    }
                },
                plugins: {
                    ...baseChartOptions.plugins,
                    annotation: {
                        annotations: {
                            optimalMax: { type: 'line', yMin: ACWR_OPTIMAL_MAX, yMax: ACWR_OPTIMAL_MAX, borderColor: '#FF9800', borderWidth: 1, borderDash: [5, 5], scaleID: 'yACWR' },
                            optimalMin: { type: 'line', yMin: ACWR_OPTIMAL_MIN, yMax: ACWR_OPTIMAL_MIN, borderColor: '#FF9800', borderWidth: 1, borderDash: [5, 5], scaleID: 'yACWR' },
                            safeZone: { type: 'box', yMin: ACWR_OPTIMAL_MIN, yMax: ACWR_OPTIMAL_MAX, backgroundColor: 'rgba(76, 175, 80, 0.1)', scaleID: 'yACWR' },
                            riskZone: { type: 'box', yMin: ACWR_HIGH_RISK, yMax: 2.0, backgroundColor: 'rgba(218, 62, 82, 0.15)', scaleID: 'yACWR' }
                        }
                    }
                }
            }
        };

        acwrChartInstance = new Chart(ctx, config);
    }
    
    // --- 3.2. Mini Load Trend Chart (Графік на картці статусу) ---
    function renderMiniLoadTrendChart(results) {
        const ctx = document.getElementById('miniLoadTrendChart');
        if (!ctx) return;
        
        if (miniLoadTrendChartInstance) miniLoadTrendChartInstance.destroy();

        const filteredResults = results.slice(-14); // Останні 14 днів
        const labels = filteredResults.map(r => r.date.slice(5)); 
        const dailyLoad = filteredResults.map(r => r.dailyLoad); // Щоденний Session-RPE Load

        const data = {
            labels: labels,
            datasets: [{
                label: 'Щоденне Навантаження',
                data: dailyLoad,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                tension: 0.4,
                fill: true,
                pointRadius: 0 // Приховуємо точки для чистоти
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false, grid: { display: false } },
                    y: { display: false, grid: { display: false }, min: 0 }
                },
                elements: { line: { borderWidth: 2 } }
            }
        };

        miniLoadTrendChartInstance = new Chart(ctx, config);
    }


    // --- 3.3. Load Trend Chart (Комбінований графік) ---
    function renderLoadTrendChart(results) {
        const ctx = document.getElementById('loadTrendChart');
        if (!ctx) return;

        if (loadTrendChartInstance) loadTrendChartInstance.destroy();

        // Спрощений підрахунок тижневих даних для демонстрації комбінованого графіка
        const weeklyDataMap = {};
        
        results.forEach(r => {
            const date = new Date(r.date);
            // Визначаємо початок тижня (наприклад, понеділок)
            const dayOfWeek = (date.getDay() + 6) % 7; // Понеділок = 0
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - dayOfWeek);
            const weekKey = startOfWeek.toISOString().split('T')[0];
            
            if (!weeklyDataMap[weekKey]) {
                weeklyDataMap[weekKey] = {
                    totalLoad: 0,
                    acwrSum: 0,
                    acwrCount: 0,
                    label: `W-${weekKey.slice(5, 7)}/${weekKey.slice(8)}`
                };
            }
            if (r.dailyLoad > 0) { // Сумуємо навантаження
                 weeklyDataMap[weekKey].totalLoad += r.dailyLoad;
            }
            if (r.acwr !== null) { // Беремо ACWR тільки там, де він розрахований
                weeklyDataMap[weekKey].acwrSum += r.acwr;
                weeklyDataMap[weekKey].acwrCount += 1;
            }
        });
        
        const weeklyResults = Object.values(weeklyDataMap).slice(-12); // Останні 12 тижнів
        
        const barLabels = weeklyResults.map(w => w.label);
        const barData = weeklyResults.map(w => w.totalLoad); 
        const lineData = weeklyResults.map(w => w.acwrCount > 0 ? (w.acwrSum / w.acwrCount) : null); // Середній ACWR за тиждень

        // Функція, що повертає колір для сегмента лінії
        function getColorSegment(acwr) {
            if (acwr >= ACWR_HIGH_RISK) return 'rgb(255, 0, 0)'; 
            if (acwr >= ACWR_OPTIMAL_MAX || acwr <= ACWR_OPTIMAL_MIN) return 'rgb(255, 165, 0)'; 
            return 'rgb(69, 179, 114)'; 
        }

        const data = {
            labels: barLabels,
            datasets: [{
                // Стовпці (Weekly Load Sum)
                label: 'Тижневе Навантаження (Internal Load)',
                data: barData,
                backgroundColor: 'rgba(69, 179, 114, 0.8)', 
                type: 'bar',
                yAxisID: 'yBar',
                borderWidth: 0,
            },
            {
                // Лінія (ACWR Trend)
                label: 'Середній ACWR за тиждень',
                data: lineData,
                borderColor: (context) => {
                    const acwrValue = context.raw;
                    return acwrValue !== null ? getColorSegment(acwrValue) : '#999';
                },
                backgroundColor: 'transparent',
                type: 'line',
                yAxisID: 'yLine',
                tension: 0.2,
                pointRadius: 4,
                borderWidth: 3,
            }]
        };

        const config = {
            type: 'bar', 
            data: data,
            options: {
                ...baseChartOptions, 
                scales: {
                    x: { 
                        ...baseChartOptions.scales.x,
                        ticks: { color: '#BBBBBB', maxRotation: 45, minRotation: 45 }
                    },
                    yBar: { 
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        title: { display: true, text: 'Тижневе Навантаження', color: '#BBBBBB' },
                        grid: { drawOnChartArea: false },
                        ticks: baseChartOptions.scales.y.ticks
                    },
                    yLine: { 
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 2.0,
                        title: { display: true, text: 'Середній ACWR', color: '#BBBBBB' },
                        ticks: { ...baseChartOptions.scales.y.ticks, stepSize: 0.2 }
                    }
                },
                plugins: {
                    ...baseChartOptions.plugins,
                    annotation: false 
                }
            }
        };

        loadTrendChartInstance = new Chart(ctx, config);
    }
    
    // --- 3.4. Distance Chart (Графік зовнішнього навантаження) ---
     function renderDistanceChart(results) {
        const ctx = document.getElementById('distanceChart');
        if (!ctx) return;

        if (distanceChartInstance) distanceChartInstance.destroy();

        const filteredResults = results.slice(-60); 
        const labels = filteredResults.map(r => r.date.slice(5)); 
        const dailyDistance = filteredResults.map(r => r.dailyLoad); // Тут dailyLoad = Distance
        const cumulativeDistance = [];
        let runningSum = 0;
        
        dailyDistance.forEach(d => {
            runningSum += d;
            cumulativeDistance.push(runningSum);
        });

        const data = {
            labels: labels,
            datasets: [{
                label: 'Накопичена Дистанція (м)',
                data: cumulativeDistance,
                borderColor: '#00BFFF', 
                backgroundColor: 'rgba(0, 191, 255, 0.2)',
                tension: 0.3,
                fill: 'origin',
                yAxisID: 'yCumulative',
                borderWidth: 2,
            },
            {
                label: 'Щоденна Дистанція (м)',
                data: dailyDistance,
                borderColor: '#FFC72C', 
                backgroundColor: 'transparent',
                tension: 0.3,
                fill: false,
                yAxisID: 'yDaily',
                borderWidth: 1,
                hidden: true
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                ...baseChartOptions,
                scales: {
                    x: baseChartOptions.scales.x,
                    yCumulative: { 
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: 'Накопичена Дистанція (м)', color: '#BBBBBB' },
                        ticks: baseChartOptions.scales.y.ticks,
                        grid: baseChartOptions.scales.y.grid
                    },
                    yDaily: {
                         type: 'linear',
                        position: 'right',
                        title: { display: true, text: 'Щоденна Дистанція (м)', color: '#BBBBBB' },
                        grid: { drawOnChartArea: false },
                        ticks: baseChartOptions.scales.y.ticks,
                        min: 0
                    }
                },
                plugins: baseChartOptions.plugins
            }
        };

        distanceChartInstance = new Chart(ctx, config);
    }


    // --- ФІНАЛЬНИЙ ВИКЛИК ---
    updateDashboard();
}
