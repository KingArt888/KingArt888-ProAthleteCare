// ==============================================
// --- ФУНКЦІЇ ДЛЯ РОБОТИ З ДАНИМИ ---
// ==============================================

/**
 * Повертає поточну дату у форматі YYYY-MM-DD.
 */
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Завантажує всю історію оцінок Wellness з LocalStorage.
 */
function loadWellnessHistory() {
    const data = localStorage.getItem('wellnessHistory');
    return data ? JSON.parse(data) : {};
}

/**
 * Зберігає щоденні оцінки у LocalStorage.
 * @param {string} date - Поточна дата (YYYY-MM-DD).
 * @param {Object} scores - Об'єкт з оцінками.
 */
function saveWellnessHistory(date, scores) {
    const history = loadWellnessHistory();
    history[date] = scores;
    localStorage.setItem('wellnessHistory', JSON.stringify(history));
}


// ==============================================
// 1. КОНСТАНТИ
// ==============================================
// Золото-чорна стилістика
const GOLD_COLOR = 'rgb(255, 215, 0)';
const GOLD_AREA = 'rgba(255, 215, 0, 0.4)';
const RED_COLOR = 'rgb(255, 99, 132)'; 
const RED_AREA = 'rgba(255, 99, 132, 0.4)';
const ORANGE_COLOR = 'rgb(255, 159, 64)'; 
const ORANGE_AREA = 'rgba(255, 159, 64, 0.4)';
const BLUE_COLOR = 'rgb(0, 191, 255)'; 
const BLUE_AREA = 'rgba(0, 191, 255, 0.4)';
const PURPLE_COLOR = 'rgb(147, 112, 219)'; 
const PURPLE_AREA = 'rgba(147, 112, 219, 0.4)';
const LIME_COLOR = 'rgb(50, 205, 50)'; 
const LIME_AREA = 'rgba(50, 205, 50, 0.4)';
const GREY_GRID = '#CCCCCC';

const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
const FIELD_LABELS = {
    sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', 
    water: 'Гідратація', stress: 'Стрес', ready: 'Готовність'
};

const colorsMap = {
    sleep: { color: GOLD_COLOR, area: GOLD_AREA },
    soreness: { color: RED_COLOR, area: RED_AREA },
    mood: { color: PURPLE_COLOR, area: PURPLE_AREA },
    water: { color: BLUE_COLOR, area: BLUE_AREA },
    stress: { color: ORANGE_COLOR, area: ORANGE_AREA },
    ready: { color: LIME_COLOR, area: LIME_AREA },
};


// ==============================================
// 2. ФУНКЦІЯ ДЛЯ ОНОВЛЕННЯ СТАТИСТИКИ (ПІД ГРАФІКАМИ)
// ==============================================

/**
 * Відображає останній бал під кожним міні-графіком.
 * Потрібні елементи з ID="stat-[назва_поля]" в HTML.
 */
function updateWellnessStats(latestData) {
    WELLNESS_FIELDS.forEach(field => {
        // Використовуємо ID, які ми додамо в HTML: stat-sleep, stat-soreness і т.д.
        const statElement = document.getElementById(`stat-${field}`);
        if (statElement) {
            // Беремо останній бал, або 0, якщо даних немає
            const score = latestData[field] || 0;
            statElement.textContent = `Оцінка: ${score} / 10`;
            
            // Задаємо колір відповідно до балу
            statElement.style.color = score >= 7 ? LIME_COLOR : (score >= 4 ? ORANGE_COLOR : RED_COLOR);
        }
    });
}


