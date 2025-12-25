// daily-individual.js — ProAtletCare (FIXED VERSION)

// Використовуємо перевірку, щоб не було помилки "Identifier has already been declared"
if (typeof STORAGE_KEY === 'undefined') {
    var STORAGE_KEY = 'weeklyPlanData';
}
var YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

var COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD-1': { status: 'MD-1', colorClass: 'color-yellow' }, 
    'MD-2': { status: 'MD-2', colorClass: 'color-deep-green' }, 
    'MD-3': { status: 'MD-3', colorClass: 'color-orange' }, 
    'MD-4': { status: 'MD-4', colorClass: 'color-blue' }, 
    'REST': { status: 'REST', colorClass: 'color-neutral' }, 
    'TRAIN': { status: 'TRAIN', colorClass: 'color-dark-grey' }, 
};

var MD_RECOMMENDATIONS = {
    'MD': 'Ігровий день. Максимальна концентрація. Успіхів на полі!',
    'MD+1': 'Відновлення. МФР та легка мобільність. Прибираємо набряки.',
    'MD-1': 'Активація нервової системи. Низький об’єм, висока швидкість.',
    'REST': 'ПОВНИЙ ВІДПОЧИНОК. Сон та якісне харчування — основа відновлення.',
    'TRAIN': 'Робочий день. Працюй за планом, фокусуйся на техніці.'
};

// 1. КЕРУВАННЯ АКОРДЕОНОМ
function toggleStage(headerElement) {
    const content = headerElement.nextElementSibling;
    const arrow = headerElement.querySelector('.stage-arrow');
    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block";
        if (arrow) arrow.textContent = "▼";
    } else {
        content.style.display = "none";
        if (arrow) arrow.textContent = "▶";
    }
}

// 2. СТВОРЕННЯ КАРТКИ ВПРАВИ
function createExerciseItemHTML(exercise, index) {
    const uniqueId = `ex-check-${index}`;
    let mediaHtml = exercise.videoKey 
        ? `<div class="media-container"><iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" frameborder="0" allowfullscreen></iframe></div>`
        : `<div class="media-container" style="background:#111; height:150px; display:flex; align-items:center; justify-content:center; color:#444; border:1px solid #333;">Відео в роботі</div>`;

    return `
        <div class="daily-exercise-item" style="border:1px solid #222; margin-bottom:15px; padding:15px; background:#0a0a0a; border-radius:8px;">
            <h4 style="color:#d4af37; margin:0 0 10px 0;">${exercise.name}</h4>
            ${mediaHtml}
            <div style="margin-top:12px; background:#1a1a1a; padding:10px; border-radius:5px; display:flex; align-items:center; gap:12px;">
                <input type="checkbox" id="${uniqueId}" style="width:18px; height:18px;" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.4 : 1">
                <label for="${uniqueId}" style="color:#eee; cursor:pointer; font-size: 0.9rem;">Виконано</label>
            </div>
        </div>
    `;
}

// 3. ФОРМА ЗВОРOTНОГО ЗВ'ЯЗКУ
function renderFeedbackForm() {
    const container = document.getElementById('user-feedback-container');
    if (!container) return;

    container.innerHTML = `
        <div class="pro-feedback-card" style="background:#0a0a0a; border:1px solid #d4af37; border-radius:12px; padding:20px; margin-top:40px;">
            <h3 style="color:#d4af37; text-align:center; text-transform:uppercase; margin-bottom:20px;">📊 Аналіз тренування</h3>
            <div style="margin-bottom:20px; text-align:center;">
                <p style="color:#888; font-size:0.8rem;">СКЛАДНІСТЬ (RPE 1-10):</p>
                <input type="number" id="rpe-input" min="1" max="10" style="width:50px; background:#111; color:#fff; border:1px solid #d4af37; text-align:center;">
            </div>
            <textarea id="user-comment" style="width:100%; height:80px; background:#111; color:#fff; border:1px solid #333; padding:10px; border-radius:8px;" placeholder="Твій коментар..."></textarea>
            <button id="submit-report-btn" onclick="submitDailyReport()" style="width:100%; margin-top:15px; padding:15px; background:#d4af37; color:#000; font-weight:bold; border:none; border-radius:8px; cursor:pointer;">НАДІСЛАТИ ЗВІТ</button>
        </div>
    `;
}

// 4. ОСНОВНА ЛОГІКА
function loadAndDisplayDailyPlan() {
    const todayIndex = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const recContainer = document.getElementById('md-recommendations');

    const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const mdStatus = calculateTodayStatus(savedData, todayIndex);

    if (statusDisplay) {
        statusDisplay.textContent = mdStatus;
        const style = COLOR_MAP[mdStatus] || COLOR_MAP['TRAIN'];
        statusDisplay.className = `md-status ${style.colorClass}`;
    }

    if (recContainer) {
        recContainer.innerHTML = `<p style="color:#d4af37;">${MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN']}</p>`;
    }

    const planKey = `status_plan_${mdStatus}`;
    const plan = savedData[planKey];

    if (!plan || !plan.exercises || plan.exercises.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#555;">На сьогодні вправ немає.</p>';
        renderFeedbackForm();
        return;
    }

    let html = '';
    ['Pre-Training', 'Main Training', 'Post-Training'].forEach(stage => {
        const stageExs = plan.exercises.filter(ex => ex.stage === stage);
        if (stageExs.length > 0) {
            html += `
                <div style="margin-bottom:10px;">
                    <div class="stage-header" onclick="toggleStage(this)" style="background:#1a1a1a; color:#d4af37; padding:12px; cursor:pointer; display:flex; justify-content:space-between; font-weight:bold; border-left:4px solid #444;">
                        <span>${stage.toUpperCase()}</span>
                        <span class="stage-arrow">▶</span>
                    </div>
                    <div class="stage-content" style="display:none; padding-top:10px;">
                        ${stageExs.map((ex, i) => createExerciseItemHTML(ex, `${stage}-${i}`)).join('')}
                    </div>
                </div>`;
        }
    });
    listContainer.innerHTML = html;
    renderFeedbackForm();
}

function calculateTodayStatus(data, todayIdx) {
    if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
    if (data[`activity_${todayIdx}`] === 'MATCH') return 'MD';
    let matchIdx = -1;
    for (let i = 0; i < 7; i++) if (data[`activity_${i}`] === 'MATCH') matchIdx = i;
    if (matchIdx === -1) return 'TRAIN';
    let diff = todayIdx - matchIdx;
    if (diff === 1 || diff === 2) return `MD+${diff}`;
    if (diff >= -4 && diff <= -1) return `MD${diff}`;
    return 'TRAIN';
}

async function submitDailyReport() {
    const rpe = document.getElementById('rpe-input')?.value;
    const comment = document.getElementById('user-comment')?.value;
    if (!rpe) { alert("Вкажіть складність!"); return; }
    try {
        await db.collection("training_reports").add({
            userId: firebase.auth().currentUser.uid,
            rpe: parseInt(rpe),
            comment: comment,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Звіт відправлено!");
    } catch (e) { console.error("Помилка:", e); }
}

// СЛУХАЧ FIREBASE
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        db.collection("weekly_plans").doc(user.uid).onSnapshot((doc) => {
            if (doc.exists) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(doc.data().planData));
                loadAndDisplayDailyPlan();
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', loadAndDisplayDailyPlan);
