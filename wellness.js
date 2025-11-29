// ==============================================
// --- ФУНКЦІЯ ДЛЯ КОНТРОЛЮ ДАТИ ---
// ==============================================
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    // Місяць: додаємо 1, тому що getMonth() повертає 0-11
    const month = String(today.getMonth() + 1).padStart(2, '0');
    // День:
    const day = String(today.getDate()).padStart(2, '0');
    
    // Формат YYYY-MM-DD
    return `${year}-${month}-${day}`;
}


// ==============================================
// 1. КОД ДЛЯ ГРАФІКІВ (ТІЛЬКИ ДЛЯ wellness.html)
// ==============================================
function initCharts() {
    // --- КОЛЬОРОВІ КОНСТАНТИ ДЛЯ ГРАФІКІВ ---
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

    // Шаблон даних для міні-графіків (За замовчуванням Золотий)
    const dataTemplate = {
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
        datasets: [{
            label: 'Поточний тиждень',
            data: [7, 8, 7, 6, 8, 9, 7],
            borderColor: GOLD_COLOR,
            backgroundColor: GOLD_AREA,
            tension: 0.3,
            fill: true,
            pointRadius: 3, 
            pointHoverRadius: 5
        }]
    };

    // Базова конфігурація для міні-графіків
    const config = {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 1,
                    max: 10,
                    // Залишаємо відображення шкал та сітки для осі Y у базовій конфігурації
                    ticks: { stepSize: 1, color: 'white' }, 
                    grid: { color: 'rgba(255, 255, 255, 0.1)' } 
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                }
            },
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: { enabled: true }
            }
        }
    };

    // Створення маленьких графіків з індивідуальними кольорами
    const charts = [
        { id: 'chart-sleep', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [7, 8, 7, 6, 8, 9, 7], label: 'Сон' }] } },
        { id: 'chart-soreness', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [4, 5, 3, 6, 5, 2, 4], label: 'Біль', borderColor: RED_COLOR, backgroundColor: RED_AREA }] } },
        { id: 'chart-mood', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [9, 8, 9