// ==============================================
// 3. КОД ДЛЯ ГРАФІКІВ (ТІЛЬКИ ДЛЯ wellness.html)
// ==============================================
function initCharts() {
    
    // --- ДИНАМІЧНЕ ЗАВАНТАЖЕННЯ ТА ПІДГОТОВКА ДАНИХ ---
    const history = loadWellnessHistory();
    // Сортуємо дати для коректного відображення на осі X
    const sortedDates = Object.keys(history).sort(); 

    // -----------------------------------------------------------------
    // --- ЗНИЩЕННЯ ІСНУЮЧИХ ГРАФІКІВ (ВИПРАВЛЕННЯ Type Error) ---
    // -----------------------------------------------------------------
    // Виправлення Uncaught TypeError: destroy is not a function
    WELLNESS_FIELDS.forEach(field => {
        if (window[`chart_${field}`] && typeof window[`chart_${field}`].destroy === 'function') {
            window[`chart_${field}`].destroy();
            window[`chart_${field}`] = null;
        }
    });
    
    const mainCtx = document.getElementById('wellnessChart');
    if (window.wellnessChart && typeof window.wellnessChart.destroy === 'function') {
        window.wellnessChart.destroy();
        window.wellnessChart = null;
    }


    // Якщо даних немає, показуємо заглушку
    if (sortedDates.length === 0) {
        const chartArea = document.querySelector('.chart-area');
        if (chartArea) {
             // Створюємо порожній canvas для подальшого заповнення
            chartArea.innerHTML = '<canvas id="wellnessChart"></canvas>'; 
        }
        
        // Очищаємо статистику і показуємо повідомлення
        updateWellnessStats({});
        const formCard = document.querySelector('.form-card');
        const existingMessage = document.getElementById('no-data-message');

        if (!existingMessage && formCard) {
             const message = document.createElement('p');
             message.id = 'no-data-message';
             // Використовуємо ваш стиль .placeholder-text
             message.className = 'placeholder-text'; 
             message.textContent = 'Жодного запису ще не збережено. Заповніть форму, щоб почати бачити графіки!';
             formCard.append(message);
        }
        return; 
    }
    
    // Видаляємо повідомлення, якщо дані є
    const noDataMessage = document.getElementById('no-data-message');
    if (noDataMessage) noDataMessage.remove();


    // Створюємо загальні масиви міток та точок
    const chartLabels = sortedDates.map(date => {
        // Форматуємо дату для осі X: MM/DD
        const parts = date.split('-');
        return `${parts[1]}/${parts[2]}`;
    });
    
    // Створюємо масив даних для кожного показника
    const chartData = {};
    WELLNESS_FIELDS.forEach(field => {
        chartData[field] = sortedDates.map(date => history[date][field]);
    });
    
    // ----------------------------------------------------
    // --- КОНФІГУРАЦІЇ ГРАФІКІВ ---
    // ----------------------------------------------------
    
    // Базова конфігурація для міні-графіків
    const config = {
        type: 'line',
        options: {
             responsive: true,
             maintainAspectRatio: false,
             animation: true, // Залишаємо анімацію "поступового" заповнення
             scales: {
                y: {
                    min: 1,
                    max: 10,
                    title: { display: false },
                    // Приховуємо числа та сітку на осі Y для мінімалістичного вигляду
                    ticks: { stepSize: 1, color: 'white', display: false }, 
                    grid: { color: 'rgba(255, 255, 255, 0.1)', display: false } 
                },
                x: {
                    // Приховуємо підписи дат та сітку на осі X
                    grid: { color: 'rgba(255, 255, 255, 0.1)', display: false }, 
                    ticks: { color: 'rgba(255, 255, 255, 0.5)', display: false } 
                }
             },
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: { enabled: true }
            }
        }
    };

    // Створення маленьких графіків
    WELLNESS_FIELDS.forEach(field => {
        const ctx = document.getElementById(`chart-${field}`);
        
        if (ctx) {
            const chartDataConfig = {
                labels: chartLabels,
                datasets: [{
                    label: FIELD_LABELS[field],
                    data: chartData[field],
                    borderColor: colorsMap[field].color,
                    backgroundColor: colorsMap[field].area,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 3, 
                    pointHoverRadius: 5,
                }]
            };

            const miniConfig = JSON.parse(JSON.stringify(config));
            
            // Створюємо новий графік і зберігаємо його посилання в window
            window[`chart_${field}`] = new Chart(ctx, { ...miniConfig, data: chartDataConfig });
        }
    });

    // ----------------------------------------------------
    // --- РАДАР ГРАФІК ТА СТАТИСТИКА ---
    // ----------------------------------------------------
    
    const latestData = history[sortedDates[sortedDates.length - 1]];

    // Оновлюємо статистику під питаннями
    updateWellnessStats(latestData);

    if (mainCtx) {
        const radarData = WELLNESS_FIELDS.map(field => latestData[field]);
        
        // Створюємо новий графік
        window.wellnessChart = new Chart(mainCtx, {
            type: 'radar',
            data: {
                labels: Object.values(FIELD_LABELS),
                datasets: [{
                    label: `Поточний стан (оцінки за ${chartLabels[chartLabels.length - 1]})`,
                    data: radarData,
                    backgroundColor: GOLD_AREA,
                    borderColor: 'rgb(51, 51, 51)',
                    pointBackgroundColor: 'rgb(51, 51, 51)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(51, 51, 51)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                    line: { borderWidth: 3 }
                },
                scales: {
                    r: {
                        grid: { color: GREY_GRID },
                        angleLines: { display: true, color: GREY_GRID },
                        pointLabels: { color: 'white', font: { size: 12 } },
                        ticks: { color: 'white', backdropColor: 'rgba(0, 0, 0, 0)', stepSize: 1, min: 0, max: 10 },
                        suggestedMin: 1,
                        suggestedMax: 10
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { color: 'white' }
                    },
                    title: { display: false }
                }
            }
        });
    }
}


