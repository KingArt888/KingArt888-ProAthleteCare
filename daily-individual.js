// daily-individual.js — ProAtletCare (PREMIUM ANALYTICS EDITION)
const STORAGE_KEY = 'weeklyPlanData';
const REPORTS_KEY = 'athleteTrainingReports';
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
    'MD': 'Ігровий день. Максимальна концентрація. Успіхів на полі!',
    'MD+1': 'Відновлення. МФР та легка мобільність. Прибираємо набряки.',
    'MD-1': 'Активація нервової системи. Низький об’єм, висока швидкість.',
    'REST': 'ПОВНИЙ ВІДПОЧИНОК. Сон та якісне харчування — основа відновлення.',
    'TRAIN': 'Робочий день. Працюй за планом, фокусуйся на техніці.'
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

// 3. ФОРМА З БЛИСКАВКАМИ ТА ЗІРКАМИ
function renderFeedbackForm() {
    const container = document.getElementById('user-feedback-container');
    if (!container) return;

    container.innerHTML = `
        <div class="pro-feedback-card" style="background:#0a0a0a; border:1px solid #d4af37; border-radius:12px; padding:20px; margin-top:40px;">
            <div style="text-align:center; margin-bottom:20px;">
                <h3 style="color:#d4af37; text-transform:uppercase; letter-spacing:1px; margin:0; font-size:1.1rem;">📊 Аналіз тренування</h3>
            </div>

            <div class="feedback-section" style="margin-bottom:25px; text-align:center;">
                <label style="color:#888; display:block; margin-bottom:10px; font-size:0.75rem; text-transform:uppercase;">Складність (RPE 1-10):</label>
                <div class="lightning-row" style="display:flex; justify-content:center; gap:5px;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                        <div class="lightning-item">
                            <span style="display:block; color:#555; font-size:9px; margin-bottom:2px;">${n}</span>
                            <input type="radio" name="rpe" value="${n}" id="bolt-${n}" style="display:none;">
                            <label for="bolt-${n}" class="bolt-label" style="cursor:pointer; font-size:24px; color:#222; transition:0.3s;">⚡</label>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="feedback-section" style="margin-bottom:25px; text-align:center;">
                <label style="color:#888; display:block; margin-bottom:10px; font-size:0.75rem; text-transform:uppercase;">Задоволення / Якість тренування:</label>
                <div class="star-row" style="display:flex; justify-content:center; gap:8px;">
                    ${[1,2,3,4,5].map(n => `
                        <div class="star-item">
                            <input type="radio" name="quality" value="${n}" id="star-${n}" style="display:none;">
                            <label for="star-${n}" class="star-label" style="cursor:pointer; font-size:28px; color:#222; transition:0.3s;">★</label>
                        </div>
                    `).join('')}
                </div>
            </div>

            <textarea id="user-comment" style="width:100%; height:70px; background:#111; color:#fff; border:1px solid #333; border-radius:8px; padding:12px; box-sizing:border-box; resize:none; font-family:inherit;" placeholder="Коментар для Артема..."></textarea>

            <button id="submit-report-btn" onclick="submitDailyReport()" style="width:100%; margin-top:15px; padding:15px; background:#d4af37; color:#000; border:none; border-radius:8px; font-weight:900; text-transform:uppercase; cursor:pointer;">Надіслати звіт тренеру</button>
        </div>

        <style>
            /* RPE Lightning Effect */
            .lightning-item input:checked ~ label,
            .lightning-item label:hover,
            .lightning-item:has(~ .lightning-item input:checked) label {
                color: #d4af37 !important;
                text-shadow: 0 0 10px #d4af37;
            }

            /* Stars Quality Effect */
            .star-item input:checked ~ label,
            .star-item label:hover,
            .star-item:has(~ .star-item input:checked) label {
                color: #f1c40f !important;
                text-shadow: 0 0 10px #f1c40f;
            }

            .bolt-label:hover, .star-label:hover { transform: scale(1.3); }
        </style>
    `;
}

// ФУНКЦІЯ ЗБЕРЕЖЕННЯ
async function submitDailyReport() {
    const rpe = document.querySelector('input[name="rpe"]:checked')?.value;
    const quality = document.querySelector('input[name="quality"]:checked')?.value;
    const comment = document.getElementById('user-comment').value;
    const status = document.getElementById('md-status-display')?.textContent;

    if (!rpe || !quality) {
        alert("Оберіть блискавки ⚡ та зірки ★!");
        return;
    }

    const reportData = {
        athleteName: "Artem Test", // Потім замінимо на динамічне ім'я
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        rpe: parseInt(rpe),
        quality: parseInt(quality),
        comment: comment,
        mdStatus: status
    };

    try {
        // Записуємо в Firebase в колекцію "training_reports"
        await db.collection("training_reports").add(reportData);
        
        const btn = document.getElementById('submit-report-btn');
        btn.style.background = "#2ecc71";
        btn.innerHTML = "✅ ВІДПРАВЛЕНО В ХМАРУ";
        btn.disabled = true;
        
        alert("Артеме, звіт успішно збережено в Firebase!");
    } catch (error) {
        console.error("Помилка Firebase: ", error);
        alert("Помилка при збереженні. Перевір консоль.");
    }
}

// 4. ОСНОВНА ЛОГІКА ЗАВАНТАЖЕННЯ (MD ТА ПЛАН)
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
            const style = COLOR_MAP[mdStatus] || COLOR_MAP['TRAIN'];
            statusDisplay.className = `md-status ${style.colorClass}`;
        }

        if (recContainer) {
            recContainer.innerHTML = `<div style="border-left:3px solid #d4af37; padding:10px; background:#111;"><p style="margin:0; color:#eee; font-size:0.85rem;"><strong>Порада Кулика:</strong> ${MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN']}</p></div>`;
        }

        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = '<p style="text-align:center; color:#555; padding:30px; border:1px dashed #333;">На сьогодні вправ немає.</p>';
            renderFeedbackForm();
            return;
        }

        let html = '';
        STAGES.forEach(stage => {
            const stageExs = plan.exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                    <div style="margin-bottom:10px;">
                        <div class="stage-header" onclick="toggleStage(this)" style="background:#1a1a1a; color:#d4af37; padding:12px; border-left:4px solid #444; cursor:pointer; display:flex; justify-content:space-between; font-weight:bold; font-size:0.8rem;">
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

    } catch (e) { console.error(e); }
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
