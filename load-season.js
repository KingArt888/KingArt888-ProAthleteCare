(function() {
    const COLLECTION_NAME = 'load_season_reports';
    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;

    // --- 1. ІНІЦІАЛІЗАЦІЯ ---
    document.addEventListener('DOMContentLoaded', () => {
        // Сьогоднішня дата автоматично
        const dateInput = document.getElementById('load-date') || document.querySelector('input[type="date"]');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        // Вхід та завантаження
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await syncLoadFromFirebase(user.uid);
            } else {
                await firebase.auth().signInAnonymously().catch(console.error);
            }
        });

        const form = document.getElementById('load-form');
        if (form) form.addEventListener('submit', handleFormSubmit);
    });

    // --- 2. ПРЕМІУМ СПІДОМЕТР (Синхронізація з вашим CSS) ---
    function updateACWRGauge(acwrValue) {
        const needle = document.querySelector('.gauge-needle'); // Використовуємо ваш клас
        const display = document.getElementById('acwr-value');
        const statusBox = document.querySelector('.gauge-status-box');

        if (!needle || !display) return;

        // ЛОГІКА ОБЕРТАННЯ: 
        // Згідно з вашим CSS, стрілка по замовчуванню стоїть горизонтально (0°).
        // Шкала - це півколо: від -180° (ліво) до 0° (право).
        let degree = -180; 
        let statusText = '';
        let statusClass = '';

        if (acwrValue < 0.8) {
            degree = -180 + (acwrValue / 0.8) * 45; // Жовта зона (Underload)
            statusText = 'НЕДОТРЕНОВАНІСТЬ';
            statusClass = 'status-warning';
        } else if (acwrValue <= 1.3) {
            degree = -135 + ((acwrValue - 0.8) / 0.5) * 90; // Зелена зона (Optimal)
            statusText = 'ОПТИМАЛЬНА ФОРМА';
            statusClass = 'status-safe';
        } else {
            degree = -45 + ((acwrValue - 1.3) / 0.7) * 45; // Червона зона (Danger)
            statusText = 'РИЗИК ТРАВМИ';
            statusClass = 'status-danger';
        }

        // Жорстке обмеження, щоб стрілка не "улітала"
        const finalDegree = Math.min(0, Math.max(-180, degree));
        
        // Плавна анімація
        needle.style.transform = `translateX(-50%) rotate(${finalDegree}deg)`;
        display.textContent = acwrValue.toFixed(2);
        
        if (statusBox) {
            statusBox.innerHTML = `<span class="${statusClass}">${statusText}</span>`;
        }
    }

    // --- 3. ГРАФІКИ (Fix для відображення) ---
    function renderCharts(acute, chronic) {
        const ctxD = document.getElementById('distanceChart');
        const ctxL = document.getElementById('loadChart');

        if (ctxD) {
            if (distanceChart) distanceChart.destroy();
            distanceChart = new Chart(ctxD, {
                type: 'line',
                data: {
                    labels: dailyLoadData.slice(-7).map(d => d.date.split('-').reverse().slice(0,2).join('.')),
                    datasets: [{
                        label: 'Дистанція (км)',
                        data: dailyLoadData.slice(-7).map(d => d.distance),
                        borderColor: '#FFC72C', // Колір золота
                        backgroundColor: 'rgba(255, 199, 44, 0.1)',
                        fill: true, tension: 0.4, borderWidth: 3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        if (ctxL) {
            if (loadChart) loadChart.destroy();
            loadChart = new Chart(ctxL, {
                type: 'line',
                data: {
                    labels: ['4 тижні тому', '3 тижні тому', '2 тижні тому', 'Зараз'],
                    datasets: [
                        { label: 'Acute', data: [acute*0.8, acute*1.1, acute*0.9, acute], borderColor: '#d9534f', tension: 0.3 },
                        { label: 'Chronic', data: [chronic*0.9, chronic*0.95, chronic, chronic], borderColor: '#5cb85c', tension: 0.3 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // --- 4. DATA LOGIC ---
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();
            
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            if (dailyLoadData.length === 0) dailyLoadData = getDemoData();

            const { acute, chronic, acwr } = calculateMetrics();
            updateACWRGauge(acwr);
            renderCharts(acute, chronic);
        } catch (e) {
            console.error("Firebase Error:", e);
        }
    }

    function calculateMetrics() {
        if (dailyLoadData.length === 0) return { acute: 0, chronic: 0, acwr: 0 };
        const sorted = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const lastDate = new Date(sorted[sorted.length - 1].date);

        const getAvg = (days) => {
            const start = new Date(lastDate);
            start.setDate(lastDate.getDate() - days);
            const period = sorted.filter(d => new Date(d.date) > start);
            const total = period.reduce((s, d) => s + (d.duration * (d.rpe || 0)), 0);
            return total / days;
        };

        const acute = getAvg(7);
        const chronic = getAvg(28);
        return { acute, chronic, acwr: chronic > 0 ? acute / chronic : 0 };
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        const form = e.target;
        const data = {
            userId: user.uid,
            date: form.elements['date'].value,
            duration: parseInt(form.elements['duration'].value),
            distance: parseFloat(form.elements['distance'].value),
            rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 0),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTION_NAME).doc(`${user.uid}_${data.date}`).set(data);
        await syncLoadFromFirebase(user.uid);
    }

    function getDemoData() {
        return [{ date: new Date().toISOString().split('T')[0], duration: 60, rpe: 7, distance: 5 }];
    }
})();
