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
    // Приклад даних для візуалізації
    const dataTemplate = {
        labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
        datasets: [{
            label: 'Поточний тиждень',
            data: [7, 8, 7, 6, 8, 9, 7], 
            borderColor: 'rgb(51, 51, 51)', 
            backgroundColor: 'rgba(51, 51, 51, 0.1)',
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
                    backgroundColor: 'rgba(255, 215, 0, 0.4)', // Золотий
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
                        // === СІТКА ТА ОСІ ЗІ СВІТЛО-СІРИМ КОЛЬОРОМ ===
                        grid: {
                            color: '#CCCCCC', // Світло-сірий для сітки
                        },
                        angleLines: {
                            display: true,
                            color: '#CCCCCC' // Світло-сірий для кутових ліній
                        },
                        pointLabels: {
                            color: 'white', // Білий для назв категорій
                            font: { size: 12 }
                        },
                        ticks: {
                            color: 'white', // Білий для чисел на осі
                            backdropColor: 'rgba(0, 0, 0, 0)', // Прозорий фон чисел
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
                            color: 'white' // Білий колір для легенди
                        }
                    },
                    title: { display: false }
                }
            }
        });
    }
}

// Функція перевірки та застосування обмеження "раз на день"
function checkDailyRestriction() {
    const form = document.getElementById('wellness-form');
    const button = document.querySelector('.gold-button');
    // Ключ у localStorage для зберігання дати
    const lastDate = localStorage.getItem('lastWellnessSubmissionDate');
    const today = getTodayDateString();

    if (form && lastDate === today) {
        // Якщо дата сьогоднішня, вимикаємо форму
        const inputs = form.querySelectorAll('input, button');
        inputs.forEach(input => {
            input.disabled = true;
        });
        
        // Змінюємо кнопку
        button.textContent = "Дані на сьогодні вже записані.";
        button.style.backgroundColor = '#6c757d'; 
        button.style.cursor = 'not-allowed';
        
        // Додаємо повідомлення
        if (!document.getElementById('restriction-message')) {
            const message = document.createElement('p');
            message.id = 'restriction-message';
            message.style.marginTop = '15px';
            message.style.color = '#dc3545';
            message.style.fontWeight = 'bold';
            message.textContent = "Ви можете надіслати опитування лише раз на день. Приходьте завтра!";
            form.prepend(message);
        }
        return true; // Повертаємо true, якщо обмеження застосовано
    }
    return false; // Повертаємо false, якщо обмеження не застосовано
}


// 2. АКТИВАЦІЯ МЕНЮ ТА ІНІЦІАЛІЗАЦІЯ
document.addEventListener('DOMContentLoaded', function() {
    // Отримуємо назву поточного файлу
    const currentPath = window.location.pathname.split('/').pop();
    const sidebarLinks = document.querySelectorAll('.sidebar a');

    // Логіка підсвічування активного пункту меню
    sidebarLinks.forEach(link => {
        link.classList.remove('active'); 
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Ініціалізація графіків та обмежень, якщо ми на сторінці Wellness Control
    if (currentPath === 'wellness.html') {
        initCharts();
        
        // Перевірка обмеження при завантаженні сторінки
        checkDailyRestriction(); 

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Повторна перевірка перед відправкою, щоб уникнути подвійного кліку
                if (checkDailyRestriction()) {
                    return;
                }
                
                // --- ПРОСТА ВАЛІДАЦІЯ ---
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
                
                // --- СИМУЛЯЦІЯ ЗБЕРЕЖЕННЯ ---
                
                // У реальному проекті тут потрібно зібрати всі значення та надіслати їх на сервер.
                const submissionData = {};
                form.querySelectorAll('input[type="radio"]:checked').forEach(input => {
                    submissionData[input.name] = input.value;
                });
                console.log("Дані для відправки:", submissionData);


                // 1. Збереження дати відправки в localStorage
                localStorage.setItem('lastWellnessSubmissionDate', getTodayDateString());
                
                // 2. Застосування обмеження (вимикаємо форму)
                checkDailyRestriction(); 
                
                alert("Ваші дані Wellness успішно записані!");
            });
        }
    }
});
