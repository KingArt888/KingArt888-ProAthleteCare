// daily-individual.js — СИНХРОНІЗОВАНО З ТВОЇМ ВЕРСІЄЮ WEEKLY

const STORAGE_KEY = 'weeklyPlanData';
let currentUserId = null;

// 1. Отримуємо ID тижня (точно так само, як у weekly)
function getWeekID() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}
const currentWeekId = getWeekID();

// 2. Авторизація та завантаження
firebase.auth().onAuthStateChanged(async (user) => {
    const listContainer = document.getElementById('daily-exercise-list');
    
    if (user) {
        // Беремо ID поточного атлета
        currentUserId = user.uid;
        console.log("Завантажуємо план для тижня:", currentWeekId);
        
        try {
            // Звертаємося до того ж документа, куди пише weekly-individual.js
            const doc = await db.collection('weekly_plans').doc(`${currentUserId}_${currentWeekId}`).get();
            
            if (doc.exists) {
                const fbData = doc.data().planData;
                renderDailyPlan(fbData);
            } else {
                listContainer.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">План на цей тиждень ще не створений тренером.</p>';
            }
        } catch (e) {
            console.error("Firebase error:", e);
            listContainer.innerHTML = '<p style="color:red; text-align:center;">Помилка доступу до бази даних.</p>';
        }
    } else {
        // Якщо не залогінений — на сторінку входу
        window.location.href = "auth.html";
    }
});

// 3. Логіка відображення
function renderDailyPlan(data) {
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    
    // Поточний день (0-Пн, 6-Нд)
    const todayIndex = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;

    // Визначаємо статус дня за твоїми ключами (day_0, day_1...)
    const mdStatus = calculateStatusFromData(data, todayIndex);
    
    if (statusDisplay) {
        statusDisplay.textContent = mdStatus;
        // Додаємо колір залежно від статусу (класи з твого CSS)
        const colors = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
        statusDisplay.className = `md-status ${colors[mdStatus] || 'color-green'}`;
    }

    // Отримуємо вправи для цього статусу (status_plan_MD-1 тощо)
    const planKey = `status_plan_${mdStatus}`;
    const plan = data[planKey];

    if (!plan || !plan.exercises || plan.exercises.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#888;">Сьогодні (${mdStatus}) тренування не заплановано.</div>`;
        return;
    }

    // Малюємо список вправ
    let html = '';
    ['Pre-Training', 'Main Training', 'Post-Training'].forEach(stage => {
        const stageExs = plan.exercises.filter(ex => ex.stage === stage);
        if (stageExs.length > 0) {
            html += `
                <div class="daily-stage-block" style="margin-bottom:15px;">
                    <div style="color:#d4af37; font-weight:bold; font-size:0.8rem; text-transform:uppercase; margin-bottom:10px; border-bottom:1px solid #333;">${stage}</div>
                    ${stageExs.map(ex => `
                        <div class="exercise-card" style="background:#111; padding:15px; border-radius:8px; margin-bottom:10px; border-left:4px solid #d4af37;">
                            <h4 style="margin:0; color:#fff;">${ex.name}</h4>
                            <p style="font-size:0.85rem; color:#aaa; margin:5px 0;">${ex.description || ''}</p>
                            ${ex.videoKey ? `<div style="margin-top:10px; position:relative; padding-bottom:56.25%; height:0; overflow:hidden;">
                                <iframe src="https://www.youtube.com/embed/${ex.videoKey}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
                            </div>` : ''}
                        </div>
                    `).join('')}
                </div>`;
        }
    });
    listContainer.innerHTML = html;
}

// 4. Розрахунок статусу (копія логіки з weekly)
function calculateStatusFromData(data, todayIdx) {
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
