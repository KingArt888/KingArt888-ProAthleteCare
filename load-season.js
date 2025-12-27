(function() {
    const COLLECTION_NAME = 'load_season_reports';
    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;

    // --- 1. ІНІЦІАЛІЗАЦІЯ ---
    document.addEventListener('DOMContentLoaded', () => {
        // Автоматичне встановлення поточної дати
        const dateInput = document.getElementById('load-date') || document.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

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

    // --- 2. ЛОГІКА ЛІНІЙНОЇ ШКАЛИ (Замість спідометра) ---
    function updateACWRLinear(acwrValue) {
        const marker = document.querySelector('.acwr-marker');
        const valueDisplay = document.getElementById('acwr-value');
        const statusDisplay = document.getElementById('acwr-status-text');

        if (!marker || !valueDisplay) return;

        // Розрахунок позиції маркера у % (згідно з вашими зонами в CSS)
        // 0.0 - 0.8 (40% ширини)
        // 0.8 - 1.3 (25% ширини)
        // 1.3 - 2.0+ (35% ширини)
        let pos = 0;
        if (acwrValue <= 0.8) {
            pos = (acwrValue / 0.8) * 40;
        } else if (acwrValue <= 1.3) {
            pos = 40 + ((acwrValue - 0.8) / 0.5) * 25;
        } else {
            pos = 65 + ((acwrValue - 1.3) / 0.7) * 35;
        }

        // Обмеження руху маркера
        marker.style.left = `${Math.min(99, Math.max(0, pos))}%`;
        
        // Оновлення великої цифри
        valueDisplay.textContent = acwrValue.toFixed(2);

        // Оновлення тексту статусу та кольору
        if (statusDisplay) {
            if (acwrValue < 0.8) {
                statusDisplay.textContent = 'НЕДОТРЕНОВАНІСТЬ';
                statusDisplay.style.color = 'rgba(255, 215, 0, 0.6)'; // Тьмяне золото
            } else if (acwrValue <= 1.3) {
                statusDisplay.textContent = 'ОПТИМАЛЬНА ФОРМА (SWEET SPOT)';
                statusDisplay.style.color = '#FFD700'; // Яскраве золото
            } else {
                statusDisplay.textContent = 'РИЗИК ТРАВМИ';
                statusDisplay.style.color = '#D9534F'; // Червоний
            }
        }
    }

    // --- 3. ГРАФІКИ (Чорно-золотий стиль) ---
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
                        borderColor: '#FFD700',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
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
                    labels: ['Минулий період', 'Поточний період'],
                    datasets: [
                        { label: 'Acute Load (Short)', data: [acute*0.8, acute], borderColor: '#D9534F', borderWidth: 3 },
                        { label: 'Chronic Load (Long)', data: [chronic*0.9, chronic], borderColor: '#FFD700', borderWidth: 3 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // --- 4. FIREBASE ТА РОЗРАХУНКИ ---
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME).where("userId", "==", uid).orderBy("date", "asc").get();
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            if (dailyLoadData.length === 0) dailyLoadData = getDemoData();

            const { acute, chronic, acwr } = calculateMetrics();
            updateACWRLinear(acwr); // ВИКЛИК НОВОЇ ФУНКЦІЇ
            renderCharts(acute, chronic);
        } catch (e) {
            console.error("Помилка даних:", e);
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
