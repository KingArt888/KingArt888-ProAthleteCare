// Тимчасові дані (заглушки) для демонстрації
let dailyLoadData = [
    { date: '2025-11-24', duration: 60, rpe: 7, distance: 8.5 },
    { date: '2025-11-25', duration: 90, rpe: 8, distance: 12.0 },
    { date: '2025-11-26', duration: 45, rpe: 5, distance: 5.2 },
    { date: '2025-11-27', duration: 70, rpe: 6, distance: 9.1 },
    { date: '2025-11-28', duration: 120, rpe: 9, distance: 15.0 },
    { date: '2025-11-29', duration: 60, rpe: 7, distance: 8.0 },
    // Додайте більше даних для кращої імітації "сезону"
    // Тиждень 2
    { date: '2025-11-30', duration: 60, rpe: 6, distance: 8.5 },
    { date: '2025-12-01', duration: 80, rpe: 7, distance: 10.0 },
    { date: '2025-12-02', duration: 50, rpe: 5, distance: 6.0 },
    { date: '2025-12-03', duration: 90, rpe: 8, distance: 13.5 },
    { date: '2025-12-04', duration: 40, rpe: 4, distance: 4.5 },
    { date: '2025-12-05', duration: 100, rpe: 9, distance: 14.0 },
    { date: '2025-12-06', duration: 60, rpe: 7, distance: 9.0 },
    // Тиждень 3 (збільшення навантаження)
    { date: '2025-12-07', duration: 75, rpe: 8, distance: 10.0 },
    { date: '2025-12-08', duration: 95, rpe: 9, distance: 15.0 },
    { date: '2025-12-09', duration: 65, rpe: 7, distance: 8.0 },
    { date: '2025-12-10', duration: 120, rpe: 10, distance: 18.0 },
    { date: '2025-12-11', duration: 50, rpe: 6, distance: 5.0 },
    { date: '2025-12-12', duration: 110, rpe: 9, distance: 16.0 },
    { date: '2025-12-13', duration: 80, rpe: 8, distance: 10.0 },
];

const FORM_DAYS_TO_DISPLAY = 21; // Кількість днів, що беруться для розрахунку acute load (7) та chronic load (28). Візьмемо останні 21 день для прикладу.

// === ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ ОБЧИСЛЕНЬ ===

/**
 * Обчислює щоденне навантаження (Session-RPE Load)
 * Load = Тривалість (хв) * RPE (1-10)
 * @param {number} duration - Тривалість у хвилинах
 * @param {number} rpe - RPE від 1 до 10
 * @returns {number} Session-RPE Load
 */
function calculateSessionRPE(duration, rpe) {
    return duration * rpe;
}

/**
 * Розраховує тижневий тиждень (номер тижня)
 * @param {string} dateString - Дата у форматі 'YYYY-MM-DD'
 * @returns {number} Номер тижня
 */
function getWeekNumber(dateString) {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    // Встановлюємо 4 січня як початок першого тижня (ISO 8601)
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return date.getFullYear() * 100 + weekNo; // YYYYWW
}


/**
 * Розраховує показники ACWR
 * @returns {{ acuteLoad: number, chronicLoad: number, acwr: number }}
 */
function calculateACWR() {
    // Сортуємо дані за датою (від старих до нових)
    const sortedData = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Вважаємо, що "сьогодні" це остання дата у наших заглушках
    const latestDate = sortedData[sortedData.length - 1] ? new Date(sortedData[sortedData.length - 1].date) : new Date();

    // Розраховуємо кінцеві дати для Acute (7 днів) і Chronic (28 днів)
    const sevenDaysAgo = new Date(latestDate);
    sevenDaysAgo.setDate(latestDate.getDate() - 7);
    const twentyEightDaysAgo = new Date(latestDate);
    twentyEightDaysAgo.setDate(latestDate.getDate() - 28);

    // Додаємо Load до кожного елемента
    const dataWithLoad = sortedData.map(item => ({
        ...item,
        load: calculateSessionRPE(item.duration, item.rpe)
    }));

    // 1. Гостре навантаження (Acute Load - останні 7 днів)
    const acuteLoadDays = dataWithLoad.filter(item => new Date(item.date) > sevenDaysAgo);
    const totalAcuteLoad = acuteLoadDays.reduce((sum, item) => sum + item.load, 0);
    // Acute Load - це середнє навантаження за 7 днів (сума / 7)
    const acuteLoad = totalAcuteLoad / 7;

    // 2. Хронічне навантаження (Chronic Load - останні 28 днів)
    const chronicLoadDays = dataWithLoad.filter(item => new Date(item.date) > twentyEightDaysAgo);
    const totalChronicLoad = chronicLoadDays.reduce((sum, item) => sum + item.load, 0);
    // Chronic Load - це середнє навантаження за 28 днів (сума / 28)
    const chronicLoad = totalChronicLoad / 28;

    // 3. ACWR
    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
    
    return {
        acuteLoad: Math.round(acuteLoad),
        chronicLoad: Math.round(chronicLoad),
        acwr: parseFloat(acwr.toFixed(2))
    };
}


