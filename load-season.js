(function() {
    const COLLECTION_NAME = 'load_season_reports';
    let dailyLoadData = [];
    let distanceChart, loadChart;

    // --- 1. ІНІЦІАЛІЗАЦІЯ ---
    document.addEventListener('DOMContentLoaded', () => {
        // Автоматична дата (сьогодні)
        const dateInput = document.getElementById('load-date') || document.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) await syncLoadFromFirebase(user.uid);
            else await firebase.auth().signInAnonymously();
        });

        const form = document.getElementById('load-form');
        if (form) form.addEventListener('submit', handleFormSubmit);
    });

    // --- 2. РОБОТА СПІДОМЕТРА (МАКСИМАЛЬНА ТОЧНІСТЬ) ---
    function updateACWRGauge(acwrValue) {
        const needle = document.getElementById('gauge-needle');
        const display = document.getElementById('acwr-value');
        const statusText = document.getElementById('acwr-status');
        const gaugeTrack = document.querySelector('.gauge-track') || document.querySelector('.gauge-body');

        if (!needle || !display || !statusText) return;

        // ПРИМУСОВЕ СТВОРЕННЯ ШКАЛИ (якщо CSS не працює)
        if (gaugeTrack) {
            gaugeTrack.style.background = `conic-gradient(
                from 270deg,
                #f1c40f 0deg, #f1c40f 45deg,    /* 0.0 - 0.8: Недотрен */
                #2ecc71 45deg, #2ecc71 135deg,  /* 0.8 - 1.3: Оптимально */
                #e74c3c 135deg, #e74c3c 180deg, /* 1.3+: Ризик травм */
                transparent 180deg
            )`;
            gaugeTrack.style.borderRadius = "500px 500px 0 0"; // Форма півкола
            gaugeTrack.style.borderBottom = "none";
        }

        // Розрахунок кута: стрілка ходить від -90 до +90 градусів
        let degree = -90; 
        let status = '';
        
        if (acwrValue < 0.8) {
            degree = -90 + (acwrValue / 0.8) * 45; 
            status = 'НЕДОТРЕНОВАНІСТЬ';
            statusText.style.color = '#f1c40f'; 
        } else if (acwrValue >= 0.8 && acwrValue <= 1.3) {
            degree = -45 + ((acwrValue - 0.8) / 0.5) * 90;
            status = 'ОПТИМАЛЬНА ФОРМА';
            statusText.style.color = '#2ecc71';
        } else {
            degree = 45 + ((acwrValue - 1.3) / 0.7) * 45;
            status = 'РИЗИК ТРАВМИ';
            statusText.style.color = '#e74c3c';
        }

        // Жорстке обмеження стрілки (не далі 90 градусів)
        const finalDegree = Math.min(90, Math.max(-90, degree));

        // Налаштування стрілки (Центрування та плавний рух)
        needle.style.position = "absolute";
        needle.style.bottom = "0";
        needle.style.left = "50%";
        needle.style.transformOrigin = "bottom center";
        needle.style.transition = "transform 2s cubic-bezier(0.4, 0, 0.2, 1)";
        needle.style.transform = `translateX(-50%) rotate(${finalDegree}deg)`;
        needle.style.backgroundColor = "#FFD700"; // Золото для ProAtletCare
        
        display.textContent = acwrValue.toFixed(2);
        statusText.textContent = status;
        statusText.style.fontWeight = "bold";
    }

    // --- 3. FIREBASE ТА РОЗРАХУНКИ ---
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();

            const firebaseData = [];
            snapshot.forEach(doc => firebaseData.push(doc.data()));
            dailyLoadData = firebaseData.length > 0 ? firebaseData : getDemoData();
            refreshUI();
        } catch (e) {
            dailyLoadData = getDemoData();
            refreshUI();
        }
    }

    function calculateACWR() {
        if (dailyLoadData.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };
        const sorted = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const lastDate = new Date(sorted[sorted.length - 1].date);

        const getLoad = (days) => {
            const start = new Date(lastDate);
            start.setDate(lastDate.getDate() - days);
            const period = sorted.filter(d => new Date(d.date) > start);
            const total = period.reduce((s, d) => s + (d.duration * (d.rpe || 0)), 0);
            return total / days;
        };

        const acute = getLoad(7);
        const chronic = getLoad(28);
        return { acuteLoad: acute, chronicLoad: chronic, acwr: chronic > 0 ? acute / chronic : 0 };
    }

    function refreshUI() {
        const { acuteLoad, chronicLoad, acwr } = calculateACWR();
        updateACWRGauge(acwr); 
        if (typeof Chart !== 'undefined') {
            renderDistanceChart();
            renderLoadChart(acuteLoad, chronicLoad);
        }
    }

    // --- 4. ГРАФІКИ ---
    function renderDistanceChart() {
        const ctx = document.getElementById('distanceChart');
        if (!ctx) return;
        if (distanceChart) distanceChart.destroy();
        const labels = dailyLoadData.slice(-7).map(d => d.date);
        const data = dailyLoadData.slice(-7).map(d => d.distance);
        distanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{ label: 'Дистанція', data: data, borderColor: '#FFD700', fill: true, tension: 0.4 }]
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
                labels: ['Минулий тиждень', 'Поточний'],
                datasets: [
                    { label: 'Acute', data: [acute*0.8, acute], borderColor: '#e74c3c' },
                    { label: 'Chronic', data: [chronic*0.9, chronic], borderColor: '#2ecc71' }
                ]
            }
        });
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
        return [{ date: '2025-12-27', duration: 60, rpe: 7, distance: 5 }];
    }
})();
