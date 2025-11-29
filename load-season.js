// ФУНКЦІЇ ДЛЯ LOAD SEASON (load-season.js)
// ==========================================================

let loadData = []; // Початкові дані будуть заповнені тестовими або з localStorage
let currentRollingChart = null;
let currentWeeklyChart = null;

// Тестові дані, що імітують 28 днів S-RPE Load
// Це дозволить ACWR одразу працювати при першому запуску
const TEST_LOAD_HISTORY = [
    // День 1 (Сьогодні-1) до День 28 (Сьогодні-28). Load = Duration * RPE
    100, 300, 400, 0, 500, 450, 0, // Тиждень 1 (1750 AU)
    600, 750, 700, 0, 550, 650, 0, // Тиждень 2 (3250 AU)
    450, 600, 500, 0, 400, 500, 0, // Тиждень 3 (2450 AU)
    400, 500, 450, 0, 300, 400, 0  // Тиждень 4 (2050 AU)
];

// Функція-хелпер для отримання поточної дати у форматі YYYY-MM-DD
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Хелпер для отримання початку тижня (Понеділок)
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff));
    return startOfWeek.toISOString().split('T')[0];
}

// ==========================================================
// ЛОГІКА ЗБЕРЕЖЕННЯ ТА ІНІЦІАЛІЗАЦІЯ ДАНИХ
// ==========================================================

function loadInitialData() {
    const storedData = JSON.parse(localStorage.getItem('athleteLoadData'));

    if (storedData && storedData.length > 0) {
        loadData = storedData;
    } else {
        // Якщо немає збережених даних, генеруємо тестові дані за останні 28 днів
        loadData = generateTestData(TEST_LOAD_HISTORY);
        saveLoadData(); // Зберігаємо тестові дані для першого запуску
    }
}

function generateTestData(loads) {
    const today = new Date();
    const data = [];

    for (let i = 0; i < loads.length; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (loads.length - 1) + i); // Забезпечуємо 28 послідовних днів
        
        const internalLoad = loads[i];
        
        // Генеруємо RPE і Duration, щоб InternalLoad був приблизно правильним
        let rpe = 5;
        let duration = internalLoad / rpe;
        
        if (internalLoad === 0) {
            rpe = 1;
            duration = 0;
        } else if (duration < 10) { // Якщо Duration занадто малий, збільшуємо RPE
             rpe = 8;
             duration = internalLoad / rpe;
        }

        data.push({
            date: date.toISOString().split('T')[0],
            duration: Math.round(duration),
            rpe: Math.round(rpe),
            distance: (Math.random() * 5).toFixed(1) * (internalLoad > 0 ? 1 : 0),
            internalLoad: internalLoad
        });
    }
    return data;
}

function saveLoadData() {
    loadData.sort((a, b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem('athleteLoadData', JSON.stringify(loadData));
    calculateAndDisplayLoads();
}

// ----------------------------------------------------------
// ЛОГІКА ФОРМИ (Daily Input)
// ----------------------------------------------------------
function setupLoadForm() {
    const loadForm = document.getElementById('load-form');
    const loadDateInput = document.getElementById('load-date');
    
    if (!loadForm) return;

    loadDateInput.value = getTodayDateString();

    loadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const date = loadDateInput.value;
        const duration = parseInt(document.getElementById('load-duration').value);
        const distance = parseFloat(document.getElementById('load-distance').value);
        
        // 🚨 ВИПРАВЛЕННЯ RPE: Перевірка та отримання значення
        const rpeEl = document.querySelector('input[name="rpe"]:checked');
        
        if (!rpeEl) {
             alert("Будь ласка, виберіть суб'єктивне навантаження (RPE) від 1 до 10.");
             return;
        }
        const rpe = parseInt(rpeEl.value);
        
        const internalLoad = duration * rpe;

        const existingIndex = loadData.findIndex(d => d.date === date);

        const newEntry = {
            date: date,
            duration: duration,
            rpe: rpe,
            distance: distance,
            internalLoad: internalLoad 
        };

        if (existingIndex !== -1) {
            loadData[existingIndex] = newEntry;
            alert(`Дані за ${date} оновлено. Internal Load: ${internalLoad} AU.`);
        } else {
            loadData.push(newEntry);
            alert(`Дані за ${date} збережено. Internal Load: ${internalLoad} AU.`);
        }

        saveLoadData();
        // Залишаємо форму заповненою поточною датою для подальшого введення
        document.getElementById('load-duration').value = 60;
        document.getElementById('load-distance').value = 0.0;
        // Скидаємо вибір RPE (або залишаємо на 1)
        document.getElementById('rpe1').checked = true;
    });
}

// ==========================================================
// ОСНОВНА ЛОГІКА РОЗРАХУНКІВ НАВАНТАЖЕННЯ (Internal Load - AU)
// ==========================================================

