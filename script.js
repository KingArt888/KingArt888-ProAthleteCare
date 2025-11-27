// script.js

// 1. КОД ДЛЯ ГРАФІКІВ (ТІЛЬКИ ДЛЯ wellness.html)
function initCharts() {
    const dataTemplate = {
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
        datasets: [{
            label: 'Поточний тиждень',
            data: [7, 8, 7, 6, 8, 9, 7], // Приклад даних
            borderColor: 'rgb(0, 77, 64)', // primary-color
            backgroundColor: 'rgba(0, 77, 64, 0.1)',
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

    // Створення маленьких графіків
    const charts = [
        { id: 'chart-sleep', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [7, 8, 7, 6, 8, 9, 7], label: 'Сон' }] } },
        { id: 'chart-soreness', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [4, 5, 3, 6, 5, 2, 4], label: 'Біль', borderColor: 'rgb(255, 99, 132)' }] } },
        { id: 'chart-mood', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [9, 8, 9, 7, 8, 10, 9], label: 'Настрій' }] } },
        { id: 'chart-water', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [8, 9, 7, 8, 9, 9, 8], label: 'Гідратація' }] } },
        { id: 'chart-stress', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [3, 4, 5, 5, 4, 2, 3], label: 'Стрес', borderColor: 'rgb(255, 159, 64)' }] } },
        { id: 'chart-ready', data: { ...dataTemplate, datasets: [{ ...dataTemplate.datasets[0], data: [9, 8, 8, 7, 9, 10, 9], label: 'Готовність' }] } },
    ];

    charts.forEach(chart => {
        const ctx = document.getElementById(chart.id);
        if (ctx) new Chart(ctx, { ...config, data: chart.data });
    });

    // Створення великого зведеного графіку
    const mainCtx = document.getElementById('wellnessChart');
    if (mainCtx) {
        new Chart(mainCtx, {
            type: 'radar',
            data: {
                labels: ['Сон', 'Біль', 'Настрій', 'Гідратація', 'Стрес', 'Готовність'],
                datasets: [{
                    label: 'Поточний стан (середній бал)',
                    data: [7.5, 4.5, 8.5, 8.3, 3.8, 8.8], // Середні значення
                    backgroundColor: 'rgba(255, 215, 0, 0.4)', // Золотий
                    borderColor: 'rgb(0, 77, 64)',
                    pointBackgroundColor: 'rgb(0, 77, 64)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(0, 77, 64)'
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
                        angleLines: { display: false },
                        suggestedMin: 1,
                        suggestedMax: 10
                    }
                },
                plugins: {
                    legend: { display: true, position: 'top' },
                    title: { display: false }
                }
            }
        });
    }
}

// 2. АКТИВАЦІЯ МЕНЮ ТА ІНІЦІАЛІЗАЦІЯ ГРАФІКІВ
document.addEventListener('DOMContentLoaded', function() {
    // Встановлення активного класу для меню на всіх сторінках
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const sidebarLinks = document.querySelectorAll('.sidebar a');

    sidebarLinks.forEach(link => {
        // Прибираємо 'active' з усіх, якщо він був
        link.classList.remove('active'); 
        
        // Встановлюємо 'active' для поточної сторінки
        if (link.getAttribute('href') === currentPath || (currentPath === '' && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
        }
    });

    // Ініціалізація графіків, якщо ми на сторінці Wellness Control
    if (currentPath === 'wellness.html') {
        initCharts();
    }

    // Додайте тут обробку форми, якщо потрібно
    // document.getElementById('wellness-form').addEventListener('submit', function(event) { ... });
});
