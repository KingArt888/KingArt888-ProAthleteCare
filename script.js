// Ключ для зберігання даних у localStorage
const STORAGE_KEY = 'athleteWellnessScores';

// Визначення показників (для графіків та форми)
const INDICATORS = [
    { key: 'sleep', title: 'Якість сну', color: 'rgb(255, 199, 44)', chartId: 'chart-sleep', inverse: false },
    { key: 'soreness', title: 'Біль / Втома', color: 'rgb(218, 62, 82)', chartId: 'chart-soreness', inverse: true },
    { key: 'mood', title: 'Настрій / Енергія', color: 'rgb(75, 192, 192)', chartId: 'chart-mood', inverse: false },
    { key: 'water', title: 'Рівень гідратації', color: 'rgb(54, 162, 235)', chartId: 'chart-water', inverse: false },
    { key: 'stress', title: 'Психологічний стрес', color: 'rgb(255, 99, 132)', chartId: 'chart-stress', inverse: true },
    { key: 'ready', title: 'Готовність', color: 'rgb(153, 102, 255)', chartId: 'chart-ready', inverse: false }
];

let dailyScores = [];
let chartInstances = {};

/**
 * 1. Утиліти для роботи з даними
 */

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Залишаємо mock data для першого запуску
function generateMockData() {
    const data = [];
    for (let i = 14; i >= 1; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const mockEntry = {
            date: dateString,
            sleep: Math.floor(Math.random() * 3) + 7, 
            soreness: Math.floor(Math.random() * 4) + 1, 
            mood: Math.floor(Math.random() * 3) + 7, 
            water: Math.floor(Math.random() * 3) + 7, 
            stress: Math.floor(Math.random() * 4) + 1, 
            ready: Math.floor(Math.random() * 3) + 7 
        };
        const sum = INDICATORS.reduce((acc, ind) => acc + mockEntry[ind.key], 0);
        mockEntry.average = sum / INDICATORS.length;
        data.push(mockEntry);
    }
    return data;
}

function loadData() {
    let data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data || data.length === 0) {
        // Якщо немає реальних даних, використовуємо фіктивні
        data = generateMockData();
    }
    // Обмежуємо дані останніми 14 записами
    if (data.length > 14) {
        data = data.slice(data.length - 14);
    }
    return data;
}

/**
 * 2. Функції для роботи з графіками
 */

// Функція для відображення індивідуальної динаміки (міні-графіки біля питань)
function renderLineCharts(data) {
    INDICATORS.forEach(indicator => {
        const ctx = document.getElementById(indicator.chartId);
        if (!ctx) return;

        // Знищуємо старий екземпляр, щоб запобігти помилкам
        if (chartInstances[indicator.key]) {
            chartInstances[indicator.key].destroy();
        }

        const labels = data.map(entry => entry.date.substring(5)); 
        const scores = data.map(entry => entry[indicator.key] || 0);

        const config = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: indicator.title,
                    data: scores,
                    borderColor: indicator.color,
                    backgroundColor: indicator.color.replace('rgb', 'rgba').replace(')', ', 0.2)'),
                    borderWidth: 1.5,
                    tension: 0.3, 
                    pointRadius: 0, // Приховуємо точки для мінімалізму
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        display: false, 
                        min: 1,
                        max: 10
                    },
                    x: {
                        display: false 
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { 
                        enabled: false // Вимикаємо тултіпи, щоб не заважали дизайну
                    } 
                },
                elements: {
                    line: {
                        borderWidth: 1.5
                    }
                }
            }
        };

        // Створюємо новий екземпляр
        chartInstances[indicator.key] = new Chart(ctx, config);
    });
}

