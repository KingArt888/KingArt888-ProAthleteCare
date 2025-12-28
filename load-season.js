(function() {
    const COLLECTION_NAME = 'load_season_reports';
    const db = window.db; // ВИПРАВЛЕНО: додано доступ до бази
    
    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;
    let currentUserId = null;

    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    document.addEventListener('DOMContentLoaded', () => {
        const dateInput = document.getElementById('load-date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        window.auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUserId = viewUserId || user.uid;
                
                if (viewUserId) {
                    const submitBtn = document.querySelector('.submit-button');
                    if (submitBtn) submitBtn.style.display = 'none';
                }

                await syncLoadFromFirebase(currentUserId);
            } else {
                await window.auth.signInAnonymously();
            }
        });

        const form = document.getElementById('load-form');
        if (form) form.addEventListener('submit', handleFormSubmit);
    });

    async function syncLoadFromFirebase(uid) {
        if (!db) return console.error("База даних не ініціалізована");
        try {
            // Запит без orderBy (щоб не створювати складні індекси, сортуємо в JS)
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .get();
            
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            // Сортуємо по даті в JS
            dailyLoadData.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (dailyLoadData.length === 0) {
                // Початкові дані для візуалізації
                renderCharts(0, 0);
                updateACWRGauge(0);
                return;
            }

            const metrics = calculateMetrics();
            updateACWRGauge(metrics.acwr);
            renderCharts(metrics.acute, metrics.chronic);
        } catch (e) {
            console.error("Помилка завантаження даних:", e);
        }
    }

    function calculateMetrics() {
        if (dailyLoadData.length === 0) return { acute: 0, chronic: 0, acwr: 0 };

        const sorted = [...dailyLoadData];
        const lastDate = new Date(sorted[sorted.length - 1].date);

        const getAvgWeeklyLoad = (days) => {
            const startDate = new Date(lastDate);
            startDate.setDate(lastDate.getDate() - days);
            
            const periodData = sorted.filter(d => new Date(d.date) > startDate);
            const totalLoad = periodData.reduce((sum, d) => sum + (Number(d.duration) * Number(d.rpe || 0)), 0);
            
            // Повертаємо середнє навантаження на тиждень (7 днів)
            const weeksInPeriod = days / 7;
            return totalLoad / weeksInPeriod;
        };

        const acute = getAvgWeeklyLoad(7);     // Навантаження за останній тиждень
        const chronic = getAvgWeeklyLoad(28);  // Середнє тижневе за місяць
        
        // ACWR: ідеально 0.8 - 1.3
        const acwr = (chronic > 0) ? (acute / chronic) : 1.0;

        return { acute, chronic, acwr };
    }

    function updateACWRGauge(acwrValue) {
        const needle = document.getElementById('gauge-needle');
        const display = document.getElementById('acwr-value');
        const statusText = document.getElementById('acwr-status');

        if (!needle || !display) return;

        // Обмежуємо значення для шкали від 0 до 2.0
        let displayVal = Math.min(acwrValue, 2);
        // Кут: -180 градусів це 0, 0 градусів це 2.0
        let degree = -180 + (displayVal / 2) * 180;
        
        needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
        display.textContent = acwrValue.toFixed(2);
        
        if (acwrValue > 1.5) {
            statusText.textContent = "РИЗИК ТРАВМИ (ПЕРЕВАНТАЖЕННЯ)";
            statusText.style.color = "#DA3E52";
        } else if (acwrValue >= 0.8) {
            statusText.textContent = "ОПТИМАЛЬНА ЗОНА";
            statusText.style.color = "#FFC72C";
        } else {
            statusText.textContent = "НЕДОТРЕНОВАНІСТЬ";
            statusText.style.color = "#888";
        }
    }

    function renderCharts(acute, chronic) {
        const ctxL = document.getElementById('loadChart');
        if (ctxL && typeof Chart !== 'undefined') {
            if (loadChart) loadChart.destroy();
            loadChart = new Chart(ctxL, {
                type: 'bar',
                data: {
                    labels: ['Хронічне (База)', 'Гостре (Тиждень)'],
                    datasets: [{
                        data: [chronic.toFixed(0), acute.toFixed(0)],
                        backgroundColor: ['rgba(255, 255, 255, 0.2)', '#FFC72C'],
                        borderColor: ['#fff', '#FFC72C'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: '#888' }, grid: { color: '#222' } },
                        x: { ticks: { color: '#fff' } }
                    }
                }
            });
        }
        
        const ctxD = document.getElementById('distanceChart');
        if (ctxD && typeof Chart !== 'undefined') {
            if (distanceChart) distanceChart.destroy();
            const last7 = dailyLoadData.slice(-7);
            distanceChart = new Chart(ctxD, {
                type: 'line',
                data: {
                    labels: last7.map(d => d.date.split('-').slice(1).join('.')),
                    datasets: [{
                        label: 'Дистанція (км)',
                        data: last7.map(d => d.distance),
                        borderColor: '#FFC72C',
                        backgroundColor: 'rgba(255, 199, 44, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    scales: {
                        y: { ticks: { color: '#888' }, grid: { color: '#222' } },
                        x: { ticks: { color: '#888' } }
                    }
                }
            });
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        if (viewUserId) return;

        const user = window.auth.currentUser;
        if (!user) return alert("Помилка авторизації");

        const form = e.target;
        const rpeInput = form.querySelector('input[name="rpe"]:checked');
        if (!rpeInput) return alert("Будь ласка, оберіть рівень RPE");

        const data = {
            userId: user.uid,
            date: form.elements['date'].value,
            duration: parseInt(form.elements['duration'].value) || 0,
            distance: parseFloat(form.elements['distance'].value) || 0,
            rpe: parseInt(rpeInput.value),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            // Використання set() з ID "user_date" гарантує 1 запис на день
            await db.collection(COLLECTION_NAME).doc(`${user.uid}_${data.date}`).set(data);
            alert("Дані збережено успішно!");
            await syncLoadFromFirebase(user.uid);
            form.reset();
            // Встановлюємо дату знову після reset
            document.getElementById('load-date').value = new Date().toISOString().split('T')[0];
        } catch (err) {
            alert("Помилка: " + err.message);
        }
    }
})();
