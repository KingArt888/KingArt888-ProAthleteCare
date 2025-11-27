// script.js

// Функція для отримання поточної дати у форматі YYYY-MM-DD
function getTodayDateString() {
// ... (Функція без змін) ...
}

// 1. КОД ДЛЯ ГРАФІКІВ (ТІЛЬКИ ДЛЯ wellness.html)
function initCharts() {
    // --- КОЛЬОРОВІ КОНСТАНТИ ДЛЯ МІНІ-ГРАФІКІВ ---
    const GOLD_COLOR = 'rgb(255, 215, 0)';
    const GOLD_AREA = 'rgba(255, 215, 0, 0.4)';
    const RED_COLOR = 'rgb(255, 99, 132)'; 
    const RED_AREA = 'rgba(255, 99, 132, 0.4)';
    const ORANGE_COLOR = 'rgb(255, 159, 64)';
    const ORANGE_AREA = 'rgba(255, 159, 64, 0.4)';
    const GREY_GRID = '#CCCCCC'; 
    
    // --- ДОДАНІ ВАШІ КОЛЬОРИ ---
    const BLUE_COLOR = 'rgb(0, 191, 255)'; // Блакитний для Гідратації
    const BLUE_AREA = 'rgba(0, 191, 255, 0.4)'; 
    
    const PURPLE_COLOR = 'rgb(147, 112, 219)'; // Фіолетовий для Настрою <--- ВИПРАВЛЕНО
    const PURPLE_AREA = 'rgba(147, 112, 219, 0.4)'; 
    
    const LIME_COLOR = 'rgb(50, 205, 50)'; // Салатовий для Готовності <--- ВИПРАВЛЕНО
    const LIME_AREA = 'rgba(50, 205, 50, 0.4)';

    // ... (далі код без змін) ...
    
    // Створення маленьких графіків з індивідуальними кольорами
    const charts = [
        // Золотий (Сон)
        { id: 'chart-sleep', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [7, 8, 7, 6, 8, 9, 7], label: 'Сон' }] } },
        // Червоний (Біль)
        { id: 'chart-soreness', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [4, 5, 3, 6, 5, 2, 4], label: 'Біль', borderColor: RED_COLOR, backgroundColor: RED_AREA }] } },
        
        // ФІОЛЕТОВИЙ (Настрій) <--- ЗАСТОСОВАНО
        { id: 'chart-mood', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [9, 8, 9, 7, 8, 10, 9], label: 'Настрій', borderColor: PURPLE_COLOR, backgroundColor: PURPLE_AREA }] } },
        
        // БЛАКИТНИЙ (Гідратація)
        { id: 'chart-water', data: { 
            ...dataTemplate, 
            datasets: [{ 
                ...dataTemplate.datasets[0], 
                data: [8, 9, 7, 8, 9, 9, 8], 
                label: 'Гідратація',
                borderColor: BLUE_COLOR, 
                backgroundColor: BLUE_AREA 
            }] 
        } },
        
        // Помаранчевий (Стрес)
        { id: 'chart-stress', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [3, 4, 5, 5, 4, 2, 3], label: 'Стрес', borderColor: ORANGE_COLOR, backgroundColor: ORANGE_AREA }] } },
        
        // САЛАТОВИЙ (Готовність) <--- ЗАСТОСОВАНО
        { id: 'chart-ready', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [9, 8, 8, 7, 9, 10, 9], label: 'Готовність', borderColor: LIME_COLOR, backgroundColor: LIME_AREA }] } },
    ];
// ... (кінець коду без змін) ...
