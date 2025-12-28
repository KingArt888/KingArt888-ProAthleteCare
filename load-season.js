(function() {
    const COLLECTION_NAME = 'load_season_reports';
    const db = window.db; 
    
    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;
    let currentUserId = null;

    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    // Кольори ProAtletCare
    const GOLD = '#FFC72C';
    const WHITE_SUBTLE = 'rgba(255, 255, 255, 0.4)';
    const GRID_COLOR = 'rgba(255, 255, 255, 0.05)';

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
        if (!db) return;
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .get();
            
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            // Сортуємо дані по даті
            dailyLoadData.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (dailyLoadData.length === 0) {
                renderCharts(0, 0);
                updateACWRGauge(0);
                return;
            }

            const metrics = calculateMetrics();
            updateACWRGauge(metrics.acwr);
            renderCharts(metrics.acute, metrics.chronic);
        } catch (e) {
            console.error("Помилка завантаження:", e);
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
            return totalLoad / (days / 7);
        };

        const acute = getAvgWeeklyLoad(7);
        const chronic = getAvgWeeklyLoad(28);
        const acwr = (chronic > 0) ? (acute / chronic) : 1.0;

        return { acute, chronic, acwr };
    }

    function updateACWRGauge(acwrValue) {
        const needle = document.getElementById('gauge-needle');
        const display = document.getElementById('acwr-value');
        const statusText = document.getElementById('acwr-status');

        if (!needle || !display) return;

        let displayVal = Math.min(acwrValue, 2);
        let degree = -180 + (displayVal / 2) * 180;
        
        needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
        display.textContent = acwrValue.toFixed(2);
        
        if (acwrValue > 1.5) {
            statusText.textContent = "РИЗИК ТРАВМИ";
            statusText.style.color = "#DA3E52";
        } else if (acwrValue >= 0.8) {
            statusText.textContent = "ОПТИМАЛЬНА ЗОНА";
            statusText.style.color = GOLD;
        } else {
            statusText.textContent = "НЕДОТРЕНОВАНІСТЬ";
            statusText.style.color = "#888";
        }
    }

    function renderCharts(finalAcute, finalChronic) {
        const ctxL = document.getElementById('loadChart');
        if (ctxL && typeof Chart !== 'undefined') {
            if (loadChart) loadChart.destroy();
            
            // Беремо останні 14 записів для демонстрації перетину ліній
            const lastData = dailyLoadData.slice(-14);
            const labels = lastData.map(d => d.date.split('-').slice(1).join('.'));

            loadChart = new Chart(ctxL, {
                type: 'line',
                data: {
                    labels: labels.length ? labels : ['Початок'],
                    datasets: [
                        {
                            label: 'Acute (Гостре)',
                            data: lastData.map(d => (d.duration * (d.rpe || 0))),
                            borderColor: GOLD,
                            borderWidth: 3,
                            tension: 0.15, // Ломана лінія
                            pointRadius: 4,
                            pointBackgroundColor: GOLD,
                            zIndex: 10
                        },
                        {
                            label: 'Chronic (Хронічне)',
                            // Малюємо лінію середнього хронічного для порівняння
                            data: lastData.map(() => finalChronic.toFixed(0)),
                            borderColor: WHITE_SUBTLE,
                            borderDash: [5, 5], 
                            borderWidth: 2,
                            fill: false,
                            pointRadius: 0,
                            zIndex: 5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            display: true, 
                            position: 'top',
                            labels: { color: '#ccc', boxWidth: 12, font: { size: 11 } } 
                        },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        y: { 
                            grid: { color: GRID_COLOR }, 
                            ticks: { color: '#666', font: { size: 10 } } 
                        },
                        x: { 
                            grid: { display: false }, 
                            ticks: { color: '#888', font: { size: 10 } } 
                        }
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
                        label: 'км',
                        data: last7.map(d => d.distance),
                        borderColor: GOLD,
                        backgroundColor: 'rgba(255, 199, 44, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: GOLD
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { grid: { color: GRID_COLOR }, ticks: { color: '#666' } },
                        x: { grid: { display: false }, ticks: { color: '#888' } }
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
        if (!rpeInput) return alert("Оберіть RPE");

        const data = {
            userId: user.uid,
            date: form.elements['date'].value,
            duration: parseInt(form.elements['duration'].value) || 0,
            distance: parseFloat(form.elements['distance'].value) || 0,
            rpe: parseInt(rpeInput.value),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection(COLLECTION_NAME).doc(`${user.uid}_${data.date}`).set(data);
            alert("Дані успішно додано!");
            await syncLoadFromFirebase(user.uid);
            form.reset();
            document.getElementById('load-date').value = new Date().toISOString().split('T')[0];
        } catch (err) {
            alert("Помилка збереження");
        }
    }
})();
