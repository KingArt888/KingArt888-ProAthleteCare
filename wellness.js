(function() {
    const COLLECTION_NAME = 'wellness_reports';
    
    // Кольори з вашого оригінального дизайну
    const GOLD_COLOR = 'rgb(255, 215, 0)';
    const GOLD_AREA = 'rgba(255, 215, 0, 0.4)';
    const GREY_GRID = '#CCCCCC';

    const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
    const FIELD_LABELS = {
        sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', 
        water: 'Гідратація', stress: 'Стрес', ready: 'Готовність'
    };

    const colorsMap = {
        sleep: { color: GOLD_COLOR, area: GOLD_AREA },
        soreness: { color: 'rgb(255, 99, 132)', area: 'rgba(255, 99, 132, 0.4)' },
        mood: { color: 'rgb(147, 112, 219)', area: 'rgba(147, 112, 219, 0.4)' },
        water: { color: 'rgb(0, 191, 255)', area: 'rgba(0, 191, 255, 0.4)' },
        stress: { color: 'rgb(255, 159, 64)', area: 'rgba(255, 159, 64, 0.4)' },
        ready: { color: 'rgb(50, 205, 50)', area: 'rgba(50, 205, 50, 0.4)' },
    };

    // --- 1. СИНХРОНІЗАЦІЯ ---
    async function syncWellnessFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("timestamp", "asc")
                .get();

            const history = {};
            let lastDate = "";

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.date && data.scores) {
                    history[data.date] = data.scores;
                    if (data.date > lastDate) lastDate = data.date;
                }
            });

            localStorage.setItem('wellnessHistory', JSON.stringify(history));
            if (lastDate) localStorage.setItem('lastWellnessSubmissionDate', lastDate);

            initCharts(); 
            checkDailyRestriction();
        } catch (e) {
            console.error("Помилка підтягування даних:", e);
        }
    }

    // --- 2. ДОПОМІЖНІ ФУНКЦІЇ ---
    function getTodayDateString() {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    function checkDailyRestriction() {
        const lastDate = localStorage.getItem('lastWellnessSubmissionDate');
        const today = getTodayDateString();
        const button = document.querySelector('.gold-button');
        const form = document.getElementById('wellness-form');

        if (lastDate === today && button) {
            button.disabled = true;
            button.textContent = "Дані на сьогодні вже записані.";
            button.classList.add('disabled-button'); 
            form.querySelectorAll('input').forEach(i => i.disabled = true);
            return true;
        }
        return false;
    }

    // --- 3. МАЛЮВАННЯ ГРАФІКІВ (ВАШ ОРИГІНАЛЬНИЙ ДИЗАЙН) ---
    function initCharts() {
        const history = JSON.parse(localStorage.getItem('wellnessHistory') || '{}');
        const sortedDates = Object.keys(history).sort(); 
        if (sortedDates.length === 0) return;

        const chartLabels = sortedDates.map(date => date.split('-').slice(1).join('/'));
        const latestData = history[sortedDates[sortedDates.length - 1]];

        // Оновлення маленьких графіків
        WELLNESS_FIELDS.forEach(field => {
            const ctx = document.getElementById(`chart-${field}`);
            const statEl = document.getElementById(`stat-${field}`);
            
            if (statEl) {
                const score = latestData[field] || 0;
                statEl.textContent = `Оцінка: ${score} / 10`;
                statEl.style.color = score >= 7 ? 'rgb(50, 205, 50)' : (score >= 4 ? 'rgb(255, 159, 64)' : 'rgb(255, 99, 132)');
            }

            if (ctx) {
                if (window[`chart_${field}`]) window[`chart_${field}`].destroy();
                window[`chart_${field}`] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            data: sortedDates.map(d => history[d][field]),
                            borderColor: colorsMap[field].color,
                            backgroundColor: colorsMap[field].area,
                            fill: true,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { min: 1, max: 10, ticks: { color: 'white', stepSize: 2 } },
                            x: { display: false }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }
        });

        // ПАВУТИННЯ
        const mainCtx = document.getElementById('wellnessChart');
        if (mainCtx) {
            if (window.wellnessChart) window.wellnessChart.destroy();
            window.wellnessChart = new Chart(mainCtx, {
                type: 'radar',
                data: {
                    labels: Object.values(FIELD_LABELS),
                    datasets: [{
                        label: 'Мій стан',
                        data: WELLNESS_FIELDS.map(f => latestData[f]),
                        backgroundColor: GOLD_AREA,
                        borderColor: GOLD_COLOR,
                        pointBackgroundColor: GOLD_COLOR
                    }]
                },
                options: {
                    scales: {
                        r: {
                            min: 0, max: 10,
                            grid: { color: GREY_GRID },
                            angleLines: { color: GREY_GRID },
                            pointLabels: { color: 'white' },
                            ticks: { display: false }
                        }
                    },
                    plugins: { legend: { labels: { color: 'white' } } }
                }
            });
        }
    }

    // --- 4. ЗАПУСК ---
    document.addEventListener('DOMContentLoaded', () => {
        checkDailyRestriction();

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await syncWellnessFromFirebase(user.uid);
            } else {
                await firebase.auth().signInAnonymously();
            }
        });

        const form = document.getElementById('wellness-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user || checkDailyRestriction()) return;

                const scores = {};
                WELLNESS_FIELDS.forEach(f => {
                    const val = form.querySelector(`input[name="${f}"]:checked`);
                    if (val) scores[f] = parseInt(val.value, 10);
                });

                if (Object.keys(scores).length < 6) return alert("Заповніть усі поля!");

                try {
                    const today = getTodayDateString();
                    await db.collection(COLLECTION_NAME).add({
                        userId: user.uid,
                        date: today,
                        scores: scores,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    localStorage.setItem('lastWellnessSubmissionDate', today);
                    alert("Збережено!");
                    location.reload();
                } catch (err) { alert(err.message); }
            });
        }
    });
})();
