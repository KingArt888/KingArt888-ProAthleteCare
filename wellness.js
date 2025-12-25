// ==============================================
// --- ДОПОМІЖНІ ФУНКЦІЇ ---
// ==============================================

function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ==============================================
// --- ФУНКЦІЇ ДЛЯ РОБОТИ З FIREBASE (WELLNESS) ---
// ==============================================
const WELLNESS_COLLECTION = 'wellness_reports';
const CURRENT_ATHLETE_ID = 'Artem_Kulyk_Test'; 

async function loadWellnessHistoryFromFirebase() {
    const history = {};
    try {
        // Запит до Firebase
        const snapshot = await db.collection(WELLNESS_COLLECTION)
            .where("athleteId", "==", CURRENT_ATHLETE_ID)
            .orderBy("date", "asc")
            .get();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.date && data.scores) {
                history[data.date] = data.scores;
            }
        });
    } catch (error) {
        console.error("Помилка завантаження Wellness з Firebase:", error);
    }
    return history;
}

async function saveWellnessToFirebase(date, scores) {
    try {
        await db.collection(WELLNESS_COLLECTION).add({
            athleteId: CURRENT_ATHLETE_ID,
            date: date,
            scores: scores,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ Wellness збережено в Firebase");
    } catch (error) {
        console.error("❌ Помилка збереження в Firebase:", error);
    }
}

// ==============================================
// 1. КОНСТАНТИ СТИЛЮ
// ==============================================
const GOLD_COLOR = 'rgb(255, 215, 0)', GOLD_AREA = 'rgba(255, 215, 0, 0.4)';
const RED_COLOR = 'rgb(255, 99, 132)', RED_AREA = 'rgba(255, 99, 132, 0.4)';
const ORANGE_COLOR = 'rgb(255, 159, 64)', ORANGE_AREA = 'rgba(255, 159, 64, 0.4)';
const BLUE_COLOR = 'rgb(0, 191, 255)', BLUE_AREA = 'rgba(0, 191, 255, 0.4)';
const PURPLE_COLOR = 'rgb(147, 112, 219)', PURPLE_AREA = 'rgba(147, 112, 219, 0.4)';
const LIME_COLOR = 'rgb(50, 205, 50)', LIME_AREA = 'rgba(50, 205, 50, 0.4)';
const GREY_GRID = '#CCCCCC';

const WELLNESS_FIELDS = ['sleep', 'soreness', 'mood', 'water', 'stress', 'ready'];
const FIELD_LABELS = { sleep: 'Сон', soreness: 'Біль', mood: 'Настрій', water: 'Гідратація', stress: 'Стрес', ready: 'Готовність' };

const colorsMap = {
    sleep: { color: GOLD_COLOR, area: GOLD_AREA },
    soreness: { color: RED_COLOR, area: RED_AREA },
    mood: { color: PURPLE_COLOR, area: PURPLE_AREA },
    water: { color: BLUE_COLOR, area: BLUE_AREA },
    stress: { color: ORANGE_COLOR, area: ORANGE_AREA },
    ready: { color: LIME_COLOR, area: LIME_AREA },
};

function updateWellnessStats(latestData) {
    WELLNESS_FIELDS.forEach(field => {
        const statElement = document.getElementById(`stat-${field}`);
        if (statElement) {
            const score = latestData ? (latestData[field] || 0) : 0;
            statElement.textContent = `Оцінка: ${score} / 10`;
        }
    });
}

// ==============================================
// 3. ІНІЦІАЛІЗАЦІЯ ГРАФІКІВ
// ==============================================
async function initCharts() {
    const history = await loadWellnessHistoryFromFirebase();
    const sortedDates = Object.keys(history).sort();

    // Очищення старих графіків
    WELLNESS_FIELDS.forEach(field => {
        if (window[`chart_${field}`] instanceof Chart) {
            window[`chart_${field}`].destroy();
        }
    });
    if (window.wellnessChart instanceof Chart) {
        window.wellnessChart.destroy();
    }

    if (sortedDates.length === 0) {
        updateWellnessStats({});
        return;
    }

    const chartLabels = sortedDates.map(date => date.split('-').slice(1).join('/'));
    const chartData = {};
    WELLNESS_FIELDS.forEach(field => {
        chartData[field] = sortedDates.map(date => history[date][field]);
    });

    // Створення міні-графіків
    WELLNESS_FIELDS.forEach(field => {
        const ctx = document.getElementById(`chart-${field}`);
        if (ctx) {
            window[`chart_${field}`] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartData[field],
                        borderColor: colorsMap[field].color,
                        backgroundColor: colorsMap[field].area,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { min: 1, max: 10, ticks: { stepSize: 1 } },
                        x: { display: false }
                    }
                }
            });
        }
    });

    // Радар-графік
    const mainCtx = document.getElementById('wellnessChart');
    if (mainCtx) {
        const latestData = history[sortedDates[sortedDates.length - 1]];
        updateWellnessStats(latestData);
        window.wellnessChart = new Chart(mainCtx, {
            type: 'radar',
            data: {
                labels: Object.values(FIELD_LABELS),
                datasets: [{
                    label: 'Стан сьогодні',
                    data: WELLNESS_FIELDS.map(f => latestData[f]),
                    backgroundColor: GOLD_AREA,
                    borderColor: GOLD_COLOR
                }]
            },
            options: {
                scales: { r: { min: 0, max: 10, ticks: { display: false } } },
                plugins: { legend: { labels: { color: 'white' } } }
            }
        });
    }
}

// ==============================================
// 4. ОБМЕЖЕННЯ ТА ОБРОБКА ФОРМИ
// ==============================================
function checkDailyRestriction() {
    const lastDate = localStorage.getItem('lastWellnessSubmissionDate');
    const today = getTodayDateString();
    if (lastDate === today) {
        const btn = document.querySelector('.gold-button');
        if (btn) {
            btn.disabled = true;
            btn.textContent = "На сьогодні все!";
            btn.style.opacity = "0.5";
        }
        return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', async () => {
    await initCharts();
    checkDailyRestriction();

    const form = document.getElementById('wellness-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (checkDailyRestriction()) return;

            const submissionData = {};
            let allFilled = true;
            WELLNESS_FIELDS.forEach(field => {
                const val = form.querySelector(`input[name="${field}"]:checked`)?.value;
                if (!val) allFilled = false;
                submissionData[field] = parseInt(val);
            });

            if (!allFilled) {
                alert("Заповніть усі поля!");
                return;
            }

            const today = getTodayDateString();
            await saveWellnessToFirebase(today, submissionData);
            localStorage.setItem('lastWellnessSubmissionDate', today);
            
            alert("Дані збережено!");
            location.reload(); // Перезавантажуємо для оновлення графіків
        });
    }
});
