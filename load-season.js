(function() {
    const COLLECTION_NAME = 'load_season_reports';
    
    // --- ДИЗАЙН ProAthleteCare ---
    const GOLD_COLOR = 'rgb(255, 215, 0)';
    const GOLD_AREA = 'rgba(255, 215, 0, 0.2)';
    const WHITE_GRID = 'rgba(255, 255, 255, 0.1)';
    const TEXT_COLOR = 'rgba(255, 255, 255, 0.8)';
    const ACUTE_COLOR = '#D9534F'; // Червоний для Acute
    const CHRONIC_COLOR = '#4CAF50'; // Зелений для Chronic

    let dailyLoadData = [];

    // --- СИНХРОНІЗАЦІЯ З FIREBASE ---
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();

            dailyLoadData = [];
            snapshot.forEach(doc => {
                dailyLoadData.push(doc.data());
            });

            // Зберігаємо копію в локал сторедж для швидкості (як у Wellness)
            localStorage.setItem('loadSeasonData', JSON.stringify(dailyLoadData));

            refreshUI();
        } catch (e) {
            console.error("Помилка синхронізації Load Season:", e);
            // Якщо помилка (наприклад, немає інтернету), беремо з локал сторедж
            dailyLoadData = JSON.parse(localStorage.getItem('loadSeasonData') || '[]');
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

    // --- ЛОГІКА ОБЧИСЛЕНЬ ---
    function calculateSessionRPE(duration, rpe) {
        return duration * rpe;
    }

    function calculateACWR() {
        if (dailyLoadData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };

        const sortedData = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const latestDate = new Date(sortedData[sortedData.length - 1].date);

        const sevenDaysAgo = new Date(latestDate);
        sevenDaysAgo.setDate(latestDate.getDate() - 7);
        const twentyEightDaysAgo = new Date(latestDate);
        twentyEightDaysAgo.setDate(latestDate.getDate() - 28);

        const dataWithLoad = sortedData.map(item => ({
            ...item,
            load: calculateSessionRPE(item.duration, item.rpe)
        }));

        const acuteLoad = dataWithLoad.filter(item => new Date(item.date) > sevenDaysAgo)
                                     .reduce((sum, item) => sum + item.load, 0) / 7;

        const chronicLoad = dataWithLoad.filter(item => new Date(item.date) > twentyEightDaysAgo)
                                       .reduce((sum, item) => sum + item.load, 0) / 28;

        return {
            acuteLoad: Math.round(acuteLoad),
            chronicLoad: Math.round(chronicLoad),
            acwr: chronicLoad > 0 ? parseFloat((acuteLoad / chronicLoad).toFixed(2)) : 0
        };
    }

    // --- ГРАФІКИ (В стилі ProAthleteCare) ---
    let distanceChart, loadChart;

    function renderDistanceChart() {
        const ctx = document.getElementById('distanceChart');
        if (!ctx) return;

        // Групування по тижнях (спрощене для відображення останніх 4 тижнів)
        const labels = ['Тиждень 1', 'Тиждень 2', 'Тиждень 3', 'Поточний'];
        const data = [0, 0, 0, 0]; // Тут логіка розрахунку вашої дистанції
        
        // Для демонстрації просто беремо останню дистанцію
        if (dailyLoadData.length > 0) data[3] = dailyLoadData.reduce((sum, i) => sum + i.distance, 0);

        if (distanceChart) distanceChart.destroy();
        distanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Дистанція (км)',
                    data: data,
                    borderColor: GOLD_COLOR,
                    backgroundColor: GOLD_AREA,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: WHITE_GRID }, ticks: { color: TEXT_COLOR } },
                    x: { grid: { display: false }, ticks: { color: TEXT_COLOR } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function renderLoadChart(acute, chronic) {
        const ctx = document.getElementById('loadChart');
        if (!ctx) return;

        if (loadChart) loadChart.destroy();
        loadChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['За тиждень'],
                datasets: [
                    { label: 'Acute', data: [acute], borderColor: ACUTE_COLOR, fill: false },
                    { label: 'Chronic', data: [chronic], borderColor: CHRONIC_COLOR, fill: false }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: WHITE_GRID }, ticks: { color: TEXT_COLOR } },
                    x: { ticks: { color: TEXT_COLOR } }
                },
                plugins: { legend: { labels: { color: TEXT_COLOR } } }
            }
        });
    }

    // --- ОБРОБКА ПОДІЙ ---
    document.addEventListener('DOMContentLoaded', () => {
        // 1. Авторизація (Анонімна або повноцінна)
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await syncLoadFromFirebase(user.uid);
            } else {
                await firebase.auth().signInAnonymously();
            }
        });

        // 2. Форма
        const form = document.getElementById('load-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = firebase.auth().currentUser;
                if (!user) return alert("Зачекайте авторизації...");

                const statusMessage = document.getElementById('form-status');
                const formData = {
                    userId: user.uid,
                    date: form.elements['date'].value,
                    duration: parseInt(form.elements['duration'].value),
                    distance: parseFloat(form.elements['distance'].value),
                    rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 0),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (!formData.date || !formData.rpe) return alert("Заповніть всі поля!");

                try {
                    // Використовуємо дату як ID документа, щоб не було дублікатів за один день
                    await db.collection(COLLECTION_NAME).doc(`${user.uid}_${formData.date}`).set(formData);
                    
                    statusMessage.textContent = "Дані збережено!";
                    statusMessage.style.color = GOLD_COLOR;
                    
                    await syncLoadFromFirebase(user.uid);
                } catch (err) {
                    alert("Помилка збереження: " + err.message);
                }
            });
        }
    });

    // Допоміжна функція оновлення стрілки (updateACWRGauge) залишається без змін з вашого коду
})();
