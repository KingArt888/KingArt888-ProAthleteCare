// Зберігатимемо дані у LocalStorage
let dailyScores = JSON.parse(localStorage.getItem('athleteWellnessScores')) || [];

function renderChart(scores) {
    // Отримуємо контекст для малювання
    const chartCanvas = document.getElementById('wellnessChart');
    if (!chartCanvas) return; // Запобігання помилці, якщо елемент не знайдено

    const chartArea = chartCanvas.getContext('2d');
    
    // Якщо графік вже існує, знищити його, щоб намалювати новий
    if (window.myWellnessChart) {
        window.myWellnessChart.destroy();
    }

    // Останній запис (сьогоднішній)
    const latestData = scores[scores.length - 1];

    if (!latestData) {
        chartCanvas.style.display = 'none'; // Сховати, якщо немає даних
        return;
    }
    chartCanvas.style.display = 'block';

    // Мітки для 6 показників
    const labels = [
        'Сон (1-10)', 
        'Біль/Втома (1-10)', 
        'Енергія/Настрій (1-10)', 
        'Гідратація (1-10)', 
        'Стрес (1-10)', 
        'Готовність (1-10)'
    ];

    // Значення з останнього запису
    const dataValues = [
        latestData.sleep, 
        latestData.soreness, 
        latestData.mood, 
        latestData.water, 
        latestData.stress, 
        latestData.ready
    ];

    window.myWellnessChart = new Chart(chartArea, {
        type: 'bar', // Використовуємо стовпчасту діаграму для 6 показників
        data: {
            labels: labels,
            datasets: [{
                label: `Дані за ${latestData.date}`,
                data: dataValues,
                backgroundColor: [
                    'rgba(255, 199, 44, 0.8)', // Gold (Сон)
                    'rgba(218, 62, 82, 0.8)',  // Red (Біль)
                    'rgba(75, 192, 192, 0.8)', // Teal (Енергія)
                    'rgba(54, 162, 235, 0.8)', // Blue (Гідратація)
                    'rgba(255, 99, 132, 0.8)', // Pink (Стрес)
                    'rgba(153, 102, 255, 0.8)' // Purple (Готовність)
                ],
                borderColor: '#FFC72C',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Дозволяє краще керувати розміром
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Рівень (1-10)',
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
                    display: false
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const wellnessForm = document.getElementById('wellness-form');

    if (wellnessForm) {
        wellnessForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            const formData = new FormData(wellnessForm);
            const data = { date: new Date().toLocaleDateString('uk-UA') };
            let sum = 0;

            // Збираємо дані (усі 1-10)
            for (const [key, value] of formData.entries()) {
                const numericValue = parseInt(value);
                data[key] = numericValue;
                sum += numericValue;
            }

            // Розрахунок середнього рівня Wellness (на шкалі 1-10)
            data.average = sum / 6;

            // 1. Зберігаємо новий запис
            dailyScores.push(data);
            localStorage.setItem('athleteWellnessScores', JSON.stringify(dailyScores));

            // 2. Оновлюємо графік
            renderChart(dailyScores);
            
            // Оновлюємо заголовок, щоб показати середній показник
            document.querySelector('.chart-card h3').innerHTML = `Індивідуальна динаміка Wellness (Середнє: ${data.average.toFixed(1)})`;
        });
    }

    // Завантажуємо графік при завантаженні сторінки (якщо є дані)
    if (dailyScores.length > 0) {
        renderChart(dailyScores);
    } else {
        // Якщо даних немає, показуємо заглушку
        document.querySelector('.chart-area').innerHTML = '<p class="placeholder-text">Заповніть форму, щоб побачити графік динаміки стану.</p>';
    }
});
