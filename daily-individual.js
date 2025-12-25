// daily-individual.js — ProAtletCare (LIBRARY-SYNCED EDITION)

if (typeof STORAGE_KEY === 'undefined') {
    var STORAGE_KEY = 'weeklyPlanData';
}

// ... (інші константи COLOR_MAP та STAGES залишаються) ...

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

        // ДИНАМІЧНЕ ЗАВАНТАЖЕННЯ ПОРАДИ З БІБЛІОТЕКИ
        if (recContainer) {
            // Перевіряємо, чи MD_RECOMMENDATIONS існує в exercise_library.js
            const adviceText = (typeof MD_RECOMMENDATIONS !== 'undefined') 
                ? (MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN'])
                : "Продовжуйте працювати за індивідуальним планом.";

            recContainer.innerHTML = `
                <div style="border-left:4px solid #d4af37; padding:12px; background:#111; margin-bottom:20px; border-radius:4px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                    <p style="margin:0; color:#eee; font-size:0.9rem; line-height:1.4;">
                        <strong style="color:#d4af37; letter-spacing:1px; text-transform:uppercase;">Порада тренера:</strong><br>
                        ${adviceText}
                    </p>
                </div>`;
        }

        // ... (решта логіки рендерингу вправ та форми зворотного зв'язку) ...
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
                        <div class="stage-header" onclick="toggleStage(this)" style="background:#1a1a1a; color:#d4af37; padding:12px; border-left:4px solid #444; cursor:pointer; display:flex; justify-content:space-between; font-weight:bold; font-size:0.8rem; text-transform:uppercase;">
                            <span>${stage}</span>
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

    } catch (e) { console.error("Render Error:", e); }
}

// ... (calculateTodayStatus та DOMContentLoaded залишаються без змін) ...

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
