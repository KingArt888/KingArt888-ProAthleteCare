// ... (Функції getTodayDateString, loadWellnessHistory, saveWellnessHistory, КОНСТАНТИ - без змін)

// ==============================================
// 2. ФУНКЦІЯ ДЛЯ ОНОВЛЕННЯ СТАТИСТИКИ (ПІД ГРАФІКАМИ)
// ==============================================

/**
 * Відображає останній бал під кожним міні-графіком.
 */
function updateWellnessStats(latestData) {
    // ... (без змін)
    WELLNESS_FIELDS.forEach(field => {
        const statElement = document.getElementById(`stat-${field}`);
        if (statElement) {
            const score = latestData[field] !== undefined ? latestData[field] : 0; 
            statElement.textContent = `Оцінка: ${score} / 10`;
            statElement.style.color = score >= 7 ? LIME_COLOR : (score >= 4 ? ORANGE_COLOR : RED_COLOR);
        }
    });
}


// ==============================================
// 3. КОД ДЛЯ ГРАФІКІВ
// ==============================================
function initCharts() {
    
    // --- ДИНАМІЧНЕ ЗАВАНТАЖЕННЯ ТА ПІДГОТОВКА ДАНИХ ---
    const history = loadWellnessHistory();
    const sortedDates = Object.keys(history).sort(); 

    // -----------------------------------------------------------------
    // --- ЗНИЩЕННЯ ІСНУЮЧИХ ГРАФІКІВ (ВИПРАВЛЕННЯ Type Error) ---
    // -----------------------------------------------------------------
    // Знищуємо міні-графіки
    WELLNESS_FIELDS.forEach(field => {
        // Перевіряємо, чи існує глобальна змінна для кожного міні-графіка
        if (window[`chart_${field}`] && typeof window[`chart_${field}`].destroy === 'function') {
            window[`chart_${field}`].destroy();
            window[`chart_${field}`] = null;
        }
    });
    // Знищуємо Радар графік
    if (window.wellnessChart && typeof window.wellnessChart.destroy === 'function') {
        window.wellnessChart.destroy();
        window.wellnessChart = null;
    }


    // Якщо даних немає, показуємо заглушку
    if (sortedDates.length === 0) {
        // ... (код для повідомлення про відсутність даних - без змін)
        updateWellnessStats({});
        
        const formCard = document.querySelector('.form-card');
        const existingMessage = document.getElementById('no-data-message');

        if (!existingMessage && formCard) {
             const message = document.createElement('p');
             message.id = 'no-data-message';
             message.className = 'placeholder-text'; 
             message.style.textAlign = 'center';
             message.textContent = 'Жодного запису ще не збережено. Заповніть форму, щоб почати бачити графіки!';
             formCard.append(message);
        }
        
        const chartArea = document.querySelector('.chart-area');
        if (chartArea) {
             chartArea.innerHTML = '<canvas id="wellnessChart"></canvas>'; 
        }
        return; 
    }
    
    // Видаляємо повідомлення, якщо дані є
    const noDataMessage = document.getElementById('no-data-message');
    if (noDataMessage) noDataMessage.remove();


    // Створюємо загальні масиви міток та точок
    const chartLabels = sortedDates.map(date => {
        const parts = date.split('-');
        return `${parts[1]}/${parts[2]}`;
    });
    
    // Створюємо масив даних для кожного показника
    const chartData = {};
    WELLNESS_FIELDS.forEach(field => {
        chartData[field] = sortedDates.map(date => history[date][field] || 0); 
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
             animation: true, 
             scales: {
                 y: {
                     min: 1,
                     max: 10,
                     title: { display: false },
                     ticks: { stepSize: 1, color: 'white', display: false }, 
                     grid: { color: 'rgba(255, 255, 255, 0.1)', display: false } 
                 },
                 x: {
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
        // *** ВИПРАВЛЕННЯ: Динамічне створення контейнера Canvas, якщо його немає ***
        let ctx = document.getElementById(`chart-${field}`);

        if (ctx) {
             // Якщо canvas вже існує, але має старий контекст Chart, ми його вже знищили вище.

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

    const mainCtx = document.getElementById('wellnessChart');

    if (mainCtx) {
        // ... (Радар графік - без змін)
        const radarData = WELLNESS_FIELDS.map(field => latestData[field]);
        
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
    // ... (без змін)
    const form = document.getElementById('wellness-form');
    const button = document.querySelector('.gold-button');
    const lastDate = localStorage.getItem('lastWellnessSubmissionDate');
    const today = getTodayDateString(); 

    if (!form || !button) return false;

    if (lastDate === today) {
        // ... (блокування - без змін)
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.disabled = true;
        });
        
        button.disabled = true;
        button.textContent = "Дані на сьогодні вже записані.";
        button.classList.add('disabled-button'); 
        button.style.backgroundColor = ''; 
        button.style.cursor = '';
        
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
    } else {
        // ... (розблокування - без змін)
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.disabled = false;
            input.checked = false; 
        });
        
        button.disabled = false;
        button.textContent = "Записати 6 точок даних";
        button.classList.remove('disabled-button'); 
        button.style.backgroundColor = ''; 
        button.style.cursor = '';
        
        const message = document.getElementById('restriction-message');
        if (message) message.remove();
        
        return false;
    }
}


// ==============================================
// 4. АКТИВАЦІЯ ФУНКЦІОНАЛУ Wellness 
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    
    const isWellnessPage = window.location.pathname.includes('wellness.html');

    if (isWellnessPage) {
        
        initCharts();
        checkDailyRestriction();

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
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
                    submissionData[input.name] = parseInt(input.value, 10);
                });
                
                const todayDate = getTodayDateString();
                
                saveWellnessHistory(todayDate, submissionData);
                localStorage.setItem('lastWellnessSubmissionDate', todayDate);
                
                // *** ВИПРАВЛЕННЯ: Додано невелику затримку для оновлення DOM/відображення
                // Це може допомогти, якщо браузер не встигає повністю оновити DOM 
                // перед ініціалізацією Chart.js, особливо на мобільних пристроях. ***
                setTimeout(() => {
                    initCharts(); 
                    checkDailyRestriction();
                    alert("Ваші дані Wellness успішно записані!");
                }, 100); 

                // initCharts(); // Стара логіка
                // checkDailyRestriction(); // Стара логіка
                // alert("Ваші дані Wellness успішно записані!"); // Стара логіка
            });
        }
    }
});
