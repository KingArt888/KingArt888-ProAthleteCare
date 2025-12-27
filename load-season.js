(function() {
    // Назва колекції має суворо збігатися з вашими Firebase Rules
    const COLLECTION_NAME = 'load_season_reports';
    
    let dailyLoadData = [];
    let distanceChart, loadChart;

    // --- 1. СИНХРОНІЗАЦІЯ З FIREBASE ---
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();

            const firebaseData = [];
            snapshot.forEach(doc => firebaseData.push(doc.data()));
            
            // Якщо в базі порожньо — показуємо демо-дані, щоб графіки не були пустими
            dailyLoadData = firebaseData.length > 0 ? firebaseData : getInitialDemoData();
            
            refreshUI();
        } catch (e) {
            console.error("Помилка синхронізації:", e);
            dailyLoadData = getInitialDemoData();
            refreshUI();
        }
    }

    function refreshUI() {
        const { acuteLoad, chronicLoad, acwr } = calculateACWR();
        updateACWRGauge(acwr); 
        if (typeof Chart !== 'undefined') {
            renderDistanceChart();
            renderLoadChart(acuteLoad, chronicLoad);
        }
    }

    // --- 2. ЛОГІКА ОБЧИСЛЕНЬ ---
    function calculateSessionRPE(duration, rpe) {
        return duration * rpe;
    }

    function getWeekNumber(dateString) {
        const date = new Date(dateString);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 4 - (date.getDay() || 7));
        const yearStart = new Date(date.getFullYear(), 0, 1);
        return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    }

    function calculateACWR() {
        if (dailyLoadData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };
        const sortedData = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const latestDate = new Date(sortedData[sortedData.length - 1].date);

        const dataWithLoad = sortedData.map(item => ({
            ...item,
            load: calculateSessionRPE(item.duration, item.rpe)
        }));

        const getLoadDays = (days) => {
            const startDate = new Date(latestDate);
            startDate.setDate(latestDate.getDate() - days);
            const periodData = dataWithLoad.filter(item => new Date(item.date) > startDate);
            return (periodData.reduce((sum, item) => sum + item.load, 0)) / days;
        };

        const acute = getLoadDays(7);
        const chronic = getLoadDays(28);

        return {
            acuteLoad: Math.round(acute),
            chronicLoad: Math.round(chronic),
            acwr: chronic > 0 ? parseFloat((acute / chronic).toFixed(2)) : 0
        };
    }

    // --- 3. ПРЕМІАЛЬНИЙ UI (СПІДОМЕТР ТА ГРАФІКИ) ---
    
    function updateACWRGauge(acwrValue) {
        const needle = document.getElementById('gauge-needle');
        const display = document.getElementById('acwr-value');
        const statusText = document.getElementById('acwr-status');
        if (!needle || !display || !statusText) return;

        let degree = -90; 
        let status = '';
        
        // Кольорова логіка "Спорткар":
        if (acwrValue < 0.8) {
            // ЖОВТА ЗОНА - Недотренованість
            degree = -90 + (acwrValue / 0.8) * 40; 
            status = 'Недотренованість';
            statusText.style.color = '#f1c40f'; 
        } else if (acwrValue >= 0.8 && acwrValue <= 1.3) {
            // ЗЕЛЕНА ЗОНА - Оптимально
            degree = -50 + ((acwrValue - 0.8) / 0.5) * 100;
            status = 'Хороша динаміка';
            statusText.style.color = '#2ecc71';
        } else {
            // ЧЕРВОНА ЗОНА - Ризик травм
            degree = 50 + ((acwrValue - 1.3) / 0.7) * 40;
            status = 'Ризик травм';
            statusText.style.color = '#e74c3c';
        }

        const finalDegree = Math.min(90, Math.max(-90, degree));
        needle.style.transform = `translateX(-50%) rotate(${finalDegree}deg)`;
        display.textContent = acwrValue.toFixed(2);
        statusText.textContent = status;
    }

    function renderDistanceChart() {
        const ctx = document.getElementById('distanceChart');
        if (!ctx) return;
        
        const weeklyDistance = {};
        dailyLoadData.forEach(item => {
            const week = getWeekNumber(item.date);
            weeklyDistance[week] = (weeklyDistance[week] || 0) + item.distance;
        });

        const sortedWeeks = Object.keys(weeklyDistance).sort();
        const labels = sortedWeeks.map((_, i) => `Тиждень ${i + 1}`);
        const data = sortedWeeks.map(w => weeklyDistance[w]);

        if (distanceChart) distanceChart.destroy();
        distanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Загальна дистанція (км)',
                    data: data,
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.2)',
                    borderWidth: 3, tension: 0.3, fill: true
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#CCCCCC' } } },
                scales: {
                    x: { ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } },
                    y: { beginAtZero: true, ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } }
                }
            }
        });
    }

    function renderLoadChart(acuteLoad, chronicLoad) {
        const ctx = document.getElementById('loadChart');
        if (!ctx) return;

        const demoLabels = ['4 тижні тому', '3 тижні тому', '2 тижні тому', 'Поточний'];
        const demoAcute = [500, 650, 800, acuteLoad];
        const demoChronic = [600, 620, 700, chronicLoad];

        if (loadChart) loadChart.destroy();
        loadChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: demoLabels,
                datasets: [
                    { label: 'Acute Load', data: demoAcute, borderColor: '#D9534F', tension: 0.3, fill: false, borderWidth: 3 },
                    { label: 'Chronic Load', data: demoChronic, borderColor: '#4CAF50', tension: 0.3, fill: false, borderWidth: 3 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#CCCCCC' } } },
                scales: {
                    x: { ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } },
                    y: { beginAtZero: true, ticks: { color: '#AAAAAA' }, grid: { color: '#333333' } }
                }
            }
        });
    }

    function getInitialDemoData() {
        return [
            { date: '2025-11-24', duration: 60, rpe: 7, distance: 8.5 },
            { date: '2025-12-05', duration: 100, rpe: 9, distance: 14.0 },
            { date: '2025-12-13', duration: 80, rpe: 8, distance: 10.0 }
        ];
    }

    // --- 4. ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ ---
    document.addEventListener('DOMContentLoaded', () => {
        // ВСТАНОВЛЕННЯ СЬОГОДНІШНЬОЇ ДАТИ
        const dateInput = document.getElementById('load-date') || document.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await syncLoadFromFirebase(user.uid);
            } else {
                await firebase.auth().signInAnonymously();
            }
        });

        const form = document.getElementById('load-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user) return alert("Потрібна авторизація...");

                const data = {
                    userId: user.uid,
                    date: form.elements['date'].value,
                    duration: parseInt(form.elements['duration'].value),
                    distance: parseFloat(form.elements['distance'].value),
                    rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 0),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };

                try {
                    await db.collection(COLLECTION_NAME).doc(`${user.uid}_${data.date}`).set(data);
                    const status = document.getElementById('form-status');
                    if (status) status.textContent = "Дані збережено у хмарі!";
                    await syncLoadFromFirebase(user.uid);
                } catch (err) { alert("Помилка Firebase: Перевірте правила (Rules)"); }
            });
        }
    });
})();