// === ФУНКЦІЇ ДЛЯ ОНОВЛЕННЯ UI ===

/**
 * Оновлює спідометр ACWR
 * @param {number} acwrValue - Показник ACWR
 */
function updateACWRGauge(acwrValue) {
    const needle = document.getElementById('gauge-needle');
    const acwrValueDisplay = document.getElementById('acwr-value');
    const statusText = document.getElementById('acwr-status');

    // Налаштування кутів для спідометра:
    // Безпечна зона (Green): 0.8 - 1.3. Приймаємо 1.00 як 0 градусів від центру.
    // 0.5 (мінімум) = -45 deg
    // 1.0 = 0 deg
    // 1.3 = +27 deg (Центр зеленої зони - 1.05)
    // 1.5 = +45 deg (Верхня межа безпечної зони)
    // 2.0 (максимум) = +90 deg

    let degree = 0;
    let status = 'Недостатньо даних';
    let statusClass = 'status-warning';

    if (acwrValue >= 0.5 && acwrValue <= 1.3) {
        // Зелена зона: 0.8 - 1.3
        degree = (acwrValue - 1.0) * 100; // Просте лінійне відображення, 1.0 = 0 deg
        status = 'Безпечна зона (Оптимально)';
        statusClass = 'status-safe';
    } else if (acwrValue < 0.8 && acwrValue >= 0.5) {
        // Жовта зона (Недовантаження): 0.5 - 0.8
        degree = -45 + (acwrValue - 0.5) * 100; // -45deg до 0deg
        status = 'Ризик недотренованості (Низьке навантаження)';
        statusClass = 'status-warning';
    } else if (acwrValue > 1.3 && acwrValue <= 1.5) {
        // Жовта зона (Небезпека): 1.3 - 1.5
        degree = 30 + (acwrValue - 1.3) * 75; 
        status = 'Підвищений ризик травм (Зростання навантаження)';
        statusClass = 'status-warning';
    } else if (acwrValue > 1.5) {
        // Червона зона (Небезпека): > 1.5
        degree = 45 + (acwrValue - 1.5) * 50;
        status = 'Високий ризик травм (Критичне навантаження)';
        statusClass = 'status-danger';
    } else {
        // Менше 0.5 (дуже низьке)
        degree = -90; 
        status = 'Критично низьке навантаження (Детренування)';
        statusClass = 'status-danger';
    }
    
    // Обмежуємо кут, щоб стрілка не виходила за межі спідометра (-90 до +90)
    degree = Math.min(90, Math.max(-90, degree));

    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
    acwrValueDisplay.textContent = acwrValue.toFixed(2);
    statusText.textContent = status;
    statusText.className = statusClass; // Оновлюємо клас для кольору
}

/**
 * Форматує дані для графіка дистанції
 */
function formatDistanceDataForChart() {
    const weeklyDistance = {};

    dailyLoadData.forEach(item => {
        const week = getWeekNumber(item.date);
        if (!weeklyDistance[week]) {
            weeklyDistance[week] = 0;
        }
        weeklyDistance[week] += item.distance;
    });

    const labels = Object.keys(weeklyDistance).map((weekNum, index) => `Тиждень ${index + 1}`);
    const data = Object.values(weeklyDistance);
    
    return { labels, data };
}

/**
 * Ініціалізує та оновлює графік дистанції по тижнях
 */
