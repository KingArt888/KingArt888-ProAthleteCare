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
    // --- ЗНИЩЕННЯ ІСНУЮЧИХ ГРАФІК
