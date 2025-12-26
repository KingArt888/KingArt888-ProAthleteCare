(function() {
    const COLLECTION_NAME = 'wellness_reports';

    // 1. ПІДТЯГУВАННЯ ДАНИХ З FIREBASE
    async function syncWellnessFromFirebase(uid) {
        try {
            console.log("Завантаження даних для користувача:", uid);
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("timestamp", "asc")
                .get();

            const history = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.date && data.scores) history[data.date] = data.scores;
            });

            localStorage.setItem('wellnessHistory', JSON.stringify(history));
            initCharts(); 
        } catch (e) {
            console.error("Помилка підтягування даних:", e);
        }
    }

    // 2. ДОПОМІЖНІ ФУНКЦІЇ
    function getTodayDateString() {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    function loadWellnessHistory() {
        const data = localStorage.getItem('wellnessHistory');
        return data ? JSON.parse(data) : {};
    }

    const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
    const FIELD_LABELS = { sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', water: 'Гідратація', stress: 'Стрес', ready: 'Готовність' };

    // 3. МАЛЮВАННЯ ГРАФІКІВ
    function initCharts() {
        const history = loadWellnessHistory();
        const sortedDates = Object.keys(history).sort(); 
        if (sortedDates.length === 0) return;

        const latestData = history[sortedDates[sortedDates.length - 1]];
        
        WELLNESS_FIELDS.forEach(field => {
            const el = document.getElementById(`stat-${field}`);
            if (el) {
                const score = latestData[field] || 0;
                el.textContent = `Оцінка: ${score} / 10`;
                el.style.color = score >= 7 ? 'rgb(50, 205, 50)' : (score >= 4 ? 'rgb(255, 159, 64)' : 'rgb(255, 99, 132)');
            }
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

    // 4. ГОЛОВНА ЛОГІКА ТА АВТОМАТИЧНИЙ ВХІД
    document.addEventListener('DOMContentLoaded', () => {
        // Додаємо автоматичний анонімний вхід, щоб прибрати помилки авторизації
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log("Успішний вхід:", user.uid);
                await syncWellnessFromFirebase(user.uid);
            } else {
                console.log("Спроба анонімного входу...");
                try {
                    await firebase.auth().signInAnonymously();
                } catch (error) {
                    console.error("Помилка входу:", error.message);
                }
            }
        });

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                
                if (!user) return alert("Помилка авторизації. Перевірте консоль.");

                const scores = {};
                let valid = true;
                WELLNESS_FIELDS.forEach(f => {
                    const input = form.querySelector(`input[name="${f}"]:checked`);
                    if (input) scores[f] = parseInt(input.value, 10); else valid = false;
                });

                if (!valid) return alert("Будь ласка, заповніть усі 6 точок даних!");

                try {
                    const today = getTodayDateString();
                    await db.collection(COLLECTION_NAME).add({
                        userId: user.uid,
                        date: today,
                        scores: scores,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    const history = loadWellnessHistory();
                    history[today] = scores;
                    localStorage.setItem('wellnessHistory', JSON.stringify(history));
                    
                    alert("Дані успішно збережено в хмару!");
                    location.reload(); 
                } catch (err) {
                    alert("Помилка збереження: " + err.message);
                }
            });
        }
    });
})();
