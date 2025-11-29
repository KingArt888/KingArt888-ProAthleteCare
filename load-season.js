// ФУНКЦІЇ ДЛЯ LOAD SEASON (load-season.js)
// ==========================================================

let loadData = JSON.parse(localStorage.getItem('athleteLoadData')) || [];
let currentRollingChart = null; // Об'єкт для графіка Rolling Load
let currentWeeklyChart = null; // Об'єкт для графіка Weekly Load

// Функція-хелпер для отримання поточної дати у форматі YYYY-MM-DD
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Хелпер для отримання початку тижня (Понеділок)
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    // 0 = Sunday, 1 = Monday. Зміщуємо, щоб Понеділок був початком.
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff));
    return startOfWeek.toISOString().split('T')[0];
}

function saveLoadData() {
    // Сортуємо дані за датою для коректного розрахунку ролінгу
    loadData.sort((a, b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem('athleteLoadData', JSON.stringify(loadData));
    
    // Оновлюємо усі графіки та ризики
    calculateAndDisplayLoads();
}

// ----------------------------------------------------------
// ОСНОВНА ЛОГІКА РОЗРАХУНКІВ НАВАНТАЖЕННЯ (Internal Load - AU)
// ----------------------------------------------------------

function calculateAndDisplayLoads() {
    const today = getTodayDateString();
    
    // Фільтруємо дані, щоб залишити лише записи до сьогодні включно
    const validData = loadData.filter(d => new Date(d.date) <= new Date(today));
    
    // 1. РОЗРАХУНОК ACWR (Rolling 7-day та 28-day)
    const rollingMetrics = calculateRollingMetrics(validData);
    
    // 2. РОЗРАХУНОК ТИЖНЕВИХ СУМ (Weekly Totals)
    const weeklyMetrics = calculateWeeklyMetrics(validData);

    // 3. ВІДОБРАЖЕННЯ
    displayACWR(rollingMetrics.acwrLatest);
    renderRollingLoadChart(rollingMetrics.chartData);
    renderWeeklyLoadChart(weeklyMetrics);
}

function calculateRollingMetrics(data) {
    const rollingData = [];
    const internalLoads = data.map(d => ({ date: d.date, load: d.internalLoad }));
    
    let acwrLatest = null;

    // Потрібно 28 днів для розрахунку ACWR
    if (internalLoads.length < 28) {
        return { chartData: [], acwrLatest: null };
    }


    // Проходимо по кожному дню, починаючи з 28-го дня
    for (let i = 27; i < internalLoads.length; i++) {
        const currentDate = internalLoads[i].date;
        
        // Гостре (7 днів) - останній тиждень, включаючи поточний день
        const acuteSlice = internalLoads.slice(i - 6, i + 1);
        const acuteSum = acuteSlice.reduce((sum, item) => sum + item.load, 0);
        const acuteLoad = acuteSum / 7;

        // Хронічне (28 днів)
        const chronicSlice = internalLoads.slice(i - 27, i + 1);
        const chronicSum = chronicSlice.reduce((sum, item) => sum + item.load, 0);
        const chronicLoad = chronicSum / 28;

        const acwr = chronicLoad > 0 ? (acuteLoad / chronicLoad) : 0;

        rollingData.push({
            date: currentDate,
            acute: acuteLoad.toFixed(0),
            chronic: chronicLoad.toFixed(0),
            acwr: acwr.toFixed(2)
        });
        
        acwrLatest = acwr.toFixed(2);
    }

    return { 
        chartData: rollingData,
        acwrLatest: acwrLatest
    };
}


function calculateWeeklyMetrics(data) {
    const weeklyTotals = {}; // { 'YYYY-MM-DD': { load: X, distance: Y } }

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
    
    // Перетворюємо об'єкт у масив для Chart.js
    const chartData = Object.keys(weeklyTotals).map(date => ({
        weekStart: date,
        internalLoad: weeklyTotals[date].internalLoad,
        distance: weeklyTotals[date].distance
    })).sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
    
    return chartData;
}


// ----------------------------------------------------------
// ФУНКЦІЇ ВІДОБРАЖЕННЯ (Display)
// ----------------------------------------------------------

function displayACWR(acwrValue) {
    const statusEl = document.getElementById('acwr-status');
    if (!statusEl) return;

    if (!acwrValue) {
        statusEl.innerHTML = '<p style="color: #FFC72C;">Введіть дані за > 28 днів для розрахунку ризику.</p>';
        return;
    }

    const acwr = parseFloat(acwrValue);
    let riskStatus = '';
    let statusColor = '';

    if (acwr >= 0.8 && acwr <= 1.3) {
        riskStatus = 'Оптимальний ("Sweet Spot")';
        statusColor = '#50C878'; // Green
    } else if (acwr > 1.5) {
        riskStatus = 'Високий ризик травми 🥵 (Знизити навантаження!)';
        statusColor = '#DA3E52'; // Red
    } else if (acwr > 1.3) {
        riskStatus = 'Підвищений ризик 🔥';
        statusColor = '#FFC72C'; // Yellow/Gold
    } else {
        riskStatus = 'Низький стимул (Undertraining)';
        statusColor = '#00BFFF'; // Light Blue
    }

    statusEl.innerHTML = `
        <p style="margin: 0; font-size: 1.5em; font-weight: bold; color: ${statusColor};">${acwrValue}</p>
        <p style="margin: 5px 0 0 0; font-size: 1em; color: ${statusColor};">${riskStatus}</p>
    `;
}

// ----------------------------------------------------------
// ФУНКЦІЇ ГРАФІКІВ (Chart.js)
// ----------------------------------------------------------

// 1. Графік Ролінгу та ACWR (Лінійний графік)
function renderRollingLoadChart(rollingData) {
    const ctx = document.getElementById('rollingLoadChart');
    if (!ctx) return;
    if (currentRollingChart) currentRollingChart.destroy();

    // Якщо даних недостатньо, не малюємо
    if (rollingData.length === 0) {
        ctx.parentNode.innerHTML = '<h3>Хронологія Ролінг Навантаження та ACWR</h3><p class="placeholder-text">Потрібно 28 днів даних для відображення ролінгу.</p><canvas id="rollingLoadChart"></canvas>';
        return;
    }

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
                    label: 'Гостре навантаження (7-Day)',
                    data: acuteData,
                    borderColor: '#DA3E52', // Червоний
                    backgroundColor: 'rgba(218, 62, 82, 0.2)',
                    fill: false,
                    tension: 0.2,
                    yAxisID: 'y'
                },
                {
                    label: 'Хронічне навантаження (28-Day)',
                    data: chronicData,
                    borderColor: '#00BFFF', // Блакитний
                    backgroundColor: 'rgba(0, 191, 255, 0.2)',
                    fill: false,
                    tension: 0.2,
                    yAxisID: 'y'
                },
                {
                    label: 'ACWR',
                    data: acwrData,
                    borderColor: '#FFC72C', // Жовтий (для ризику)
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'acwr' // Окрема вісь для ACWR
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
                    title: { display: true, text: 'Навантаження (AU)', color: '#CCCCCC' },
                    ticks: { color: '#CCCCCC' },
                    grid: { color: '#333333' }
                },
                acwr: { // Друга вісь Y для ACWR
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

// 2. Графік Тижневого навантаження (Стовпчастий/Комбінований графік)
function renderWeeklyLoadChart(weeklyData) {
    const ctx = document.getElementById('weeklyLoadChart');
    if (!ctx) return;
    if (currentWeeklyChart) currentWeeklyChart.destroy();
    
    if (weeklyData.length === 0) {
        ctx.parentNode.innerHTML = '<h3>Тижневі підсумки: Навантаження та Дистанція</h3><p class="placeholder-text">Введіть дані, щоб побачити тижневі підсумки.</p><canvas id="weeklyLoadChart"></canvas>';
        return;
    }


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
                    type: 'line', // Комбінуємо зі стовпцями
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

// ----------------------------------------------------------
// ЛОГІКА ФОРМИ (Daily Input)
// ----------------------------------------------------------
function setupLoadForm() {
    const loadForm = document.getElementById('load-form');
    const loadDateInput = document.getElementById('load-date');
    const loadDurationInput = document.getElementById('load-duration');
    const loadDistanceInput = document.getElementById('load-distance');
    
    if (!loadForm) return;

    loadDateInput.value = getTodayDateString(); // Дата за замовчуванням

    loadForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const date = loadDateInput.value;
        const duration = parseInt(loadDurationInput.value);
        const distance = parseFloat(loadDistanceInput.value);
        const rpeEl = document.querySelector('input[name="rpe"]:checked');
        
        if (!rpeEl) {
             alert("Будь ласка, виберіть суб'єктивне навантаження (RPE).");
             return;
        }

        const rpe = parseInt(rpeEl.value);
        
        const internalLoad = duration * rpe; // Ключовий розрахунок

        // Перевіряємо, чи є запис на цю дату, щоб оновити його
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
        loadForm.reset();
        loadDateInput.value = getTodayDateString();
    });
}


// ==========================================================
// ОСНОВНА ІНІЦІАЛІЗАЦІЯ
// ==========================================================

document.addEventListener('DOMContentLoaded', function() {
    // Ініціалізація Load Season
    if (window.location.pathname.split('/').pop() === 'load-season.html') {
        setupLoadForm();
        calculateAndDisplayLoads(); // Запускаємо розрахунок при завантаженні
    }
});
