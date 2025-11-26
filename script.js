document.addEventListener('DOMContentLoaded', () => {
    // 1. Посилання на елементи DOM
    const wellnessForm = document.getElementById('wellness-form');
    const chartArea = document.querySelector('.chart-area');

    // Тимчасова функція для імітації збереження та оновлення графіка
    function updateDashboard(data) {
        // Логіка для збереження даних (наприклад, у LocalStorage або відправка на сервер)
        console.log('--- Зібрані дані Wellness (6 точок) ---');
        console.log('Сон (1-10):', data.sleep);
        console.log('Біль/Втома (1-10):', data.soreness);
        console.log('Енергія/Настрій (1-10):', data.mood);
        console.log('Гідратація (1-10):', data.water);
        console.log('Стрес (1-10):', data.stress);
        console.log('Готовність (1-10):', data.ready);
        console.log('--------------------------------------');

        // Імітація оновлення графіка
        chartArea.innerHTML = `
            <h3>Дані оновлено! ✅</h3>
            <p>Сьогоднішній загальний рівень (середній, 1-10): <strong>${data.average.toFixed(1)}</strong></p>
            <p style="font-size: 0.9em; color: #888;">Для реального відображення графіка тут потрібна бібліотека (наприклад, Chart.js).</p>
        `;
    }

    // 2. Обробка події відправки форми
    if (wellnessForm) {
        wellnessForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Зупиняємо стандартну відправку форми
            
            const formData = new FormData(wellnessForm);
            const data = {};
            let sum = 0;
            let count = 0;

            // Збираємо дані. Усі шкали тепер 1-10.
            for (const [key, value] of formData.entries()) {
                const numericValue = parseInt(value);
                data[key] = numericValue;
                
                sum += numericValue;
                count++;
            }

            // Розрахунок середнього рівня Wellness (на шкалі 1-10)
            // 6 показників по 10 балів кожен.
            data.average = sum / count;

            updateDashboard(data);
        });
    }
});
