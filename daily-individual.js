// daily-individual.js — ProAtletCare (FIREBASE SYNC VERSION)

// Використовуємо db з вашого firebase-config.js
var dailyDb = (typeof db !== 'undefined') ? db : firebase.firestore();

async function loadDailyPlanFromFirebase() {
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    
    // В реальному проекті тут має бути ID атлета. Поки беремо загальний 'default_plan'
    // або ID авторизованого користувача
    const planId = "current_weekly_plan"; 

    try {
        const doc = await dailyDb.collection('weekly_plans').doc(planId).get();
        
        if (!doc.exists) {
            listContainer.innerHTML = '<p style="text-align:center; color:#888;">План ще не опублікований тренером у Firebase.</p>';
            return;
        }

        const savedData = doc.data();
        const todayIndex = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
        
        // Визначаємо статус дня (MD, TRAIN тощо)
        const mdStatus = calculateTodayStatus(savedData, todayIndex);

        if (statusDisplay) {
            statusDisplay.textContent = mdStatus;
            const style = (typeof DAILY_COLORS !== 'undefined') ? DAILY_COLORS[mdStatus] : { colorClass: 'color-dark-grey' };
            statusDisplay.className = `md-status ${style.colorClass}`;
        }

        const planKey = `status_plan_${mdStatus}`;
        const plan = savedData[planKey];

        if (!plan || !plan.exercises || plan.exercises.length === 0) {
            listContainer.innerHTML = `<p style="text-align:center; color:#555; padding:30px;">На сьогодні (${mdStatus}) вправи не заплановані.</p>`;
        } else {
            renderDailyExercises(plan.exercises, listContainer);
        }

        if (typeof renderFeedbackForm === 'function') renderFeedbackForm();

    } catch (e) {
        console.error("Firebase Load Error:", e);
        listContainer.innerHTML = '<p style="color:red; text-align:center;">Помилка синхронізації з базою даних.</p>';
    }
}

function renderDailyExercises(exercises, container) {
    const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];
    let html = '';
    
    STAGES.forEach(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
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
    container.innerHTML = html;
}

// Функція розрахунку статусу (виправлена під Firebase дані)
function calculateTodayStatus(data, todayIdx) {
    if (data[`day_${todayIdx}`] === 'REST') return 'REST';
    if (data[`day_${todayIdx}`] === 'MATCH') return 'MD';
    let matchIdx = -1;
    for (let i = 0; i < 7; i++) if (data[`day_${i}`] === 'MATCH') matchIdx = i;
    if (matchIdx === -1) return 'TRAIN';
    let diff = todayIdx - matchIdx;
    if (diff === 1 || diff === 2) return `MD+${diff}`;
    if (diff >= -4 && diff <= -1) return `MD${diff}`;
    return 'TRAIN';
}

document.addEventListener('DOMContentLoaded', loadDailyPlanFromFirebase);
