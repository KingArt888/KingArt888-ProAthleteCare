(function () {

    const COLLECTION = 'load_season_reports';

    let loadChart = null;
    let distanceChart = null;
    let dailyData = [];

    /* ===============================
       INIT
    =============================== */
    document.addEventListener('DOMContentLoaded', () => {

        const dateInput = document.getElementById('load-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await loadFromFirestore(user.uid);
            } else {
                await firebase.auth().signInAnonymously();
            }
        });

        document
            .getElementById('load-form')
            .addEventListener('submit', handleSubmit);
    });

    /* ===============================
       FIRESTORE LOAD
    =============================== */
    async function loadFromFirestore(uid) {
        const snapshot = await db
            .collection(COLLECTION)
            .where('userId', '==', uid)
            .orderBy('date', 'asc')
            .get();

        dailyData = [];
        snapshot.forEach(doc => dailyData.push(doc.data()));

        updateAll();
    }

    /* ===============================
       UPDATE ALL UI
    =============================== */
    function updateAll() {

        if (dailyData.length === 0) {
            updateGauge(0.5);
            return;
        }

        const acwrSeries = buildACWRSeries(dailyData);
        const latestACWR = acwrSeries[acwrSeries.length - 1];

        updateGauge(latestACWR);
        renderLoadChart();
        renderDistanceChart();
    }

    /* ===============================
       LOAD CALCULATIONS
    =============================== */
    function sessionLoad(d) {
        return (d.duration || 0) * (d.rpe || 0);
    }

    function avgLoad(data, days, index) {
        const slice = data.slice(Math.max(0, index - days + 1), index + 1);
        const total = slice.reduce((s, d) => s + sessionLoad(d), 0);
        return total / days;
    }

    function buildACWRSeries(data) {
        return data.map((_, i) => {
            const acute = avgLoad(data, 7, i);
            const chronic = avgLoad(data, 28, i);
            return chronic > 0 ? acute / chronic : 0.5;
        });
    }

    /* ===============================
       ACWR GAUGE
    =============================== */
    function updateGauge(acwr) {

        const needle = document.querySelector('.gauge-needle');
        const valueEl = document.getElementById('acwr-value');
        const statusEl = document.getElementById('acwr-status');

        if (!needle) return;

        const MIN = 0.5;
        const MAX = 2.0;

        const clamped = Math.max(MIN, Math.min(MAX, acwr));
        const deg = ((clamped - MIN) / (MAX - MIN)) * 180 - 90;

        needle.style.transform = `translateX(-50%) rotate(${deg}deg)`;
        valueEl.textContent = acwr.toFixed(2);

        if (acwr >= 0.8 && acwr <= 1.3) {
            statusEl.textContent = 'Безпечна зона';
            statusEl.className = 'status-safe';
        } else if ((acwr >= 0.6 && acwr < 0.8) || (acwr > 1.3 && acwr <= 1.5)) {
            statusEl.textContent = 'Зона ризику';
            statusEl.className = 'status-warning';
        } else {
            statusEl.textContent = 'Високий ризик травми';
            statusEl.className = 'status-danger';
        }
    }

    /* ===============================
       LOAD CHART (ACUTE vs CHRONIC)
    =============================== */
    function renderLoadChart() {

        const ctx = document.getElementById('loadChart');
        if (!ctx || dailyData.length < 2) return;

        if (loadChart) loadChart.destroy();

        const labels = dailyData.map(d =>
            d.date.split('-').reverse().slice(0, 2).join('.')
        );

        const acuteSeries = dailyData.map((_, i) =>
            avgLoad(dailyData, 7, i)
        );

        const chronicSeries = dailyData.map((_, i) =>
            avgLoad(dailyData, 28, i)
        );

        loadChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Acute Load (7 днів)',
                        data: acuteSeries,
                        borderWidth: 3,
                        tension: 0.35
                    },
                    {
                        label: 'Chronic Load (28 днів)',
                        data: chronicSeries,
                        borderWidth: 3,
                        tension: 0.35
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Session Load (duration × RPE)'
                        }
                    }
                }
            }
        });
    }

    /* ===============================
       DISTANCE CHART
    =============================== */
    function renderDistanceChart() {

        const ctx = document.getElementById('distanceChart');
        if (!ctx || dailyData.length === 0) return;

        if (distanceChart) distanceChart.destroy();

        distanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyData.slice(-7).map(d =>
                    d.date.split('-').reverse().slice(0, 2).join('.')
                ),
                datasets: [{
                    label: 'Дистанція (км)',
                    data: dailyData.slice(-7).map(d => d.distance || 0),
                    borderWidth: 3,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    /* ===============================
       FORM SUBMIT
    =============================== */
    async function handleSubmit(e) {
        e.preventDefault();

        const user = firebase.auth().currentUser;
        if (!user) return;

        const form = e.target;

        const data = {
            userId: user.uid,
            date: form.elements.date.value,
            duration: Number(form.elements.duration.value),
            distance: Number(form.elements.distance.value),
            rpe: Number(form.querySelector('input[name="rpe"]:checked')?.value || 0),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db
            .collection(COLLECTION)
            .doc(`${user.uid}_${data.date}`)
            .set(data);

        const status = document.getElementById('form-status');
        if (status) {
            status.textContent = '✔ Дані збережено';
            status.className = 'status-box status-safe';
            setTimeout(() => status.textContent = '', 3000);
        }

        await loadFromFirestore(user.uid);
    }

})();