// Функція для відображення Зведеної Радарної діаграми (нижній блок)
function renderRadarChart(latestData) {
    const ctx = document.getElementById('wellnessRadarChart');
    if (!ctx) return;
    
    if (chartInstances['radar']) {
        chartInstances['radar'].destroy();
    }

    const labels = INDICATORS.map(ind => ind.title);
    const dataValues = INDICATORS.map(ind => latestData[ind.key] || 0);
    const averageScore = latestData.average ? latestData.average.toFixed(1) : (dataValues.reduce((a, b) => a + b, 0) / dataValues.length).toFixed(1);

    document.getElementById('main-chart-title').innerHTML = 
        `Wellness Snapshot: ${latestData.date} | Середній рівень: <span style="color: #FFC72C; font-weight: bold;">${averageScore}</span>`;

    const config = {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Показники стану',
                data: dataValues,
                backgroundColor: 'rgba(255, 199, 44, 0.3)',
                borderColor: '#FFC72C',
                pointBackgroundColor: '#FFC72C',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                    grid: { color: 'rgba(255, 255, 255, 0.2)' },
                    pointLabels: { color: '#CCCCCC' },
                    suggestedMin: 1,
                    suggestedMax: 10,
                    ticks: {
                        stepSize: 1,
                        backdropColor: 'rgba(0, 0, 0, 0.5)',
                        color: '#CCCCCC'
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    };
    
    chartInstances['radar'] = new Chart(ctx, config);
}

/**
 * 3. Логіка "Один раз на день"
 */

function checkDailyEntry() {
    const today = getTodayDate();
    const isSubmitted = dailyScores.some(entry => entry.date === today);
    const form = document.getElementById('wellness-form');
    const statusHeader = document.getElementById('daily-entry-status');
    const submitButton = document.getElementById('submit-button');
    const radioInputs = form.querySelectorAll('input[type="radio"]');

    if (isSubmitted) {
        radioInputs.forEach(input => input.disabled = true);
        submitButton.disabled = true;
        submitButton.textContent = "Дані за сьогодні вже записано";
        submitButton.style.backgroundColor = '#4CAF50'; 
        statusHeader.textContent = "Щоденне опитування: Дані записано! ✅";
        
        // Відображаємо записані дані на формі
        const currentEntry = dailyScores.find(entry => entry.date === today);
        if (currentEntry) {
            INDICATORS.forEach(indicator => {
                const radio = form.querySelector(`input[name="${indicator.key}"][value="${currentEntry[indicator.key]}"]`);
                if (radio) {
                    radio.checked = true;
                }
            });
        }

    } else {
        // Якщо дані можна вводити
        radioInputs.forEach(input => input.disabled = false);
        submitButton.disabled = false;
        submitButton.textContent = "Записати дані за сьогодні";
        submitButton.style.backgroundColor = '#FFC72C'; 
        statusHeader.textContent = "Щоденне опитування: Введіть дані";
        form.reset(); // Очищаємо форму, якщо чекаємо на новий запис
    }
}

function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const today = getTodayDate();
    
    // Перевірка
    if (dailyScores.some(entry => entry.date === today)) {
        alert("Ви можете залишити оцінку лише один раз на день.");
        return;
    }

    const formData = new FormData(form);
    const newEntry = { date: today };
    let sum = 0;
    let allFieldsFilled = true;

    INDICATORS.forEach(indicator => {
        const value = formData.get(indicator.key);
        if (value) {
            const numericValue = parseInt(value);
            newEntry[indicator.key] = numericValue;
            sum += numericValue;
        } else {
            allFieldsFilled = false;
        }
    });

    if (!allFieldsFilled) {
        alert("Будь ласка, заповніть усі 6 показників.");
        return;
    }

    newEntry.average = sum / INDICATORS.length;

    // Збереження нового запису
    dailyScores.push(newEntry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyScores));

    // Оновлення всіх графіків та статусу форми
    renderAllCharts();
    checkDailyEntry(); // Вимикаємо форму після збереження
    
    alert(`Дані за ${today} успішно записано! Середній рівень: ${newEntry.average.toFixed(1)}`);
}

/**
 * 4. Ініціалізація
 */

function renderAllCharts() {
    const radarContainer = document.getElementById('radar-container');
    
    if (dailyScores.length > 0) {
        // Оновлюємо, якщо є дані
        const latestData = dailyScores[dailyScores.length - 1];
        renderLineCharts(dailyScores);
        renderRadarChart(latestData);
        if (radarContainer) radarContainer.style.display = 'block';
    } else {
        // Приховуємо, якщо даних немає
        document.getElementById('main-chart-title').innerHTML = 'Wellness Snapshot: Дані відсутні';
        if (radarContainer) radarContainer.style.display = 'none'; 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Завантажуємо дані
    dailyScores = loadData();
    
    // 2. Рендеримо всі графіки
    renderAllCharts();

    // 3. Додаємо обробник подій для форми
    const form = document.getElementById('wellness-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // 4. Перевіряємо, чи можна сьогодні вводити дані
    checkDailyEntry();
});
