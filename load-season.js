(function() {
    const COLLECTION_NAME = 'load_season_reports';
    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;

    document.addEventListener('DOMContentLoaded', () => {
        const dateInput = document.getElementById('load-date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

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

    // --- ОНОВЛЕНА ФУНКЦІЯ СПІДОМЕТРА ---
   function updateACWRGauge(acwr) {
    const needle = document.querySelector('.gauge-needle');
    const valueEl = document.getElementById('acwr-value');
    const statusEl = document.getElementById('acwr-status');

    if (!needle) return;

    // clamp ACWR
    const min = 0.5;
    const max = 2.0;
    const safeAcwr = Math.max(min, Math.min(max, acwr));

    // linear map → degrees
    const degree = ((safeAcwr - min) / (max - min)) * 180 - 90;

    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
    valueEl.textContent = acwr.toFixed(2);

    // STATUS LOGIC
    if (acwr >= 0.8 && acwr <= 1.3) {
        statusEl.textContent = 'ОПТИМАЛЬНА ЗОНА';
        statusEl.className = 'status-safe';
        valueEl.style.color = '#5cb85c';
    } 
    else if ((acwr >= 0.6 && acwr < 0.8) || (acwr > 1.3 && acwr <= 1.5)) {
        statusEl.textContent = 'ПОПЕРЕДЖЕННЯ';
        statusEl.className = 'status-warning';
        valueEl.style.color = '#f0ad4e';
    } 
    else {
        statusEl.textContent = 'ВИСОКИЙ РИЗИК ТРАВМИ';
        statusEl.className = 'status-danger';
        valueEl.style.color = '#d9534f';
    }
}


    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();
            
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            if (dailyLoadData.length === 0) {
                updateACWRGauge(0);
                return;
            }

            const { acute, chronic, acwr } = calculateMetrics();
            updateACWRGauge(acwr);
            renderCharts(acute, chronic);
        } catch (e) { console.error(e); }
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
        const acwr = chronic > 0 ? acute / chronic : 0;
        return { acute, chronic, acwr };
    }

    function renderCharts(acute, chronic) {
        const ctxD = document.getElementById('distanceChart');
        if (ctxD && dailyLoadData.length > 0) {
            if (distanceChart) distanceChart.destroy();
            distanceChart = new Chart(ctxD, {
                type: 'line',
                data: {
                    labels: dailyLoadData.slice(-7).map(d => d.date.split('-').reverse().slice(0,2).join('.')),
                    datasets: [{
                        label: 'Км',
                        data: dailyLoadData.slice(-7).map(d => d.distance),
                        borderColor: '#FFD700',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        fill: true
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
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
})();