function calculateAndDisplayLoads() {
    const today = getTodayDateString();
    const validData = loadData.filter(d => new Date(d.date) <= new Date(today));
    
    // 1. РОЗРАХУНОК ACWR (Rolling 7-day та 28-day)
    const rollingMetrics = calculateRollingMetrics(validData);
    
    // 2. РОЗРАХУНОК ТИЖНЕВИХ СУМ (Weekly Totals)
    const weeklyMetrics = calculateWeeklyMetrics(validData);

    // 3. ВІДОБРАЖЕННЯ
    displayACWR(rollingMetrics.acwrLatest, rollingMetrics.acuteLatest, rollingMetrics.chronicLatest);
    renderRollingLoadChart(rollingMetrics.chartData);
    renderWeeklyLoadChart(weeklyMetrics);
}

function calculateRollingMetrics(data) {
    const rollingData = [];
    const internalLoads = data.map(d => ({ date: d.date, load: d.internalLoad }));
    
    let acwrLatest = null;
    let acuteLatest = 0;
    let chronicLatest = 0;

    // Починаємо розрахунок, коли є 28 днів даних
    if (internalLoads.length < 28) {
        return { chartData: [], acwrLatest: null, acuteLatest: 0, chronicLatest: 0 };
    }

    for (let i = 27; i < internalLoads.length; i++) {
        const currentDate = internalLoads[i].date;
        
        // Acute (7 днів) - Включаючи поточний день (i - 6 до i)
        const acuteSlice = internalLoads.slice(i - 6, i + 1);
        const acuteSum = acuteSlice.reduce((sum, item) => sum + item.load, 0);
        const acuteLoad = acuteSum / 7; // Середньоденне Acute

        // Chronic (28 днів) - Включаючи поточний день (i - 27 до i)
        const chronicSlice = internalLoads.slice(i - 27, i + 1);
        const chronicSum = chronicSlice.reduce((sum, item) => sum + item.load, 0);
        const chronicLoad = chronicSum / 28; // Середньоденне Chronic

        const acwr = chronicLoad > 0 ? (acuteLoad / chronicLoad) : 0;
        
        // Зберігаємо тижневі суми для графіка
        const acuteWeeklySum = acuteLoad * 7;
        const chronicWeeklySum = chronicLoad * 7;

        rollingData.push({
            date: currentDate,
            acute: acuteWeeklySum.toFixed(0),
            chronic: chronicWeeklySum.toFixed(0),
            acwr: acwr.toFixed(2)
        });
        
        // Останні значення
        if (i === internalLoads.length - 1) {
            acwrLatest = acwr.toFixed(2);
            acuteLatest = acuteWeeklySum.toFixed(0);
            chronicLatest = chronicWeeklySum.toFixed(0);
        }
    }

    return { 
        chartData: rollingData,
        acwrLatest: acwrLatest,
        acuteLatest: acuteLatest,
        chronicLatest: chronicLatest
    };
}

function calculateWeeklyMetrics(data) {
    const weeklyTotals = {};
    data.forEach(d => {
        const startOfWeek = getStartOfWeek(d.date);
        
        if (!weeklyTotals[startOfWeek]) {
            weeklyTotals[startOfWeek] = { 
                internalLoad: 0,
                distance: 0
            };
        }
        weeklyTotals[startOfWeek].internalLoad += d.internalLoad;
        weeklyTotals[startOfWeek].distance += d.distance;
    });
    
    const chartData = Object.keys(weeklyTotals).map(date => ({
        weekStart: date,
        internalLoad: weeklyTotals[date].internalLoad,
        distance: weeklyTotals[date].distance
    })).sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
    
    return chartData;
}


// ----------------------------------------------------------
// ФУНКЦІЇ ВІДОБРАЖЕННЯ
// ----------------------------------------------------------

function displayACWR(acwrValue, acuteLoad, chronicLoad) {
    const statusEl = document.getElementById('acwr-status');
    if (!statusEl) return;

    if (!acwrValue) {
        statusEl.innerHTML = '<p style="color: #FFC72C;">Введіть дані за > 28 днів для розрахунку ризику.</p>';
        return;
    }

    const acwr = parseFloat(acwrValue);
    let riskStatus = '';
    let statusColor = '';
    
    // 

    if (acwr > 1.5) {
        riskStatus = 'КРИТИЧНИЙ РИЗИК! (Екстремальний стрибок навантаження)';
        statusColor = '#DA3E52'; // Red
    } else if (acwr > 1.3) {
        riskStatus = 'ВИСОКИЙ РИЗИК (Зона небезпеки 🔥)';
        statusColor = '#FFC72C'; // Yellow/Gold
    } else if (acwr >= 0.8 && acwr <= 1.3) {
        riskStatus = 'ОПТИМАЛЬНО ("Sweet Spot" ✅)';
        statusColor = '#50C878'; // Green
    } else { // ACWR < 0.8
        riskStatus = 'НИЗЬКИЙ СТИМУЛ (Undertraining 📉)';
        statusColor = '#00BFFF'; // Light Blue
    }

    statusEl.innerHTML = `
        <p style="margin: 0; font-size: 1.5em; font-weight: bold; color: ${statusColor};">${acwrValue}</p>
        <p style="margin: 5px 0 10px 0; font-size: 1em; color: ${statusColor};">${riskStatus}</p>
        <p style="margin: 0; font-size: 0.9em; color: #CCCCCC;">Гостре (7 дн.): ${acuteLoad} AU</p>
        <p style="margin: 0; font-size: 0.9em; color: #CCCCCC;">Хронічне (28 дн.): ${chronicLoad} AU</p>
    `;
}

