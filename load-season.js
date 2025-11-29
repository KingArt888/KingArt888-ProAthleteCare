/* ========================================================== */
/* ЛОГІКА ДЛЯ СТОРІНКИ LOAD SEASON                            */
/* Використовує Chart.js та дані з localStorage (RPE & Distance)*/
/* ========================================================== */

document.addEventListener('DOMContentLoaded', function() {
    // -----------------------------------------------------
    // 1. КОНСТАНТИ ТА ІНІЦІАЛІЗАЦІЯ
    // -----------------------------------------------------
    if (typeof Chart === 'undefined' || typeof chartjs.plugins.annotation === 'undefined') {
        console.error("Помилка: Не завантажено Chart.js або Annotation Plugin. Перевірте підключення у <head>.");
        return;
    }

    const STORAGE_KEY = 'proathletecare_load_data';
    const ACWR_OPTIMAL_MIN = 0.8;
    const ACWR_OPTIMAL_MAX = 1.3;
    const ACWR_HIGH_RISK = 1.5;
    const ACWR_LOW_RISK = 0.5;

    // Елементи DOM
    const loadForm = document.getElementById('load-form');
    const submitLoadBtn = document.getElementById('submit-load-btn');
    const acwrRpeValue = document.getElementById('acwr-rpe-value');
    const riskStatusCard = document.getElementById('risk-status-card');
    const acwrRpeTrendIcon = document.getElementById('acwr-rpe-trend-icon');

    // Екземпляри графіків
    let acwrChartInstance;
    let loadTrendChartInstance;
    let distanceChartInstance;

    // Встановлюємо сьогоднішню дату для зручності
    document.getElementById('load-date').value = new Date().toISOString().split('T')[0];

    // -----------------------------------------------------
    // 2. ФУНКЦІЇ ЗБЕРІГАННЯ ДАНИХ
    // -----------------------------------------------------

    function loadData() {
        try {
            const json = localStorage.getItem(STORAGE_KEY);
            return json ? JSON.parse(json).sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
        } catch (e) {
            console.error("Помилка завантаження даних:", e);
            return [];
        }
    }

    function saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // -----------------------------------------------------
    // 3. ФУНКЦІЯ РОЗРАХУНКУ ACWR
    // -----------------------------------------------------

    function calculateACWR(data, type = 'rpe') {
        const results = [];
        if (data.length === 0) return results;

        const loadMap = new Map();
        data.forEach(d => {
            let loadValue;
            if (type === 'rpe') {
                // RPE-Load = Duration * RPE
                loadValue = d.duration * d.rpe; 
            } else if (type === 'distance') {
                // External Load (Distance)
                loadValue = d.distance; 
            }
            loadMap.set(d.date, loadValue);
        });

        // Визначаємо діапазон дат для розрахунку (потрібно 28 днів історії)
        const sortedDates = data.map(d => new Date(d.date)).sort((a, b) => a - b);
        const startDate = sortedDates[0];
        const today = new Date();
        const endDate = new Date(Math.max(sortedDates[sortedDates.length - 1].getTime(), today.getTime()));
        
        const effectiveStartDate = new Date(startDate);
        effectiveStartDate.setDate(startDate.getDate() - 27);

        let current = new Date(effectiveStartDate);

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

            if (current >= startDate) {
                 results.push({
                    date: currentDateStr,
                    acwr: acwr,
                    acute: acute,
                    chronic: chronicAvg * 7, // Chronic 7-day equivalent for visual comparison
                    dailyLoad: (loadMap.get(currentDateStr) || 0)
                });
            }
            current.setDate(current.getDate() + 1);
        }
        return results;
    }

    // -----------------------------------------------------
    // 4. ОБРОБКА ФОРМИ
    // -----------------------------------------------------

    loadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Перевірка на вибір RPE
        if (!document.querySelector('input[name="rpe"]:checked')) {
            alert('Будь ласка, оберіть суб’єктивне навантаження (RPE) від 1 до 10.');
            return;
        }

        const data = new FormData(loadForm);
        const date = data.get('date');
        const duration = parseInt(data.get('duration'));
        const distance = parseInt(data.get('distance'));
        const rpe = parseInt(data.get('rpe'));

        const allData = loadData();

        // Створюємо новий об'єкт даних
        const newDataEntry = { date, duration, distance, rpe };

        // Перевірка на дублікат даних (якщо сьогодні вже зафіксовано)
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
        
        // Очищення форми (крім дати) та оновлення дашборду
        loadForm.reset();
        document.getElementById('load-date').value = new Date().toISOString().split('T')[0]; // Знову встановлюємо сьогоднішню дату
        updateDashboard();
    });

    // -----------------------------------------------------
    // 5. ОНОВЛЕННЯ ДАШБОРДУ (ACWR STATUS)
    // -----------------------------------------------------

    function updateDashboard() {
        const allData = loadData();
        
        if (allData.length < 28) {
            // Потрібно мінімум 28 днів для розрахунку ACWR
            acwrRpeValue.textContent = "N/A";
            acwrRpeTrendIcon.style.display = 'none';
            submitLoadBtn.className = 'gold-button status-grey';
            submitLoadBtn.textContent = 'Недостатньо даних (потрібно 28 дн.)';
            riskStatusCard.className = 'chart-card status-grey';
            riskStatusCard.innerHTML = `<p style="font-size: 1.1em; color: #999; font-weight: bold; margin: 0;">Недостатньо даних</p>
                                        <p style="font-size: 0.8em; color: #888; margin: 5px 0 0 0;">(Потрібно 28 днів історії)</p>`;
            return;
        }

        const acwrRpeResults = calculateACWR(allData, 'rpe');
        const acwrDistanceResults = calculateACWR(allData, 'distance');

        // Оновлення картки ACWR (RPE)
        const latestRpeResult = acwrRpeResults[acwrRpeResults.length - 1];
        let latestACWR = null;
        
        if (latestRpeResult && latestRpeResult.acwr !== null) {
            latestACWR = parseFloat(latestRpeResult.acwr.toFixed(2));
            acwrRpeValue.textContent = latestACWR;
            acwrRpeTrendIcon.style.display = 'inline'; // Показуємо іконку

            let statusText = '';
            let statusClass = '';
            let buttonClass = '';
            let trendIcon = '';
            let trendColor = '';
            let emoji = '';

            // Визначення ризику
            if (latestACWR >= ACWR_HIGH_RISK) {
                statusText = 'Високий Ризик Травми';
                statusClass = 'status-danger';
                buttonClass = 'status-red';
                emoji = '🔴';
            } else if (latestACWR >= ACWR_OPTIMAL_MAX) {
                statusText = 'Підвищений Ризик (Увага)';
                statusClass = 'status-warning';
                buttonClass = 'status-orange';
                emoji = '⚠️';
            } else if (latestACWR >= ACWR_OPTIMAL_MIN) {
                statusText = 'Оптимальна Зона';
                statusClass = 'status-optimal';
                buttonClass = 'status-green';
                emoji = '✅';
            } else if (latestACWR >= ACWR_LOW_RISK) {
                statusText = 'Недостатній Обсяг (Увага)';
                statusClass = 'status-warning';
                buttonClass = 'status-orange';
                emoji = '⚠️';
            } else {
                statusText = 'Низький Обсяг (Детренування)';
                statusClass = 'status-danger';
                buttonClass = 'status-red';
                emoji = '🔴';
            }

            // Визначення тренду (порівняння з попереднім днем)
            if (acwrRpeResults.length > 1) {
                const prevACWR = acwrRpeResults[acwrRpeResults.length - 2].acwr;
                if (latestACWR > prevACWR) {
                    trendIcon = '▲ Зростання';
                    trendColor = '#DA3E52'; // Червоний
                } else if (latestACWR < prevACWR) {
                    trendIcon = '▼ Зниження';
                    trendColor = '#4CAF50'; // Зелений
                } else {
                    trendIcon = '— Стабільність';
                    trendColor = '#CCCCCC';
                }
            } else {
                trendIcon = '— Стабільність';
                trendColor = '#CCCCCC';
            }
            
            // Оновлення картки статусу
            riskStatusCard.className = `chart-card ${statusClass}`;
            riskStatusCard.innerHTML = `
                <p style="font-size: 1.1em; color: ${statusClass === 'status-danger' ? '#DA3E52' : statusClass === 'status-warning' ? '#FF9800' : '#4CAF50'}; font-weight: bold; margin: 0;">
                    <span style="font-size: 1.5em; margin-right: 5px;">${emoji}</span> ${statusText}
                </p>
                <p style="font-size: 0.8em; color: #999; margin: 5px 0 0 0;">0.8 — 1.3 (Оптимально)</p>
            `;
            
            // Оновлення тренду
            acwrRpeTrendIcon.innerHTML = `<span style="color: ${trendColor};">${trendIcon}</span>`;

            // Оновлення кнопки
            submitLoadBtn.className = 'gold-button ' + buttonClass;
            submitLoadBtn.textContent = 'Зафіксувати Навантаження';

        } 

        // Рендер графіків
        renderACWRChart(acwrRpeResults);
        renderLoadTrendChart(acwrRpeResults);
        renderDistanceChart(acwrDistanceResults);
    }

    // -----------------------------------------------------
    // 6. ФУНКЦІЇ РЕНДЕРИНГУ ГРАФІКІВ (Chart.js)
    // -----------------------------------------------------

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

    // 6.1. Графік Динаміки Ризику (ACWR Trend)
    function renderACWRChart(results) {
        const ctx = document.getElementById('acwrChart').getContext('2d');
        if (acwrChartInstance) acwrChartInstance.destroy();

        // Обмежуємо останніми 45 днями для кращого вигляду
        const filteredResults = results.slice(-45); 
        const labels = filteredResults.map(r => r.date.slice(5)); // Показуємо лише MM-DD
        const acwrData = filteredResults.map(r => r.acwr);

        acwrChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ACWR',
                    data: acwrData,
                    borderColor: '#FFC72C', // Золотий акцент
                    backgroundColor: 'rgba(255, 199, 44, 0.2)',
                    tension: 0.4,
                    pointRadius: 3,
                    borderWidth: 2,
                    fill: false,
                }]
            },
            options: {
                ...baseChartOptions,
                plugins: {
                    ...baseChartOptions.plugins,
                    annotation: {
                        annotations: {
                            optimalMax: {
                                type: 'line', yMin: ACWR_OPTIMAL_MAX, yMax: ACWR_OPTIMAL_MAX,
                                borderColor: '#FF9800', borderWidth: 1, borderDash: [5, 5],
                                label: { content: 'Ризик (1.3)', enabled: true, position: 'end', color: '#FF9800' }
                            },
                            highRisk: {
                                type: 'line', yMin: ACWR_HIGH_RISK, yMax: ACWR_HIGH_RISK,
                                borderColor: '#DA3E52', borderWidth: 2,
                                label: { content: 'Високий Ризик (1.5)', enabled: true, position: 'end', color: '#DA3E52' }
                            },
                            optimalMin: {
                                type: 'line', yMin: ACWR_OPTIMAL_MIN, yMax: ACWR_OPTIMAL_MIN,
                                borderColor: '#4CAF50', borderWidth: 1, borderDash: [5, 5],
                                label: { content: 'Оптимально (0.8)', enabled: true, position: 'start', color: '#4CAF50' }
                            }
                        }
                    }
                },
                scales: {
                    x: baseChartOptions.scales.x,
                    y: {
                        ...baseChartOptions.scales.y,
                        min: 0,
                        max: 2.0,
                        title: { display: true, text: 'ACWR', color: '#BBBBBB' }
                    }
                }
            }
        });
    }

    // 6.2. Графік Тренувального Навантаження (Acute & Chronic Load)
    function renderLoadTrendChart(results) {
        const ctx = document.getElementById('loadTrendChart').getContext('2d');
        if (loadTrendChartInstance) loadTrendChartInstance.destroy();

        const filteredResults = results.slice(-30); 
        const labels = filteredResults.map(r => r.date.slice(5));
        const acuteLoad = filteredResults.map(r => r.acute);
        const chronicLoad = filteredResults.map(r => r.chronic);

        loadTrendChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Гостре Навантаження (7 дн)',
                        data: acuteLoad,
                        backgroundColor: '#FFC72C', // Золотий
                        yAxisID: 'y',
                        order: 2 
                    },
                    {
                        label: 'Хронічне Навантаження (28 дн)',
                        data: chronicLoad,
                        type: 'line',
                        borderColor: '#CCCCCC', 
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: false,
                        yAxisID: 'y',
                        order: 1 // Лінія має бути поверх барів
                    }
                ]
            },
            options: {
                ...baseChartOptions,
                scales: {
                    x: baseChartOptions.scales.x,
                    y: {
                        ...baseChartOptions.scales.y,
                        title: { display: true, text: 'RPE Навантаження', color: '#BBBBBB' }
                    }
                }
            }
        });
    }

    // 6.3. Графік Кілометражу (Distance Trend)
    function renderDistanceChart(results) {
        const ctx = document.getElementById('distanceChart').getContext('2d');
        if (distanceChartInstance) distanceChartInstance.destroy();

        const filteredResults = results.slice(-30); 
        const labels = filteredResults.map(r => r.date.slice(5));
        const distanceData = filteredResults.map(r => r.dailyLoad);

        distanceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Кілометраж (м)',
                    data: distanceData,
                    borderColor: '#FFC72C', // Золота лінія
                    backgroundColor: 'rgba(255, 199, 44, 0.1)', // Напівпрозорий золотий залив
                    fill: 'origin',
                    tension: 0.3,
                    pointRadius: 2,
                    borderWidth: 2
                }]
            },
            options: {
                ...baseChartOptions,
                scales: {
                    x: {
                        ...baseChartOptions.scales.x,
                        display: true // Показуємо вісь X, щоб бачити дати
                    },
                    y: {
                        ...baseChartOptions.scales.y,
                        display: true, // Показуємо вісь Y
                        title: { display: true, text: 'Км (м)', color: '#BBBBBB' }
                    }
                },
                plugins: {
                    ...baseChartOptions.plugins,
                    legend: { display: false }
                }
            }
        });
    }

    // -----------------------------------------------------
    // 7. ЗАПУСК
    // -----------------------------------------------------

    updateDashboard();
});
