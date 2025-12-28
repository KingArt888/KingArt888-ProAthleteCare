(function() {
    const COLLECTION_NAME = 'load_season_reports';
    const db = window.db; 
    
    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;
    let currentUserId = null;

    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    // Константи кольорів ProAtletCare
    const GOLD = '#FFC72C';
    const ACUTE_RED = '#FF4136';   
    const CHRONIC_ORANGE = '#FF851B'; 
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

    function getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    function renderCharts(finalAcute, finalChronic) {
        // Налаштування для усунення проблем зі скролом
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: true, // Забезпечує стабільну висоту контейнера
            aspectRatio: 2, // Ширина вдвічі більша за висоту (ідеально для мобільних)
            plugins: {
                legend: { 
                    display: true, 
                    position: 'top', 
                    labels: { color: '#ccc', font: { size: 11 }, padding: 10 } 
                }
            }
        };

        // --- 1. ГРАФІК НАВАНТАЖЕННЯ (Acute vs Chronic) ---
        const ctxL = document.getElementById('loadChart');
        if (ctxL && typeof Chart !== 'undefined') {
            if (loadChart) loadChart.destroy();
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
                            borderColor: ACUTE_RED,
                            borderWidth: 3,
                            tension: 0.15,
                            pointRadius: 4,
                            pointBackgroundColor: ACUTE_RED,
                            zIndex: 10
                        },
                        {
                            label: 'Chronic (Хронічне)',
                            data: lastData.map(() => finalChronic.toFixed(0)),
                            borderColor: CHRONIC_ORANGE,
                            borderDash: [5, 5], 
                            borderWidth: 2,
                            fill: false,
                            pointRadius: 0,
                            zIndex: 5
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        y: { grid: { color: GRID_COLOR }, ticks: { color: '#666', font: { size: 10 } } },
                        x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } }
                    }
                }
            });
        }
        
        // --- 2. ГРАФІК ДИСТАНЦІЇ (Групування по тижнях) ---
        const ctxD = document.getElementById('distanceChart');
        if (ctxD && typeof Chart !== 'undefined') {
            if (distanceChart) distanceChart.destroy();

            const weeklyGroups = {};
            dailyLoadData.forEach(d => {
                const dateObj = new Date(d.date);
                const year = dateObj.getFullYear();
                const week = getWeekNumber(dateObj);
                const key = `W${week} (${year})`;
                if (!weeklyGroups[key]) weeklyGroups[key] = 0;
                weeklyGroups[key] += Number(d.distance || 0);
            });

            const weekLabels = Object.keys(weeklyGroups).slice(-8);
            const weekSums = weekLabels.map(key => weeklyGroups[key]);

            distanceChart = new Chart(ctxD, {
                type: 'line',
                data: {
                    labels: weekLabels,
                    datasets: [{
                        label: 'Сума км за тиждень',
                        data: weekSums,
                        borderColor: GOLD,
                        backgroundColor: 'rgba(255, 199, 44, 0.2)',
                        fill: 'start',
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: GOLD,
                        borderWidth: 3
                    }]
                },
                options: { 
                    ...commonOptions,
                    plugins: { 
                        ...commonOptions.plugins,
                        tooltip: { backgroundColor: '#111', titleColor: GOLD }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            grid: { color: GRID_COLOR }, 
                            ticks: { color: '#666', font: { size: 10 } } 
                        },
                        x: { grid: { display: false }, ticks: { color: '#888', font: { size: 10 } } }
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
