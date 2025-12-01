document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // 1. КОНСТАНТИ ТА ЕЛЕМЕНТИ ФОРМИ
    // =========================================================================
    const form = document.getElementById('load-form');
    const dateInput = document.getElementById('date');
    const durationInput = document.getElementById('duration');
    const distanceInput = document.getElementById('distance'); // НОВЕ ПОЛЕ
    
    const acwrValueEl = document.getElementById('acwr-value');
    const acwrNeedle = document.getElementById('acwr-needle');
    const acwrStatusEl = document.getElementById('acwr-status');

    // КОНСТАНТА ДЛЯ ПЕРЕТВОРЕННЯ КІЛОМЕТРАЖУ (ЗМІНЮЙТЕ ЗА ПОТРЕБИ)
    // 100 означає, що 1 км = 100 одиниць навантаження.
    const DISTANCE_COEFFICIENT = 100; 

    // Обмеження дати (не можна вводити майбутню дату)
    dateInput.max = new Date().toISOString().split('T')[0];

    // =========================================================================
    // 2. ФУНКЦІЇ ЗБЕРЕЖЕННЯ ТА ОТРИМАННЯ ДАНИХ
    // =========================================================================

    function getLoadHistory() {
        const history = localStorage.getItem('proathletecare_load_history');
        // Сортуємо від старої до нової дати
        return history ? JSON.parse(history).sort((a, b) => new Date(a.date) - new Date(b.date)) : [];
    }

    function saveLoadEntry(date, load) {
        let history = getLoadHistory();
        const existingIndex = history.findIndex(entry => entry.date === date);

        if (existingIndex > -1) {
            history[existingIndex].load = load; // Оновлюємо
        } else {
            history.push({ date, load }); // Додаємо
        }
        localStorage.setItem('proathletecare_load_history', JSON.stringify(history));
    }


    // =========================================================================
    // 3. ФУНКЦІЇ ОБЧИСЛЕННЯ ACWR
    // =========================================================================
    
    function getRollingAverage(history, days) {
        if (history.length === 0) return 0;

        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - (days - 1));
        
        const relevantEntries = history.filter(entry => new Date(entry.date) >= startDate);
        
        // Ділимо на кількість днів у проміжку (days), а не на кількість записів
        const totalLoad = relevantEntries.reduce((sum, entry) => sum + entry.load, 0);

        return days > 0 ? (totalLoad / days) : 0;
    }

    function calculateACWR(history) {
        // Потрібно мінімум 7 днів даних для розрахунку
        if (history.length < 7) {
            return null; 
        }

        const acuteLoad = getRollingAverage(history, 7);
        const chronicLoad = getRollingAverage(history, 28);

        if (chronicLoad === 0 || acuteLoad === 0) return null;

        const acwr = acuteLoad / chronicLoad;
        return parseFloat(acwr.toFixed(2));
    }


    // =========================================================================
    // 4. ОНОВЛЕННЯ СПІДОМЕТРА ТА СТАТУСУ
    // =========================================================================

    function updateSpeedometer(acwr) {
        if (acwr === null) {
            acwrValueEl.textContent = 'N/A';
            acwrStatusEl.textContent = 'Статус: Потрібно більше даних (7+ днів)';
            acwrNeedle.style.transform = 'translateX(-50%) rotate(-135deg)';
            acwrStatusEl.className = 'gauge-status-box';
            return;
        }

        // Логіка обертання: ACWR 0.5 -> -135deg, ACWR 2.0 -> 135deg
        let normalizedAcwr = Math.min(Math.max(acwr, 0.5), 2.0); 
        const rotation = (normalizedAcwr - 0.5) * 180 - 135;

        acwrValueEl.textContent = acwr.toFixed(2);
        acwrNeedle.style.transform = `translateX(-50%) rotate(${rotation}deg)`;

        let statusText = 'Статус: ';
        let statusClass = 'status-safe'; 

        // Логіка кольорових зон ACWR
        if (acwr < 0.8) {
            statusText += 'Небезпечно низьке (Ризик травми)';
            statusClass = 'status-danger';
        } else if (acwr >= 0.8 && acwr < 1.0) {
            statusText += 'Наростаюче (Збільшуйте навантаження)';
            statusClass = 'status-warning';
        } else if (acwr >= 1.0 && acwr <= 1.3) {
            statusText += 'Оптимальне (Готовність до змагань)';
            statusClass = 'status-safe'; 
        } else if (acwr > 1.3 && acwr <= 1.5) {
            statusText += 'Перехідне (Можливий ризик травми)';
            statusClass = 'status-warning';
        } else { // acwr > 1.5
            statusText += 'Небезпечно високе (Високий ризик травми)';
            statusClass = 'status-danger';
        }
        
        acwrStatusEl.textContent = statusText;
        acwrStatusEl.className = `gauge-status-box ${statusClass}`;
    }


    // =========================================================================
    // 5. ГОЛОВНИЙ ОБРОБНИК ПОДІЙ (SUBMIT)
    // =========================================================================

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const date = dateInput.value;
        const duration = parseInt(durationInput.value);
        const distance = parseFloat(distanceInput.value); // ЧИТАЄМО КІЛОМЕТРАЖ
        const rpeRadio = document.querySelector('input[name="rpe"]:checked');

        if (!date || !duration || !rpeRadio) {
            alert('Будь ласка, заповніть усі поля: Дата, Тривалість та RPE.');
            return;
        }

        const rpe = parseInt(rpeRadio.value);
        
        // НОВА ФОРМУЛА: Щоденне навантаження
        const dailyLoad = (duration * rpe) + (distance * DISTANCE_COEFFICIENT); 
        
        // 1. Зберігаємо новий запис
        saveLoadEntry(date, dailyLoad);
        
        // 2. Оновлюємо та обчислюємо ACWR
        const history = getLoadHistory();
        const acwr = calculateACWR(history);
        
        // 3. Оновлюємо візуалізацію
        updateSpeedometer(acwr);

        alert(`Дані збережено! Щоденне навантаження: ${dailyLoad.toFixed(0)}.`);
    });

    // =========================================================================
    // 6. ІНІЦІАЛІЗАЦІЯ (ОНОВЛЕННЯ СПІДОМЕТРА ПРИ ЗАВАНТАЖЕННІ)
    // =========================================================================
    
    (function init() {
        const history = getLoadHistory();
        const acwr = calculateACWR(history);
        updateSpeedometer(acwr);
    })();
});