// ==============================================
// Функція перевірки та застосування обмеження "раз на день"
// ==============================================
function checkDailyRestriction() {
    const form = document.getElementById('wellness-form');
    const button = document.querySelector('.gold-button');
    const lastDate = localStorage.getItem('lastWellnessSubmissionDate');
    const today = getTodayDateString(); 

    // Якщо ми вже відправляли дані сьогодні
    if (form && lastDate === today) {
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => {
            input.disabled = true;
        });
        
        button.textContent = "Дані на сьогодні вже записані.";
        button.style.backgroundColor = '#6c757d';
        button.style.cursor = 'not-allowed';
        
        if (!document.getElementById('restriction-message')) {
            const message = document.createElement('p');
            message.id = 'restriction-message';
            message.style.marginTop = '15px';
            message.style.color = '#dc3545';
            message.style.fontWeight = 'bold';
            message.textContent = "Ви можете надіслати опитування лише раз на день. Приходьте завтра!";
            form.prepend(message);
        }
        return true;
    }
    return false;
}


// ==============================================
// 4. АКТИВАЦІЯ ФУНКЦІОНАЛУ Wellness 
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    // currentPath використовується для перевірки, чи ми на правильній сторінці
    const currentPath = window.location.pathname.split('/').pop().split('?')[0]; 

    if (currentPath === 'wellness.html') {
        
        // Ініціалізуємо графіки з наявними даними
        initCharts();
        
        // Перевірка обмеження при завантаженні сторінки
        checkDailyRestriction();

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Перевірка, чи форма вже відправлена сьогодні
                if (checkDailyRestriction()) {
                    return;
                }
                
                // --- ВАЛІДАЦІЯ ---
                const requiredRatings = form.querySelectorAll('.rating-group');
                let allChecked = true;
                requiredRatings.forEach(group => {
                    if (!group.querySelector('input:checked')) {
                        allChecked = false;
                    }
                });

                if (!allChecked) {
                    alert("Будь ласка, заповніть усі 6 точок даних перед відправкою.");
                    return;
                }
                
                // --- ЛОГІКА ЗБЕРЕЖЕННЯ ---
                
                const submissionData = {};
                form.querySelectorAll('input[type="radio"]:checked').forEach(input => {
                    // !!! ВАЖЛИВО: Перетворюємо значення на число
                    submissionData[input.name] = parseInt(input.value, 10);
                });
                
                const todayDate = getTodayDateString();
                
                // 1. Зберігаємо дані в історію
                saveWellnessHistory(todayDate, submissionData);
                // 2. Зберігаємо дату останньої відправки
                localStorage.setItem('lastWellnessSubmissionDate', todayDate);
                
                // 3. Оновлюємо графіки та застосовуємо обмеження
                initCharts(); 
                checkDailyRestriction();
                
                alert("Ваші дані Wellness успішно записані!");
            });
        }
    }
});
