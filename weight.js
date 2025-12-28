(function() {
    let weightChart = null;
    let currentUserId = null;

    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = viewUserId || user.uid;
            loadBaseData();
            loadHistory();
        } else {
            firebase.auth().signInAnonymously();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        document.getElementById('weight-form').addEventListener('submit', handleWeightSubmit);
    });

    async function handleWeightSubmit(e) {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const fat = ((1.20 * bmi) + (0.23 * a) - 16.2).toFixed(1);
        const lbm = (w * (1 - (fat / 100))).toFixed(1);

        document.getElementById('bmi-value').textContent = bmi;
        document.getElementById('fat-percentage-value').textContent = fat + "%";

        await db.collection('weight_history').add({
            userId: currentUserId,
            weight: w,
            date: new Date().toISOString().split('T')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadHistory();
    }

    function initChart() {
        const ctx = document.getElementById('weightChart').getContext('2d');
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ data: [], borderColor: '#FFC72C', tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    async function loadHistory() {
        const snap = await db.collection('weight_history').where('userId', '==', currentUserId).orderBy('date', 'asc').limit(10).get();
        if (!snap.empty) {
            const data = snap.docs.map(d => d.data());
            weightChart.data.labels = data.map(d => d.date);
            weightChart.data.datasets[0].data = data.map(d => d.weight);
            weightChart.update();
        }
    }

    async function loadBaseData() {
        const doc = await db.collection('users').doc(currentUserId).get();
        if (doc.exists) {
            document.getElementById('user-height').value = doc.data().height || "";
            document.getElementById('user-age').value = doc.data().age || "";
        }
    }
})();
