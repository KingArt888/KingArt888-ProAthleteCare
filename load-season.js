(function() {
    const COLLECTION_NAME = 'load_season_reports';
    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;
    let currentUserId = null;

    // Визначаємо, чи ми дивимось свій профіль чи чужий (адмін-режим)
    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    document.addEventListener('DOMContentLoaded', () => {
        // Авто-дата
        const dateInput = document.getElementById('load-date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUserId = viewUserId || user.uid;
                
                // Якщо ми в режимі перегляду іншого юзера, приховуємо кнопку збереження
                if (viewUserId) {
                    const submitBtn = document.querySelector('.submit-button');
                    if (submitBtn) submitBtn.style.display = 'none';
                }

                await syncLoadFromFirebase(currentUserId);
            } else {
                await firebase.auth().signInAnonymously();
            }
        });

        const form = document.getElementById('load-form');
        if (form) form.addEventListener('submit', handleFormSubmit);
    });

    // --- СИНХРОНІЗАЦІЯ З FIREBASE ---
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();
            
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            // Якщо даних немає — показуємо початкову точку
            if (dailyLoadData.length === 0) {
                dailyLoadData = [{ date: new Date().toISOString().split('T')[0], duration: 0, rpe: 0, distance: 0 }];
            }

            const { acute, chronic, acwr } = calculateMetrics();
            updateACWRGauge(acwr);
            renderCharts(acute, chronic);
        } catch (e) {
            console.error("Помилка завантаження даних:", e);
        }
    }

    // --- РОЗРАХУНОК ACWR ---
    function calculateMetrics() {
        const sorted = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const lastDate = new Date(sorted[sorted.length - 1].date);

        const getAvgLoad = (days) => {
            const start = new Date(lastDate);
            start.setDate(lastDate.getDate() - days);
            
            // Фільтруємо записи за останні 'days' днів
            const periodData = sorted.filter(d => new Date(d.date) > start);
            const totalLoad = periodData.reduce((sum, d) => sum + (d.duration * (d.rpe || 0)), 0);
            
            // Повертаємо середнє тижневе навантаження за цей період
            return totalLoad / (days / 7);
        };

        const acute = getAvgLoad(7);     // Гостре навантаження (1 тиждень)
        const chronic = getAvgLoad(28);  // Хронічне (4 тижні)
        const acwr = chronic > 0 ? (acute / chronic) : 1.0;

        return { acute, chronic, acwr };
    }

    // --- ВІЗУАЛІЗАЦІЯ (Спідометр) ---
    function updateACWRGauge(acwrValue) {
        const needle = document.getElementById('gauge-needle');
        const display = document.getElementById('acwr-value');
        const statusText = document.getElementById('acwr-status');

        if (!needle || !display) return;

        // Кут від -180 (0.0) до 0 (2.0+)
        let degree = -180 + (Math.min(acwrValue, 2) / 2) * 180;
        needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
        display.textContent = acwrValue.toFixed(2);
        
        // Змінюємо кольори статусу
        if (acwrValue > 1.5) {
            statusText.textContent = "РИЗИК ТРАВМИ";
            statusText.className = "status-danger";
        } else if (acwrValue >= 0.8) {
            statusText.textContent = "ОПТИМАЛЬНА ЗОНА";
            statusText.className = "status-safe";
        } else {
            statusText.textContent = "НЕДОТРЕНОВАНІСТЬ";
            statusText.className = "status-warning";
        }
    }

    // --- ГРАФІКИ ---
    function renderCharts(acute, chronic) {
        const ctxL = document.getElementById('loadChart');
        if (ctxL) {
            if (loadChart) loadChart.destroy();
            loadChart = new Chart(ctxL, {
                type: 'bar',
                data: {
                    labels: ['Chronic (База)', 'Acute (Поточне)'],
                    datasets: [{
                        data: [chronic, acute],
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
                        y: { ticks: { color: '#888' }, grid: { color: '#222' } }
                    }
                }
            });
        }
        
        // Графік дистанції
        const ctxD = document.getElementById('distanceChart');
        if (ctxD) {
            if (distanceChart) distanceChart.destroy();
            const last7 = dailyLoadData.slice(-7);
            distanceChart = new Chart(ctxD, {
                type: 'line',
                data: {
                    labels: last7.map(d => d.date.split('-').slice(1).join('.')),
                    datasets: [{
                        label: 'км',
                        data: last7.map(d => d.distance),
                        borderColor: '#FFC72C',
                        backgroundColor: 'rgba(255, 199, 44, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // --- ЗБЕРЕЖЕННЯ ---
    async function handleFormSubmit(e) {
        e.preventDefault();
        if (viewUserId) return; // Заборона запису в режимі перегляду іншого атлета

        const user = firebase.auth().currentUser;
        const form = e.target;
        
        const rpeInput = form.querySelector('input[name="rpe"]:checked');
        if (!rpeInput) return alert("Будь ласка, оберіть рівень RPE");

        const data = {
            userId: user.uid,
            date: form.elements['date'].value,
            duration: parseInt(form.elements['duration'].value),
            distance: parseFloat(form.elements['distance'].value),
            rpe: parseInt(rpeInput.value),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            // Використовуємо комбінований ID (User+Date), щоб уникнути дублікатів на один день
            await db.collection(COLLECTION_NAME).doc(`${user.uid}_${data.date}`).set(data);
            alert("Дані збережено успішно!");
            await syncLoadFromFirebase(user.uid);
        } catch (err) {
            alert("Помилка: " + err.message);
        }
    }
})();
