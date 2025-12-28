(function() {
    let weightChart = null;
    let currentUserId = null;

    // Режим адміна через URL
    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = viewUserId || user.uid;
            console.log("Active ID:", currentUserId);
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

        if (!w || !h || !a) return;

        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        const fat = ((1.20 * bmi) + (0.23 * a) - 16.2).toFixed(1);

        document.getElementById('bmi-value').textContent = bmi;
        document.getElementById('fat-percentage-value').textContent = fat + "%";
        document.getElementById('athlete-rank').textContent = fat < 15 ? "PRO ATHLETE" : "ACTIVE MODE";

        await db.collection('weight_history').add({
            userId: currentUserId,
            weight: w,
            date: new Date().toISOString().split('T')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection('users').doc(currentUserId).set({ height: h, age: a }, { merge: true });
        loadHistory();
    }

    function initChart() {
        const ctx = document.getElementById('weightChart').getContext('2d');
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Weight', data: [], borderColor: '#FFC72C', tension: 0.4, fill: true, backgroundColor: 'rgba(255,199,44,0.05)' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    async function loadBaseData() {
        const doc = await db.collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('user-height').value = data.height || "";
            document.getElementById('user-age').value = data.age || "";
        }
    }

    async function loadHistory() {
        const snap = await db.collection('weight_history')
            .where('userId', '==', currentUserId)
            .orderBy('date', 'asc').limit(15).get();
        
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data());
            weightChart.data.labels = docs.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
        }
    }
})();
