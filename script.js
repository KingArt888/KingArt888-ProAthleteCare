// script.js

// Функція для отримання поточної дати у форматі YYYY-MM-DD
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const GREY_GRID = '#CCCCCC'; // Сірий колір сітки для чорного фону

    // Шаблон даних для міні-графіків
    const dataTemplate = {
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
        datasets: [{
            label: 'Поточний тиждень',
            data: [7, 8, 7, 6, 8, 9, 7], 
            borderColor: GOLD_COLOR, 
            backgroundColor: GOLD_AREA,
            tension: 0.3,
            fill: true
        }]
    };

    const config = {
        type: 'line',
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 1,
                    max: 10,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: { display: false },
                title: { display: false }
            }
        }
    };

    // Створення маленьких графіків з індивідуальними кольорами
    const charts = [
        // Золотий
        { id: 'chart-sleep', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [7, 8, 7, 6, 8, 9, 7], label: 'Сон' }] } },
        // Червоний (Біль)
        { id: 'chart-soreness', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [4, 5, 3, 6, 5, 2, 4], label: 'Біль', borderColor: RED_COLOR, backgroundColor: RED_AREA }] } },
        // Золотий
        { id: 'chart-mood', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [9, 8, 9, 7, 8, 10, 9], label: 'Настрій' }] } },
        // Золотий
        { id: 'chart-water', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [8, 9, 7, 8, 9, 9, 8], label: 'Гідратація' }] } },
        // Помаранчевий (Стрес)
        { id: 'chart-stress', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [3, 4, 5, 5, 4, 2, 3], label: 'Стрес', borderColor: ORANGE_COLOR, backgroundColor: ORANGE_AREA }] } },
        // Золотий
        { id: 'chart-ready', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [9, 8, 8, 7, 9, 10, 9], label: 'Готовність' }] } },
    ];

    charts.forEach(chart => {
        const ctx = document.getElementById(chart.id);
        if (ctx) new Chart(ctx, { ...config, data: chart.data });
    });

    // Створення великого зведеного графіку (Radar Chart)
    const mainCtx = document.getElementById('wellnessChart');
    if (mainCtx) {
        new Chart(mainCtx, {
            type: 'radar',
            data: {
                labels: ['Сон', 'Біль', 'Настрій', 'Гідратація', 'Стрес', 'Готовність'],
                datasets: [{
                    label: 'Поточний стан (середній бал)',
                    data: [7.5, 4.5, 8.5, 8.3, 3.8, 8.8], 
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
                        // СІТКА ТА ОСІ ЗІ СВІТЛО-СІРИМ КОЛЬОРОМ (ЗАПИТАНО)
                        grid: {
                            color: GREY_GRID, 
                        },
                        angleLines: {
                            display: true,
                            color: GREY_GRID
                        },
                        pointLabels: {
                            color: 'white', // Білий текст на чорному фоні
                            font: { size: 12 }
                        },
                        ticks: {
                            color: 'white', 
                            backdropColor: 'rgba(0, 0, 0, 0)', 
                            stepSize: 1,
                            min: 0,
                            max: 10,
                        },
                        suggestedMin: 1,
                        suggestedMax: 10
                    }
                },
                plugins: {
                    legend: { 
                        display: true, 
                        position: 'top',
                        labels: {
                            color: 'white'
                        }
                    },
                    title: { display: false }
                }
            }
        });
    }
}

// Функція перевірки та застосування обмеження "раз на день"
function checkDailyRestriction
