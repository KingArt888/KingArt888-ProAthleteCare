// daily-individual.js — ProAtletCare
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
    'MD': 'Ігровий день. Харчування за 3-4 години до матчу. Успіхів!',
    'MD+1': 'Відновлення. МФР та легка мобільність. Прибираємо набряки.',
    'MD-1': 'Активація нервової системи. Низький об’єм, висока швидкість.',
    'REST': 'ПОВНИЙ ВІДПОЧИНОК. Сон та якісне харчування.',
    'TRAIN': 'Робочий день. Дотримуйтесь техніки виконання.'
};

const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];

// 1. Управління акордеоном
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

// 2. Функція створення вправи
function createExerciseItemHTML(exercise, index) {
    const uniqueId = `ex-check-${index}`;
    let mediaHtml = exercise.videoKey 
        ? `<iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" frameborder="0" allowfullscreen></iframe>`
        : `<div style="height:180px; background:#111; border:1px solid #333; display:flex; align-items:center; justify-content:center; color:#444;">Відео відсутнє</div>`;

    return `
        <div class="daily-exercise-item" style="border:1px solid #333; margin-bottom:10px; padding:15px; background:#0a0a0a;">
            <h4 style="color:#d4af37; margin:0 0 10px 0;">${exercise.name}</h4>
            <div class="media-container">${mediaHtml}</div>
            <div style="margin-top:10px; color:#fff; display:flex; align-items:center; gap:10px;">
                <input type="checkbox" id="${uniqueId}" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.5 : 1">
                <label for="${uniqueId}">Виконано</label>
            </div>
        </div>
    `;
}

// 3. ФОРМА ЗВОРОТНОГО ЗВ'ЯЗКУ
function renderFeedbackForm() {
    const container = document.getElementById('user-feedback-container');
    if (!container) return;

    container.innerHTML = `
        <div class="feedback-block" style="background:#1a1a1a; padding:20px; border:1px solid #d4af37; margin-top:30px;">
            <h3 style="color:#d4af37; margin-top:0;">📊 Звіт про тренування</h3>
            
            <div style="margin-bottom:15px;">
                <label style="color:#eee; display:block; margin-bottom:10px;">Оцініть складність (RPE 1-10):</label>
                <div style="display:flex; justify-content:space-between; color:#d4af37; font-weight:bold;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                        <label style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
                            <span style="font-size:0.8rem;">${n}</span>
                            <input type="radio" name="rpe" value="${n}" style="margin-top:5px;">
                        </label>
                    `).join('')}
                </div>
            </div>

            <div style="margin-bottom:15px;">
                <label style="color:#eee; display:block; margin-bottom:5px;">Коментар тренеру / Пропозиції:</label>
                <textarea id="user-comment" style="width:100%; height:80px; background:#333; color:#fff; border:1px solid #444; padding:10px; box-sizing:border-box;" placeholder="Як ви себе почуваєте? Що було складно?"></textarea>
            </div>

            <button onclick="submitDailyReport()" class="gold-button" style="width:100%; padding:12px; font-weight:bold; cursor:pointer;">
                ВІДПРАВИТИ ЗВІТ
            </button>
        </div>
    `;
}

function submitDailyReport() {
    const rpe = document.querySelector('input[name="rpe"]:checked')?.value;
    const comment = document.getElementById('user-comment').value;
    
    if(!rpe) {
        alert("Будь ласка, оберіть рівень складності (RPE)");
        return;
    }

    // Тут у майбутньому буде відправка на сервер/пошту
    console.log("Звіт:", { rpe, comment, date: new Date().toLocaleDateString() });
    alert("Дякуємо! Твій звіт збережено. Продовжуй у тому ж дусі!");
}

// 4. Основна логіка завантаження
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
            recommendationContainer.innerHTML = `<p><strong>💡 Порада:</strong> ${MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN']}</p>`;
        }

        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = '<p style="color:#888; text-align:center; padding:20px; border:1px dashed #444;">План на сьогодні не створено у Weekly Plan.</p>';
            renderFeedbackForm();
            return;
        }

        let finalHtml = '';
        STAGES.forEach(stage => {
            const stageExs = plan.exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                finalHtml += `
                    <div style="margin-bottom:10px;">
                        <div class="stage-header" onclick="toggleStage(this)" style="background:#1a1a1a; color:#d4af37; padding:15px; border-left:4px solid #444; cursor:pointer; display:flex; justify-content:space-between; font-weight:bold;">
                            <span>${stage.toUpperCase()}</span>
                            <span class="stage-arrow">▶</span>
                        </div>
                        <div class="stage-content" style="display:none; padding-top:10px;">
                            ${stageExs.map((ex, i) => createExerciseItemHTML(ex, `${stage}-${i}`)).join('')}
                        </div>
                    </div>`;
            }
        });
        listContainer.innerHTML = finalHtml;
        renderFeedbackForm(); // Рендеримо форму після вправ

    } catch (e) {
        console.error(e);
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
