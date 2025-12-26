// load-season.js
let dailyLoadData = [];
let loadChart = null;

// ФУНКЦІЯ ПЕРЕРАХУНКУ ACWR ТА ОНОВЛЕННЯ ШКАЛИ
function updateACWRVisualization(acwr) {
    const marker = document.getElementById('acwr-marker');
    const valueDisplay = document.getElementById('acwr-value');
    const statusDisplay = document.getElementById('acwr-status');

    valueDisplay.textContent = acwr.toFixed(2);

    // Розрахунок позиції маркера (0.0 - 2.0 = 0% - 100%)
    let percent = (acwr / 2.0) * 100;
    if (percent > 100) percent = 100;
    marker.style.left = `${percent}%`;

    // Статуси
    statusDisplay.className = '';
    if (acwr < 0.8) {
        statusDisplay.textContent = "Underloading (Відновлення)";
        statusDisplay.classList.add('status-warn');
    } else if (acwr <= 1.3) {
        statusDisplay.textContent = "Sweet Spot (Оптимально)";
        statusDisplay.classList.add('status-safe');
    } else {
        statusDisplay.textContent = "High Risk (Перевантаження)";
        statusDisplay.classList.add('status-danger');
    }
}

// ЗАВАНТАЖЕННЯ ДАНИХ З FIREBASE (Real-time)
function initFirebaseData() {
    const q = window.fb.query(window.fb.collection(window.fb.db, "dailyLoad"), window.fb.orderBy("date", "asc"));
    
    window.fb.onSnapshot(q, (snapshot) => {
        dailyLoadData = [];
        snapshot.forEach((doc) => {
            dailyLoadData.push(doc.data());
        });
        
        // Після отримання даних оновлюємо все
        calculateAndRender();
    });
}

// ЗБЕРЕЖЕННЯ В FIREBASE
async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const status = document.getElementById('form-status');

    const entry = {
        date: form.elements['date'].value,
        duration: parseInt(form.elements['duration'].value),
        distance: parseFloat(form.elements['distance'].value),
        rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 5),
        load: parseInt(form.elements['duration'].value) * parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 5)
    };

    try {
        await window.fb.addDoc(window.fb.collection(window.fb.db, "dailyLoad"), entry);
        form.reset();
        status.textContent = "Успішно збережено в хмару!";
        status.style.color = "#4CAF50";
    } catch (err) {
        status.textContent = "Помилка Firebase: " + err.message;
        status.style.color = "#D9534F";
    }
}

// МАТЕМАТИКА ТА ГРАФІКИ
function calculateAndRender() {
    if (dailyLoadData.length === 0) return;

    // Розрахунок останнього ACWR (спрощено для прикладу)
    // В реальності тут має бути формула Acute (7 днів) / Chronic (28 днів)
    const totalLoad = dailyLoadData.reduce((sum, item) => sum + item.load, 0);
    const avgLoad = totalLoad / dailyLoadData.length;
    const currentACWR = dailyLoadData[dailyLoadData.length-1].load / (avgLoad || 1);

    updateACWRVisualization(currentACWR);
    renderCharts();
}

function renderCharts() {
    const ctx = document.getElementById('loadChart').getContext('2d');
    if (loadChart) loadChart.destroy();

    loadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyLoadData.map(d => d.date),
            datasets: [{
                label: 'Session Load',
                data: dailyLoadData.map(d => d.load),
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                fill: true
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initFirebaseData();
    document.getElementById('load-entry-form').addEventListener('submit', handleFormSubmit);
});