let distanceChart;
function renderDistanceChart() {
    const ctx = document.getElementById('distanceChart').getContext('2d');
    const { labels, data } = formatDistanceDataForChart();

    if (distanceChart) {
        distanceChart.destroy();
    }
    
    distanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Загальна дистанція (км)',
                data: data,
                borderColor: '#FFD700', // Золотий
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                borderWidth: 3,
                tension: 0.3, // Зламана лінія
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#CCCCCC' } },
            },
            scales: {
                x: { ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } },
                y: { beginAtZero: true, ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } }
            }
        }
    });
}

/**
 * Ініціалізує та оновлює графік Acute vs Chronic Load
 */
let loadChart;
function renderLoadChart(acuteLoad, chronicLoad) {
    const ctx = document.getElementById('loadChart').getContext('2d');
    
    // Створення тимчасових даних для графіка (за останні 4 тижні)
    // Це більш складний розрахунок, тут для спрощення візьмемо поточні ACUTE/CHRONIC
    // Але краще, щоб були показники ACWR за останні кілька тижнів.
    
    // Для демонстрації візьмемо 4 точки даних
    const demoLabels = ['4 тижні тому', '3 тижні тому', '2 тижні тому', 'Поточний'];
    const demoAcute = [500, 650, 800, acuteLoad];
    const demoChronic = [600, 620, 700, chronicLoad];

    if (loadChart) {
        loadChart.destroy();
    }
    
    loadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: demoLabels,
            datasets: [
                {
                    label: 'Acute Load (7 днів)',
                    data: demoAcute,
                    borderColor: '#D9534F', // Червоний
                    backgroundColor: 'rgba(217, 83, 79, 0.3)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: 'Chronic Load (28 днів)',
                    data: demoChronic,
                    borderColor: '#4CAF50', // Зелений
                    backgroundColor: 'rgba(76, 175, 80, 0.3)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#CCCCCC' } },
            },
            scales: {
                x: { ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } },
                y: { beginAtZero: true, ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } }
            }
        }
    });
}

// === ОСНОВНА ФУНКЦІЯ ІНІЦІАЛІЗАЦІЇ ===

function initializeLoadSeason() {
    // 1. Обчислюємо ACWR з заглушок
    const { acuteLoad, chronicLoad, acwr } = calculateACWR();

    // 2. Оновлюємо спідометр
    updateACWRGauge(acwr);

    // 3. Рендеримо графіки
    renderDistanceChart();
    renderLoadChart(acuteLoad, chronicLoad);

    // 4. Обробка форми
    document.getElementById('load-form').addEventListener('submit', handleLoadFormSubmit);
    
    // Обробка відображення вибраного RPE
    document.querySelectorAll('.rpe-group input[name="rpe"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            const display = document.querySelector('.rpe-value-display');
            display.textContent = event.target.value;
        });
    });
    
    // Встановлення поточної дати як значення за замовчуванням
    document.getElementById('load-date').valueAsDate = new Date();
}

/**
 * Обробка відправки форми
 */
function handleLoadFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const date = form.elements['date'].value;
    const duration = parseInt(form.elements['duration'].value);
    const distance = parseFloat(form.elements['distance'].value);
    const rpe = parseInt(document.querySelector('input[name="rpe"]:checked')?.value);

    const statusMessage = document.getElementById('form-status');

    if (!date || isNaN(duration) || isNaN(distance) || isNaN(rpe)) {
        statusMessage.textContent = 'Будь ласка, заповніть всі поля коректно.';
        statusMessage.style.color = '#D9534F';
        return;
    }

    const newEntry = { date, duration, rpe, distance };

    // 1. Додаємо нове тренування
    // Перевіряємо, чи вже є запис на цю дату, і оновлюємо його (якщо одне тренування в день)
    const existingIndex = dailyLoadData.findIndex(item => item.date === date);
    if (existingIndex > -1) {
        dailyLoadData[existingIndex] = newEntry;
        statusMessage.textContent = `Дані за ${date} оновлено! Load: ${calculateSessionRPE(duration, rpe)}`;
    } else {
        dailyLoadData.push(newEntry);
        statusMessage.textContent = `Тренування збережено! Load: ${calculateSessionRPE(duration, rpe)}`;
    }
    
    statusMessage.style.color = '#4CAF50';
    
    // 2. Сортуємо дані та оновлюємо UI
    dailyLoadData.sort((a, b) => new Date(a.date) - new Date(b.date));
    initializeLoadSeason(); 
}


// Запуск ініціалізації при завантаженні сторінки
document.addEventListener('DOMContentLoaded', initializeLoadSeason);
