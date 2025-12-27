let dailyLoadData = [];
let loadChart = null;
let distChart = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('load-date').valueAsDate = new Date();

    // Слухаємо дані з Firebase
    db.collection("dailyLoad").orderBy("date", "asc")
    .onSnapshot((snapshot) => {
        dailyLoadData = [];
        snapshot.forEach(doc => dailyLoadData.push(doc.data()));
        updateDashboard();
    }, (error) => {
        console.error("Помилка Firebase:", error);
        document.getElementById('acwr-status').innerText = "Потрібно налаштувати Rules в Firebase!";
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
        } catch (err) { alert("Помилка запису: " + err.message); }
    });
});

function updateDashboard() {
    if (dailyLoadData.length === 0) return;
    const acwr = calculateACWR();
    
    document.getElementById('acwr-value').innerText = acwr.toFixed(2);
    const needle = document.getElementById('gauge-needle');
    
    // Рух стрілки: 0.0 -> -90deg, 1.0 -> 0deg, 2.0+ -> 90deg
    let degrees = (acwr - 1) * 60;
    degrees = Math.max(-90, Math.min(90, degrees));
    needle.style.transform = `translateX(-50%) rotate(${degrees}deg) `;

    const st = document.getElementById('acwr-status');
    st.innerText = acwr > 1.3 ? "DANGER" : (acwr < 0.8 ? "WARNING" : "SAFE");
    st.style.color = acwr > 1.3 ? "#d9534f" : "#5cb85c";

    renderCharts();
}

function calculateACWR() {
    if (dailyLoadData.length < 7) return 1.0;
    const acute = dailyLoadData.slice(-7).reduce((sum, d) => sum + d.load, 0) / 7;
    const chronic = dailyLoadData.slice(-28).reduce((sum, d) => sum + d.load, 0) / 28;
    return chronic > 0 ? (acute / chronic) : 1.0;
}

function renderCharts() {
    // Графік навантаження
    const ctxL = document.getElementById('loadChart').getContext('2d');
    if (loadChart) loadChart.destroy();
    loadChart = new Chart(ctxL, {
        type: 'line',
        data: {
            labels: dailyLoadData.slice(-14).map(d => d.date),
            datasets: [{ label: 'Load', data: dailyLoadData.slice(-14).map(d => d.load), borderColor: '#FFD700', fill: false }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Графік дистанції
    const ctxD = document.getElementById('distanceChart').getContext('2d');
    if (distChart) distChart.destroy();
    distChart = new Chart(ctxD, {
        type: 'bar',
        data: {
            labels: dailyLoadData.slice(-14).map(d => d.date),
            datasets: [{ label: 'Distance (km)', data: dailyLoadData.slice(-14).map(d => d.distance), backgroundColor: '#5cb85c' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
