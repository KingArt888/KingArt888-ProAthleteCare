(function() {
    // Використовуємо глобальну db з вашого HTML
    const COLLECTION_NAME = 'wellness_reports';

    // 1. ФУНКЦІЯ ПІДТЯГУВАННЯ ДАНИХ З FIREBASE
    async function syncWithFirebase(uid) {
        try {
            console.log("Завантаження даних з Firebase для:", uid);
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("timestamp", "asc")
                .get();

            const history = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.date && data.scores) {
                    history[data.date] = data.scores;
                }
            });

            // Оновлюємо локальну пам'ять, щоб ваші графіки їх побачили
            localStorage.setItem('wellnessHistory', JSON.stringify(history));
            
            // Запускаємо малювання графіків
            initCharts();
        } catch (e) {
            console.error("Помилка завантаження з Firebase:", e);
        }
    }

    // 2. ВАШІ ОРИГІНАЛЬНІ ФУНКЦІЇ (ЗБЕРЕЖЕНО ЛОГІКУ)
    function getTodayDateString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    function loadWellnessHistory() {
        const data = localStorage.getItem('wellnessHistory');
        return data ? JSON.parse(data) : {};
    }

    function saveWellnessHistory(date, scores) {
        const history = loadWellnessHistory();
        history[date] = scores;
        localStorage.setItem('wellnessHistory', JSON.stringify(history));
    }

    const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
    const FIELD_LABELS = { sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', water: 'Гідратація', stress: 'Стрес', ready: 'Готовність' };

    // 3. МАЛЮВАННЯ ГРАФІКІВ (ОБ'ЄДНАНО З ВАШИМ СТИЛЕМ)
    function initCharts() {
        const history = loadWellnessHistory();
        const sortedDates = Object.keys(history).sort(); 
        if (sortedDates.length === 0) return;

        const latestData = history[sortedDates[sortedDates.length - 1]];
        
        // Оновлення тексту оцінок
        WELLNESS_FIELDS.forEach(field => {
            const el = document.getElementById(`stat-${field}`);
            if (el) el.textContent = `Оцінка: ${latestData[field] || 0} / 10`;
        });

        const mainCtx = document.getElementById('wellnessChart');
        if (mainCtx && typeof Chart !== 'undefined') {
            if (window.wellnessChart instanceof Chart) window.wellnessChart.destroy();
            window.wellnessChart = new Chart(mainCtx, {
                type: 'radar',
                data: {
                    labels: Object.values(FIELD_LABELS),
                    datasets: [{
                        label: 'Мій стан',
                        data: WELLNESS_FIELDS.map(f => latestData[f]),
                        backgroundColor: 'rgba(255, 215, 0, 0.4)',
                        borderColor: 'rgb(255, 215, 0)'
                    }]
                },
                options: { scales: { r: { min: 0, max: 10, ticks: { display: false } } } }
            });
        }
    }

    // 4. ЛОГІКА КНОПКИ ТА FIREBASE AUTH
    document.addEventListener('DOMContentLoaded', () => {
        // Перевіряємо вхід користувача
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                syncWithFirebase(user.uid);
            }
        });

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user) return alert("Помилка: Ви не увійшли в систему!");

                const scores = {};
                let valid = true;
                WELLNESS_FIELDS.forEach(f => {
                    const val = form.querySelector(`input[name="${f}"]:checked`);
                    if (val) scores[f] = parseInt(val.value); else valid = false;
                });

                if (!valid) return alert("Заповніть всі пункти!");

                try {
                    const today = getTodayDateString();
                    
                    // ЗБЕРЕЖЕННЯ В FIREBASE
                    await db.collection(COLLECTION_NAME).add({
                        userId: user.uid,
                        date: today,
                        scores: scores,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // ЗБЕРЕЖЕННЯ ЛОКАЛЬНО ТА ОНОВЛЕННЯ
                    saveWellnessHistory(today, scores);
                    localStorage.setItem('lastWellnessSubmissionDate', today);
                    
                    alert("Дані збережено в хмару!");
                    location.reload(); // Перезавантаження для оновлення графіків
                } catch (err) {
                    console.error(err);
                    alert("Помилка збереження: " + err.message);
                }
            });
        }
    });
})();
