// daily-individual.js — Синхронізація з Firebase та Weekly Plan

const STORAGE_KEY = 'weeklyPlanData';

// Отримуємо Понеділок поточного тижня (ID для Firebase)
function getWeekID() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}

async function loadDailyPlan() {
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const currentWeekId = getWeekID();

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "auth.html";
            return;
        }

        const uid = user.uid;
        try {
            // Зчитуємо саме той документ, який створює weekly-individual.js
            const doc = await db.collection('weekly_plans').doc(`${uid}_${currentWeekId}`).get();
            
            if (!doc.exists) {
                listContainer.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">План на цей тиждень ще не опублікований.</p>';
                return;
            }

            const data = doc.data().planData;
            const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;

            // Визначаємо статус (MD, TRAIN, REST)
            const mdStatus = calculateStatus(data, todayIdx);
            
            if (statusDisplay) {
                statusDisplay.textContent = mdStatus;
                statusDisplay.className = `md-status ${getStatusColorClass(mdStatus)}`;
            }

            // Отримуємо вправи для знайденого статусу
            const planKey = `status_plan_${mdStatus}`;
            const plan = data[planKey];

            if (!plan || !plan.exercises || plan.exercises.length === 0) {
                listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#888;">На сьогодні (${mdStatus}) вправи не заплановані.</div>`;
            } else {
                renderExercises(plan.exercises, listContainer);
            }

        } catch (e) {
            console.error("Помилка завантаження:", e);
            listContainer.innerHTML = '<p style="color:red; text-align:center;">Помилка синхронізації з хмарою.</p>';
        }
    });
}

function calculateStatus(data, todayIdx) {
    // Використовуємо ключі day_X, як у твоєму weekly-individual.js
    if (data[`day_${todayIdx}`] === 'REST') return 'REST';
    if (data[`day_${todayIdx}`] === 'MATCH') return 'MD';
    
    let matchIdx = -1;
    for (let i = 0; i < 7; i++) {
        if (data[`day_${i}`] === 'MATCH') matchIdx = i;
    }
    
    if (matchIdx === -1) return 'TRAIN';
    
    let diff = todayIdx - matchIdx;
    if (diff === 1 || diff === 2) return `MD+${diff}`;
    if (diff >= -4 && diff <= -1) return `MD${diff}`;
    return 'TRAIN';
}

function getStatusColorClass(status) {
    const map = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
    return map[status] || 'color-green';
}

function renderExercises(exercises, container) {
    const stages = ['Pre-Training', 'Main Training', 'Post-Training'];
    container.innerHTML = stages.map(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
        if (stageExs.length === 0) return '';
        return `
            <div style="margin-bottom:20px;">
                <div style="color:#d4af37; font-size:0.75rem; text-transform:uppercase; border-bottom:1px solid #333; padding-bottom:5px; margin-bottom:10px;">${stage}</div>
                ${stageExs.map(ex => `
                    <div style="background:#111; padding:15px; border-radius:8px; margin-bottom:10px; border-left:4px solid #d4af37;">
                        <h4 style="margin:0; color:#fff; font-size:1rem;">${ex.name}</h4>
                        <p style="color:#aaa; font-size:0.85rem; margin:5px 0;">${ex.description || ''}</p>
                        ${ex.videoKey ? `<div style="margin-top:10px; position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:4px;">
                            <iframe src="https://www.youtube.com/embed/${ex.videoKey}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
                        </div>` : ''}
                    </div>
                `).join('')}
            </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', loadDailyPlan);