// ----------------------------------------------------------
// ФУНКЦІЇ ГРАФІКІВ (Chart.js)
// ----------------------------------------------------------

function renderRollingLoadChart(rollingData) {
    const ctx = document.getElementById('rollingLoadChart');
    if (!ctx) return;
    if (currentRollingChart) currentRollingChart.destroy();

    if (rollingData.length === 0) {
        ctx.style.display = 'none';
        ctx.parentNode.querySelector('h3').insertAdjacentHTML('afterend', '<p class="placeholder-text">Потрібно 28 днів даних для відображення ролінгу.</p>');
        return;
    }
    
    ctx.style.display = 'block';
    
    // ... (решта логіки Chart.js для Rolling Load залишається такою ж, як у попередньому прикладі) ...
    // ВСТАВТЕ ВАШ КОД CHART.JS ДЛЯ rollingLoadChart

    const labels = rollingData.map(d => d.date);
    const acuteData = rollingData.map(d => d.acute);
    const chronicData = rollingData.map(d => d.chronic);
    const acwrData = rollingData.map(d => d.acwr);

    currentRollingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Гостре навантаження (7-Day Sum)',
                    data: acuteData,
                    borderColor: '#DA3E52',
                    backgroundColor: 'rgba(218, 62, 82, 0.2)',
                    fill: false,
                    tension: 0.2,
                    yAxisID: 'y'
                },
                {
                    label: 'Хронічне навантаження (28-Day Avg * 7)',
                    data: chronicData,
                    borderColor: '#00BFFF',
                    backgroundColor: 'rgba(0, 191, 255, 0.2)',
                    fill: false,
                    tension: 0.2,
                    yAxisID: 'y'
                },
                {
                    label: 'ACWR',
                    data: acwrData,
                    borderColor: '#FFC72C',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'acwr'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { labels: { color: '#CCCCCC' } },
            },
            scales: {
                x: { ticks: { color: '#CCCCCC' }, grid: { color: '#333333' } },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Тижневе Навантаження (AU)', color: '#CCCCCC' },
                    ticks: { color: '#CCCCCC' },
                    grid: { color: '#333333' }
                },
                acwr: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'ACWR', color: '#FFC72C' },
                    ticks: { color: '#FFC72C' },
                    grid: { drawOnChartArea: false }, 
                    min: 0,
                    max: 2.0
                }
            }
        }
    });
}

function renderWeeklyLoadChart(weeklyData) {
    const ctx = document.getElementById('weeklyLoadChart');
    if (!ctx) return;
    if (currentWeeklyChart) currentWeeklyChart.destroy();

    if (weeklyData.length === 0) {
        ctx.style.display = 'none';
        ctx.parentNode.querySelector('h3').insertAdjacentHTML('afterend', '<p class="placeholder-text">Введіть дані, щоб побачити тижневі підсумки.</p>');
        return;
    }
    
    ctx.style.display = 'block';

    // ... (решта логіки Chart.js для Weekly Load залишається такою ж, як у попередньому прикладі) ...
    // ВСТАВТЕ ВАШ КОД CHART.JS ДЛЯ weeklyLoadChart
    
    const labels = weeklyData.map(d => `Тиждень від ${d.weekStart}`);
    const loadData = weeklyData.map(d => d.internalLoad);
    const distanceData = weeklyData.map(d => d.distance);
    
    currentWeeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Тижневе Internal Load (AU)',
                    data: loadData,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    yAxisID: 'load'
                },
                {
                    label: 'Тижнева Дистанція (км)',
                    data: distanceData,
                    type: 'line',
                    borderColor: '#FFC72C',
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'distance'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { labels: { color: '#CCCCCC' } }
            },
            scales: {
                x: { ticks: { color: '#CCCCCC' }, grid: { color: '#333333' } },
                load: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Навантаження (AU)', color: '#CCCCCC' },
                    ticks: { color: '#CCCCCC' },
                    grid: { color: '#333333' }
                },
                distance: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Дистанція (км)', color: '#FFC72C' },
                    ticks: { color: '#FFC72C' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}


// Запуск ініціалізації при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    setupLoadForm();
});
