(function () {

    const COLLECTION_NAME = 'load_season_reports';

    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;

    /* =========================
       INIT
    ========================= */
    document.addEventListener('DOMContentLoaded', () => {

        const dateInput = document.getElementById('load-date');
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
            form.addEventListener('submit', handleFormSubmit);
        }
    });

    /* =========================
       ACWR GAUGE
    ========================= */
    function updateACWRGauge(acwr) {

        const needle = document.querySelector('.gauge-needle');
        const valueEl = document.getElementById('acwr-value');
        const statusEl = document.getElementById('acwr-status');

        if (!needle || !valueEl || !statusEl) return;

        const MIN = 0.5;
        const MAX = 2.0;

        const clamped = Math.max(MIN, Math.min(MAX, acwr));
        const degree = ((clamped - MIN) / (MAX - MIN)) * 180 - 90;

        needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
        valueEl.textContent = acwr.toFixed(2);

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

    /* =========================
       FIREBASE
    ========================= */
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db
                .collection(COLLECTION_NAME)
                .where('userId', '==', uid)
                .orderBy('date', 'asc')
                .get();

            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));

            if (dailyLoadData.length < 7) {
                updateACWRGauge(0.5);
                renderDistanceChart();
                return;
            }

            const { acwr } = calculateMetrics(dailyLoadData);
            updateACWRGauge(acwr);
            renderACWRChart();
            renderDistanceChart();

        } catch (err) {
            console.error(err);
        }
    }

    /* =========================
       METRICS
    ========================= */
    function calculateMetrics(data) {

        const sorted = [...data].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );

        const lastDate = new Date(sorted[sorted.length - 1].date);

        const getLoadAvg = (days) => {
            const start = new Date(lastDate);
            start.setDate(start.getDate() - days);

            const period = sorted.filter(d => new Date(d.date) > start);
            const total = period.reduce(
                (sum, d) => sum + (d.duration * (d.rpe || 0)),
                0
            );
            return total / days;
        };

        const acute = getLoadAvg(7);
        const chronic = getLoadAvg(28);
        const acwr = chronic > 0 ? acute / chronic : 0.5;

        return { acute, chronic, acwr };
    }

    /* =========================
       ACWR TREND CHART
    ========================= */
    function renderACWRChart() {

        const ctx = document.getElementById('loadChart');
        if (!ctx) return;

        if (loadChart) loadChart.destroy();

        const labels = dailyLoadData.slice(-14).map(d =>
            d.date.split('-').reverse().slice(0, 2).join('.')
        );

        const acwrValues = dailyLoadData.slice(-14).map((_, i, arr) => {
            const slice = arr.slice(0, i + 1);
            return calculateMetrics(slice).acwr;
        });

        loadChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'ACWR',
                    data: acwrValues,
                    borderColor: '#FFD700',
                    borderWidth: 3,
                    tension: 0.35,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        min: 0,
                        max: 2,
                        title: {
                            display: true,
                            text: 'ACWR'
                        }
                    }
                },
                plugins: {
                    annotation: {
                        annotations: {
                            safe: {
                                type: 'box',
                                yMin: 0.8,
                                yMax: 1.3,
                                backgroundColor: 'rgba(92,184,92,0.15)'
                            },
                            warningLow: {
                                type: 'box',
                                yMin: 0.6,
                                yMax: 0.8,
                                backgroundColor: 'rgba(240,173,78,0.15)'
                            },
                            warningHigh: {
                                type: 'box',
                                yMin: 1.3,
                                yMax: 1.5,
                                backgroundColor: 'rgba(240,173,78,0.15)'
                            },
                            danger: {
                                type: 'box',
                                yMin: 1.5,
                                backgroundColor: 'rgba(217,83,79,0.15)'
                            }
                        }
                    }
                }
            }
        });
    }

    /* =========================
       DISTANCE CHART
    ========================= */
    function renderDistanceChart() {

        const ctx = document.getElementById('distanceChart');
        if (!ctx || dailyLoadData.length === 0) return;

        if (distanceChart) distanceChart.destroy();

        distanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyLoadData.slice(-7).map(d =>
                    d.date.split('-').reverse().slice(0, 2).join('.')
                ),
                datasets: [{
                    label: 'Км',
                    data: dailyLoadData.slice(-7).map(d => d.distance),
                    borderColor: '#FFD700',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: false
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

    /* =========================
       FORM SUBMIT
    ========================= */
    async function handleFormSubmit(e) {

        e.preventDefault();

        const user = firebase.auth().currentUser;
        if (!user) return;

        const form = e.target;

        const data = {
            userId: user.uid,
            date: form.elements['date'].value,
            duration: Number(form.elements['duration'].value),
            distance: Number(form.elements['distance'].value),
            rpe: Number(form.querySelector('input[name="rpe"]:checked')?.value || 0),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db
            .collection(COLLECTION_NAME)
            .doc(`${user.uid}_${data.date}`)
            .set(data);

        await syncLoadFromFirebase(user.uid);
    }

})();
