// ФУНКЦІЇ ДЛЯ LOAD SEASON (load-season.js)
// ==========================================================

let loadData = []; // Початкові дані будуть заповнені тестовими або з localStorage
let currentRollingChart = null;
let currentWeeklyChart = null;
let currentGaugeChart = null; 

// Тестові дані, що імітують 28 днів S-RPE Load
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
        } else if (duration < 10 && internalLoad > 0) { // Якщо InternalLoad є, але Duration занадто малий, збільшуємо RPE
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
        
        // Отримання значення RPE
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
        // Скидаємо поля вводу
        document.getElementById('load-duration').value = 60;
        document.getElementById('load-distance').value = 0.0;
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
    
    // ЛОГІКА СПІДОМЕТРА
    if (rollingMetrics.acwrLatest) {
        const acwrValue = parseFloat(rollingMetrics.acwrLatest);
        const gaugeData = getAcwrGaugeData(acwrValue);
        renderGaugeChart(gaugeData);
        // Оновлюємо також колір ACWR-значення
        const acwrEl = document.getElementById('acwr-value');
        if(acwrEl) acwrEl.style.color = gaugeData.pointerColor;
    } else {
        // Очищаємо спідометр, якщо немає даних
        const ctx = document.getElementById('acwrGaugeChart');
        if (currentGaugeChart) currentGaugeChart.destroy();
        const acwrEl = document.getElementById('acwr-value');
        if(acwrEl) acwrEl.textContent = 'N/A';
    }
    
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
        
        // Acute (7 днів)
        const acuteSlice = internalLoads.slice(i - 6, i + 1);
        const acuteSum = acuteSlice.reduce((sum, item) => sum + item.load, 0);
        const acuteLoad = acuteSum / 7; 

        // Chronic (28 днів)
        const chronicSlice = internalLoads.slice(i - 27, i + 1);
        const chronicSum = chronicSlice.reduce((sum, item) => sum + item.load, 0);
        const chronicLoad = chronicSum / 28; 

        const acwr = chronicLoad > 0 ? (acuteLoad / chronicLoad) : 0;
        
        // Переводимо Acute і Chronic у тижневі суми для відображення
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
                distance
