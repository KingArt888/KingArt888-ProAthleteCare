(function() {
    const COLLECTION_NAME = 'wellness_reports';
    
    // --- ВАШ ОРИГІНАЛЬНИЙ ДИЗАЙН ---
    const GOLD_COLOR = 'rgb(255, 215, 0)';
    const GOLD_AREA = 'rgba(255, 215, 0, 0.4)';
    const GREY_GRID = 'rgba(255, 255, 255, 0.1)';

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

    // --- 1. СИНХРОНІЗАЦІЯ З FIREBASE ---
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
            console.error("Помилка завантаження даних:", e);
            initCharts(); // Малюємо те, що є
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

        if (lastDate === today && button) {
            button.disabled = true;
            button.textContent = "Сьогодні вже заповнено";
            button.classList.add('disabled-button');
            return true;
        }
        return false;
    }

    // --- 3. МАЛЮВАННЯ ГРАФІКІВ (ВАШ ДИЗАЙН + ВИПРАВЛЕННЯ ПОМИЛОК) ---
    function initCharts() {
        const history = JSON.parse(localStorage.getItem('wellnessHistory') || '{}');
        const sortedDates = Object.keys(history).sort(); 
        
        const chartLabels = sortedDates.length > 0 
            ? sortedDates.map(date => date.split('-').slice(1).join('/')) 
            : [getTodayDateString().split('-').slice(1).join('/')];

        const latestData = sortedDates.length > 0 
            ? history[sortedDates[sortedDates.length - 1]] 
            : { sleep:0, soreness:0, mood:0, water:0, stress:0, ready:0 };

        // МАЛЕНЬКІ ГРАФІКИ ДИНАМІКИ
        WELLNESS_FIELDS.forEach(field => {
            const ctx = document.getElementById(`chart-${field}`);
            const statEl = document.getElementById(`stat-${field}`);
            
            // Оновлюємо текст оцінки
            if (statEl) {
                const score = latestData[field] || 0;
                statEl.textContent = `Оцінка: ${score} / 10`;
                statEl.style.color = score >= 7 ? 'rgb(50, 205, 50)' : (score >= 4 ? 'rgb(255, 159, 64)' : 'rgb(255, 99, 132)');
            }

            if (ctx) {
                // ВИПРАВЛЕННЯ Type Error: перевірка чи є метод destroy
                if (window[`chart_${field}`] && typeof window[`chart_${field}`].destroy === 'function') {
                    window[`chart_${field}`].destroy();
                }
                
                window[`chart_${field}`] = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            data: sortedDates.length > 0 ? sortedDates.map(d => history[d][field]) : [0],
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
                            y: { 
                                min: 1, max: 10, 
                                ticks: { color: 'rgba(255,255,255,0.5)', stepSize: 2, display: true } // Повертаємо шкалу
                            },
                            x: { display: false }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }
        });

        // ЦЕНТРАЛЬНИЙ РАДАР (ПАВУТИННЯ)
        const mainCtx = document.getElementById('wellnessChart');
        if (mainCtx) {
            if (window.wellnessChart && typeof window.wellnessChart.destroy === 'function') {
                window.wellnessChart.destroy();
            }
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
        initCharts(); // Початкове малювання

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
                if (checkDailyRestriction()) return;

                const user = firebase.auth().currentUser;
                if (!user) return alert("Зачекайте авторизації...");

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
                    location.reload(); 
                } catch (err) { alert(err.message); }
            });
        }
    });
})();
