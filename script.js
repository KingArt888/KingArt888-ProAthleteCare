// Зберігатимемо дані у LocalStorage
let dailyScores = JSON.parse(localStorage.getItem('athleteWellnessScores')) || [];

/**
 * Рендерить один маленький лінійний графік для заданої метрики.
 */
function renderSmallChart(metricKey, canvasId, chartColor, labelText) {
    const chartCanvas = document.getElementById(canvasId);
    if (!chartCanvas) return;

    // Знищуємо попередній графік, якщо він існує
    if (window[canvasId]) {
        window[canvasId].destroy();
    }

    // Якщо менше двох точок даних, графік не малюємо, просто виходимо
    if (dailyScores.length < 2) {
        chartCanvas.style.display = 'none';
        return;
    }
    chartCanvas.style.display = 'block';

    // Екстрагуємо часові ряди для конкретної метрики
    const dates = dailyScores.map(score => score.date);
    const dataPoints = dailyScores.map(score => score[metricKey]);

    const chartArea = chartCanvas.getContext('2d');

    window[canvasId] = new Chart(chartArea, {
        type: 'line', // Лінійний графік для хронології
        data: {
            labels: dates,
            datasets: [{
                label: labelText,
                data: dataPoints,
                borderColor: chartColor,
                backgroundColor: chartColor.replace('1)', '0.2)'), // Напівпрозорий фон
                tension: 0.4, // Згладжування лінії
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: chartColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 5, bottom: 5, left: 0, right: 10 }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    display: false, // Приховати вісь Y
                    grid: { display: false }
                },
                x: {
                    display: false, // Приховати вісь X
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
}

/**
 * Рендерить головний графік (Динаміка середнього Wellness).
 */
function renderMainChart(scores) {
    const chartCanvas = document.getElementById('wellnessChart');
    if (!chartCanvas) return;

    if (window.myWellnessChart) {
        window.myWellnessChart.destroy();
    }

    const dates = scores.map(score => score.date);
    const averages = scores.map(score => score.average.toFixed(1));

    const chartArea = chartCanvas.getContext('2d');

    window.myWellnessChart = new Chart(chartArea, {
        type: 'line', // Лінійний графік для хронології середнього
        data: {
            labels: dates,
            datasets: [{
                label: 'Середній рівень Wellness (1-10)',
                data: averages,
                borderColor: '#FFC72C', // Золотий
                backgroundColor: 'rgba(255, 199, 44, 0.3)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#FFC72C',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Середній рівень (1-10)',
                        color: '#CCCCCC'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#CCCCCC'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#CCCCCC'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#CCCCCC' }
                }
            }
        }
    });
    
    // Оновлюємо заголовок з останнім середнім показником
    const latestAverage = scores.length > 0 ? scores[scores.length - 1].average.toFixed(1) : 'Н/Д';
    document.querySelector('.chart-card h3').innerHTML = `Індивідуальна динаміка Wellness (Останнє Середнє: ${latestAverage})`;
}

/**
 * Загальна функція для рендерингу всіх графіків.
 */
function renderAllCharts(scores) {
    const chartArea = document.querySelector('.chart-area');
    if (scores.length === 0) {
        chartArea.innerHTML = '<p class="placeholder-text">Заповніть форму, щоб побачити графік динаміки стану.</p>';
        return;
    }
    // Перевіряємо, чи є canvas для головного графіка, інакше вставляємо його назад
    if (!document.getElementById('wellnessChart')) {
        chartArea.innerHTML = '<canvas id="wellnessChart"></canvas>';
    }

    // 1. Рендеримо Головний графік (Середнє)
    renderMainChart(scores);

    // 2. Рендеримо всі 6 малих графіків
    const metrics = [
        { key: 'sleep', id: 'chart-sleep', color: 'rgba(255, 199, 44, 1)', label: 'Сон' },
        { key: 'soreness', id: 'chart-soreness', color: 'rgba(218, 62, 82, 1)', label: 'Біль/Втома' },
        { key: 'mood', id: 'chart-mood', color: 'rgba(75, 192, 192, 1)', label: 'Енергія/Настрій' },
        { key: 'water', id: 'chart-water', color: 'rgba(54, 162, 235, 1)', label: 'Гідратація' },
        { key: 'stress', id: 'chart-stress', color: 'rgba(255, 99, 132, 1)', label: 'Стрес' },
        { key: 'ready', id: 'chart-ready', color: 'rgba(153, 102, 255, 1)', label: 'Готовність' },
    ];

    metrics.forEach(m => {
        renderSmallChart(m.key, m.id, m.color, m.label);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const wellnessForm = document.getElementById('wellness-form');
    const submitButton = document.querySelector('.gold-button');

    // Хелпер для отримання сьогоднішньої дати у форматі 'ДД.ММ.РРРР'
    const getTodayDate = () => new Date().toLocaleDateString('uk-UA');

    /**
     * Перевіряє щоденну подачу і блокує форму, якщо дані вже подано.
     */
    const checkDailySubmission = () => {
        const today = getTodayDate();
        const submittedToday = dailyScores.some(score => score.date === today);

        if (submittedToday) {
            submitButton.disabled = true;
            submitButton.textContent = `Дані за ${today} вже записано. (Спробуйте завтра)`;
            submitButton.classList.add('disabled-button');
            wellnessForm.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = true);
            return true;
        } else {
            submitButton.disabled = false;
            submitButton.textContent = 'Записати 6 точок даних';
            submitButton.classList.remove('disabled-button');
            wellnessForm.querySelectorAll('input[type="radio"]').forEach(input => input.disabled = false);
            return false;
        }
    };
    
    // Початкова перевірка при завантаженні сторінки
    checkDailySubmission();

    if (wellnessForm) {
        wellnessForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            if (checkDailySubmission()) {
                alert('Ви вже подали дані Wellness сьогодні.');
                return;
            }
            
            const formData = new FormData(wellnessForm);
            const data = { date: getTodayDate() };
            let sum = 0;
            let count = 0;

            // Збираємо дані та перевіряємо, чи всі 6 показників заповнені
            for (const [key, value] of formData.entries()) {
                const numericValue = parseInt(value);
                // Ми впевнені, що тут є тільки 6 показників і 1 date.
                data[key] = numericValue;
                sum += numericValue;
                count++;
            }
            
            if (count !== 6) {
                alert('Будь ласка, оцініть всі 6 показників перед відправкою.');
                return;
            }

            // Розрахунок середнього рівня Wellness
            data.average = sum / 6;

            // 1. Зберігаємо новий запис
            dailyScores.push(data);
            localStorage.setItem('athleteWellnessScores', JSON.stringify(dailyScores));

            // 2. Оновлюємо всі графіки та блокуємо форму
            renderAllCharts(dailyScores);
            checkDailySubmission(); // Блокуємо кнопку після успішного подання
            
            alert(`Дані записано! Середній показник Wellness: ${data.average.toFixed(1)}`);
        });
    }

    // Завантажуємо і рендеримо графіки при завантаженні сторінки
    renderAllCharts(dailyScores);
});
