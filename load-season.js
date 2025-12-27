let dailyLoadData = [];
let loadChart = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('load-date').valueAsDate = new Date();

    db.collection("dailyLoad").orderBy("date", "asc")
    .onSnapshot((snapshot) => {
        dailyLoadData = [];
        snapshot.forEach(doc => dailyLoadData.push(doc.data()));
        updateDashboard();
    }, (error) => {
        console.error("Firebase Permission Error:", error);
        document.getElementById('acwr-status').innerText = "Помилка доступу";
    });

    document.getElementById('load-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const rpe = document.querySelector('input[name="rpe"]:checked')?.value;
        const duration = parseInt(document.getElementById('load-duration').value);
        
        const entry = {
            date: document.getElementById('load-date').value,
            duration: duration,
            rpe: parseInt(rpe),
            load: duration * parseInt(rpe),
            distance: parseFloat(document.getElementById('load-distance').value) || 0
        };

        try {
            await db.collection("dailyLoad").add(entry);
            e.target.reset();
            document.getElementById('load-date').valueAsDate = new Date();
        } catch (err) { console.error(err); }
    });
});

function updateDashboard() {
    if (dailyLoadData.length === 0) return;
    const acwr = calculateACWR();
    
    document.getElementById('acwr-value').innerText = acwr.toFixed(2);
    const needle = document.getElementById('gauge-needle');
    
    // 1.0 = 0deg, 4.0 = 90deg (як на фото)
    let degrees = (acwr - 1) * 30; 
    degrees = Math.max(-90, Math.min(90, degrees));
    needle.style.transform = `translateX(-50%) rotate(${degrees}deg)`;

    const st = document.getElementById('acwr-status');
    st.innerText = acwr > 1.3 ? "DANGER" : (acwr < 0.8 ? "WARNING" : "SAFE");
    st.style.color = acwr > 1.3 ? "#d9534f" : "#5cb85c";
    document.getElementById('acwr-value').style.color = acwr > 1.3 ? "#d9534f" : "#5cb85c";

    renderChart();
}

function calculateACWR() {
    if (dailyLoadData.length < 7) return 1.0;
    const acute = dailyLoadData.slice(-7).reduce((sum, d) => sum + d.load, 0) / 7;
    const chronic = dailyLoadData.slice(-28).reduce((sum, d) => sum + d.load, 0) / 28;
    return chronic > 0 ? (acute / chronic) : 1.0;
}

function renderChart() {
    const ctx = document.getElementById('loadChart').getContext('2d');
    if (loadChart) loadChart.destroy();
    const last14 = dailyLoadData.slice(-14);
    loadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last14.map(d => d.date.split('-').slice(1).join('.')),
            datasets: [{
                label: 'Навантаження',
                data: last14.map(d => d.load),
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
