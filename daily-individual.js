// daily-individual.js — ProAtletCare (FINAL PROFESSIONAL EDITION)
const STORAGE_KEY = 'weeklyPlanData';
const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

const COLOR_MAP = {
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

const MD_RECOMMENDATIONS = {
    'MD': 'Ігровий день. Максимальна концентрація. Харчування за 3-4 години до матчу. Успіхів на полі!',
    'MD+1': 'Відновлення. МФР та легка мобільність. Завдання — прибрати набряки та відновити м’язи.',
    'MD-1': 'Активація нервової системи. Низький об’єм, висока швидкість. Фокус на реакції.',
    'REST': 'ПОВНИЙ ВІДПОЧИНОК. Сон 8+ годин та якісне харчування — твоє головне тренування.',
    'TRAIN': 'Робочий день. Дотримуйтесь техніки виконання вправ за планом.'
};

const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];

// 1. УПРАВЛІННЯ АКОРДЕОНОМ
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

// 2. СТВОРЕННЯ КАРТКИ ВПРАВИ
function createExerciseItemHTML(exercise, index) {
    const uniqueId = `ex-check-${index}`;
    let mediaHtml = exercise.videoKey 
        ? `<div class="media-container"><iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" frameborder="0" allowfullscreen></iframe></div>`
        : `<div class="media-container" style="background:#111; height:150px; display:flex; align-items:center; justify-content:center; color:#444; border:1px solid #333;">Відео додається</div>`;

    return `
        <div class="daily-exercise-item" style="border:1px solid #222; margin-bottom:15px; padding:15px; background:#0a0a0a; border-radius:8px;">
            <h4 style="color:#d4af37; margin:0 0 10px 0; font-size:1.1rem;">${exercise.name}</h4>
            <p style="color:#999; font-size:0.85rem; margin-bottom:12px;">${exercise.description || ''}</p>
            ${mediaHtml}
            <div style="margin-top:12px; background:#1a1a1a; padding:10px; border-radius:5px; display:flex; align-items:center; gap:12px;">
                <input type="checkbox" id="${uniqueId}" style="width:18px; height:18px; cursor:pointer;" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.4 : 1">
                <label for="${uniqueId}" style="color:#eee; cursor:pointer; font-size:0.9rem;">Вправу виконано</label>
            </div>
        </div>
    `;
}

// 3. ПРЕМІАЛЬНА ФОРМА ЗВОРОТНОГО ЗВ'ЯЗКУ
function renderFeedbackForm() {
    const container = document.getElementById('user-feedback-container');
    if (!container) return;

    container.innerHTML = `
        <div class="pro-feedback-card" style="background:#111; border:1px solid #d4af37; border-radius:12px; padding:25px; margin-top:40px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="text-align:center; margin-bottom:20px;">
                <h3 style="color:#d4af37; text-transform:uppercase; letter-spacing:2px; margin:0;">📊 Звіт Тренеру</h3>
                <p style="color:#666; font-size:0.8rem; margin-top:5px;">Аналіз навантаження для Кулика Артема</p>
            </div>

            <label style="color:#eee; display:block; text-align:center; margin-bottom:15px; font-weight:bold;">Оцінка складності (RPE 1-10):</label>
            <div class="rpe-grid" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px; margin-bottom:25px;">
                ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                    <div class="rpe-item">
                        <input type="radio" name="rpe" value="${n}" id="rpe-${n}" style="display:none;">
                        <label for="rpe-${n}" style="display:flex; align-items:center; justify-content:center; height:40px; background:#222; border:1px solid #333; color:#fff; border-radius:5px; cursor:pointer; font-weight:bold; transition:0.3s;">${n}</label>
                    </div>
                `).join('')}
            </div>

            <label style="color:#eee; display:block; margin-bottom:8px; font-weight:bold;">Коментар тренеру / Пропозиції:</label>
            <textarea id="user-comment" style="width:100%; height:90px; background:#1a1a1a; color:#fff; border:1px solid #333; border-radius:8px; padding:12px; box-sizing:border-box; resize:none; font-family:inherit;" placeholder="Як самопочуття? Що було найважчим?"></textarea>

            <button onclick="submitDailyReport()" style="width:100%; margin-top:20px; padding:15px; background:#d4af37; color:#000; border:none; border-radius:8px; font-weight:bold; text-transform:uppercase; cursor:pointer; transition:0.3s;">Надіслати звіт тренеру</button>
        </div>

        <style>
            .rpe-item input:checked + label { background:#d4af37 !important; color:#000 !important; transform:scale(1.05); }
            .rpe-item label:hover { border-color:#d4af37; }
            #user-comment:focus { border-color:#d4af37; outline:none; }
        </style>
    `;
}

function submitDailyReport() {
    const rpe = document.querySelector('input[name="rpe"]:checked')?.value;
    const comment = document.getElementById('user-comment').value;
    if (!rpe) { alert("Будь ласка, оберіть RPE (складність)!"); return; }
    
    // Емуляція відправки
    console.log("SENDING TO ARTEM KULYK:", { rpe, comment });
    alert("Звіт успішно надіслано тренеру Артему Кулику!");
}

// 4. ОСНОВНА ЛОГІКА ЗАВАНТАЖЕННЯ
function loadAndDisplayDailyPlan() {
    const todayIndex = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const recommendationContainer = document.getElementById('md-recommendations');

    try {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const mdStatus = calculateTodayStatus(savedData, todayIndex);

        if (statusDisplay) {
            statusDisplay.textContent = mdStatus;
            const style = COLOR_MAP[mdStatus] || COLOR_MAP['TRAIN'];
            statusDisplay.className = `md-status ${style.colorClass}`;
        }

        if (recommendationContainer) {
            const rec = MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN'];
            recommendationContainer.innerHTML = `
                <div style="border-left:4px solid #d4af37; padding:10px 15px; background:#1a1a1a; border-radius:0 8px 8px 0;">
                    <h4 style="color:#d4af37; margin:0 0 5px 0; font-size:0.9rem;">ПОРАДА ТРЕНЕРА:</h4>
                    <p style="margin:0; color:#eee; font-style:italic;">${rec}</p>
                </div>`;
        }

        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; color:#666; padding:40px; border:1px dashed #444;">План на сьогодні не заповнений в системі.</div>';
            renderFeedbackForm();
            return;
        }

        let html = '';
        STAGES.forEach(stage => {
            const stageExs = plan.exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                    <div class="stage-wrapper" style="margin-bottom:12px;">
                        <div class="stage-header" onclick="toggleStage(this)" style="background:#1a1a1a; color:#d4af37; padding:15px; border-left:4px solid #444; cursor:pointer; display:flex; justify-content:space-between; font-weight:bold; text-transform:uppercase; font-size:0.8rem;">
                            <span>${stage.replace('-', ' ')}</span>
                            <span class="stage-arrow">▶</span>
                        </div>
                        <div class="stage-content" style="display:none; padding:15px 0 5px 0;">
                            ${stageExs.map((ex, i) => createExerciseItemHTML(ex, `${stage}-${i}`)).join('')}
                        </div>
                    </div>`;
            }
        });

        listContainer.innerHTML = html;
        renderFeedbackForm();

    } catch (e) {
        console.error("ERROR:", e);
    }
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
