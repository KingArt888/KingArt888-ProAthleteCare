// daily-individual.js — ProAtletCare (FIXED & INTEGRATED)

// 1. БЕЗПЕЧНЕ ВИКОРИСТАННЯ ГЛОБАЛЬНИХ ЗМІННИХ
// Використовуємо існуючі змінні, щоб не було SyntaxError (як на скріншоті)
if (typeof STORAGE_KEY === 'undefined') {
    var STORAGE_KEY = 'weeklyPlanData';
}

// Використовуємо db, яку ви оголосили в HTML
var dailyDb = (typeof db !== 'undefined') ? db : firebase.firestore();

var REPORTS_KEY = 'athleteTrainingReports';
var YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];

// Резервна мапа кольорів
const DAILY_COLORS = {
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

// 2. УПРАВЛІННЯ АКОРДЕОНОМ
function toggleStage(headerElement) {
    const content = headerElement.nextElementSibling;
    const arrow = headerElement.querySelector('.stage-arrow');
    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block";
        if (arrow) arrow.textContent = "▼";
        headerElement.style.borderLeftColor = "#d4af37";
    } else {
        content.style.display = "none";
        if (arrow) arrow.textContent = "▶";
        headerElement.style.borderLeftColor = "#444";
    }
}

// 3. ГЕНЕРАЦІЯ HTML ВПРАВ
function createExerciseItemHTML(exercise, index) {
    const uniqueId = `ex-check-${index}`;
    let mediaHtml = exercise.videoKey 
        ? `<div class="media-container"><iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" frameborder="0" allowfullscreen></iframe></div>`
        : `<div class="media-container" style="background:#111; height:150px; display:flex; align-items:center; justify-content:center; color:#444; border:1px solid #333;">Відео відсутнє</div>`;

    return `
        <div class="daily-exercise-item" style="border:1px solid #222; margin-bottom:15px; padding:15px; background:#0a0a0a; border-radius:8px;">
            <h4 style="color:#d4af37; margin:0 0 10px 0;">${exercise.name}</h4>
            ${mediaHtml}
            <div style="margin-top:12px; background:#1a1a1a; padding:10px; border-radius:5px; display:flex; align-items:center; gap:12px;">
                <input type="checkbox" id="${uniqueId}" style="width:18px; height:18px;" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.4 : 1">
                <label for="${uniqueId}" style="color:#eee; cursor:pointer;">Виконано</label>
            </div>
        </div>
    `;
}

// 4. ФОРМА ЗВІТУ (RPE ТА QUALITY)
function renderFeedbackForm() {
    const container = document.getElementById('user-feedback-container');
    if (!container) return;

    container.innerHTML = `
        <div class="pro-feedback-card" style="background:#0a0a0a; border:1px solid #d4af37; border-radius:12px; padding:20px; margin-top:40px;">
            <h3 style="color:#d4af37; text-align:center; text-transform:uppercase; font-size:1rem; letter-spacing:1px;">📊 Аналіз тренування</h3>
            
            <div style="margin:25px 0; text-align:center;">
                <label style="color:#888; display:block; margin-bottom:10px; font-size:0.75rem; text-transform:uppercase;">Навантаження RPE ⚡ (1-10):</label>
                <div style="display:flex; justify-content:center; gap:5px; flex-wrap:wrap;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                        <button onclick="window.setDailyRpe(${n})" class="rpe-bolt" id="btn-rpe-${n}">⚡</button>
                    `).join('')}
                </div>
            </div>

            <textarea id="coach-comment" style="width:100%; height:70px; background:#111; color:#fff; border:1px solid #333; border-radius:8px; padding:12px; margin-bottom:15px;" placeholder="Коментар для Артема..."></textarea>
            
            <button id="send-report-btn" onclick="sendDailyReportToFirebase()" style="width:100%; padding:15px; background:#d4af37; color:#000; border:none; border-radius:8px; font-weight:900; text-transform:uppercase; cursor:pointer;">Надіслати звіт</button>
        </div>
        <style>
            .rpe-bolt { background: #222; border: none; font-size: 20px; cursor: pointer; color: #333; transition: 0.3s; padding: 5px; border-radius: 4px; }
            .rpe-bolt.active { color: #d4af37; text-shadow: 0 0 10px #d4af37; transform: scale(1.2); }
        </style>
    `;
}

let selectedRpeValue = 0;
window.setDailyRpe = (n) => {
    selectedRpeValue = n;
    document.querySelectorAll('.rpe-bolt').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-rpe-${n}`).classList.add('active');
};

// 5. ВІДПРАВКА В FIREBASE
async function sendDailyReportToFirebase() {
    if (selectedRpeValue === 0) { alert("Будь ласка, оберіть RPE ⚡"); return; }
    
    const btn = document.getElementById('send-report-btn');
    const comment = document.getElementById('coach-comment').value;

    try {
        await dailyDb.collection("training_reports").add({
            date: new Date().toISOString().split('T')[0],
            rpe: selectedRpeValue,
            comment: comment,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        btn.style.background = "#2ecc71";
        btn.innerHTML = "✅ ВІДПРАВЛЕНО";
        btn.disabled = true;
    } catch (e) {
        console.error("Firebase Error:", e);
        alert("Помилка при відправці");
    }
}

// 6. ГОЛОВНЕ ЗАВАНТАЖЕННЯ ПЛАНУ
function loadAndDisplayDailyPlan() {
    const todayIndex = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const recContainer = document.getElementById('md-recommendations');

    try {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const mdStatus = calculateTodayStatus(savedData, todayIndex);

        if (statusDisplay) {
            statusDisplay.textContent = mdStatus;
            const colors = (typeof COLOR_MAP !== 'undefined') ? COLOR_MAP : DAILY_COLORS;
            const style = colors[mdStatus] || colors['TRAIN'];
            statusDisplay.className = `md-status ${style.colorClass}`;
        }

        if (recContainer) {
            const recommendations = (typeof MD_RECOMMENDATIONS !== 'undefined') ? MD_RECOMMENDATIONS : {};
            const advice = recommendations[mdStatus] || "Працюй згідно з індивідуальними налаштуваннями.";
            recContainer.innerHTML = `
                <div style="border-left:4px solid #d4af37; padding:12px; background:#111; margin-bottom:20px; border-radius:4px;">
                    <p style="margin:0; color:#eee; font-size:0.9rem;">
                        <strong style="color:#d4af37; text-transform:uppercase; font-size:0.7rem;">Порада тренера:</strong><br>${advice}
                    </p>
                </div>`;
        }

        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; color:#555; padding:30px;">Сьогодні за розкладом вправи не заплановані.</p>';
            renderFeedbackForm();
            return;
        }

        let html = '';
        STAGES.forEach(stage => {
            const stageExs = plan.exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                    <div style="margin-bottom:12px;">
                        <div class="stage-header" onclick="toggleStage(this)" style="background:#1a1a1a; color:#d4af37; padding:15px; border-left:4px solid #444; cursor:pointer; display:flex; justify-content:space-between; font-weight:bold; font-size:0.85rem; text-transform:uppercase;">
                            <span>${stage}</span><span class="stage-arrow">▶</span>
                        </div>
                        <div class="stage-content" style="display:none; padding-top:10px;">
                            ${stageExs.map((ex, i) => createExerciseItemHTML(ex, `${stage}-${i}`)).join('')}
                        </div>
                    </div>`;
            }
        });

        listContainer.innerHTML = html;
        renderFeedbackForm();

    } catch (e) { console.error("Load Error:", e); }
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

document.addEventListener('DOMContentLoaded', loadAndDisplayDailyPlan);
