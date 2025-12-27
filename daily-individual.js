// daily-individual.js — ПОВНА СИНХРОНІЗАЦІЯ ДНІВ ТА СТАТУСІВ

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
        if (!user) return;
        const uid = user.uid;
        const docPath = `${uid}_${currentWeekId}`;

        try {
            const doc = await db.collection('weekly_plans').doc(docPath).get();
            if (!doc.exists) {
                statusDisplay.textContent = "План відсутній";
                return;
            }

            const fbData = doc.data().planData;
            // Поточний день: 0 - Пн, 6 - Нд
            const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;

            // --- ЛОГІКА ВИЗНАЧЕННЯ СТАТУСУ (ЯК У ТВОЄМУ WEEKLY) ---
            let dayStatuses = new Array(7).fill('TRAIN');
            let activityTypes = [];
            for(let i=0; i<7; i++) {
                activityTypes.push(fbData[`day_${i}`] || 'TRAIN');
            }

            const matchIndices = activityTypes.map((t, idx) => t === 'MATCH' ? idx : -1).filter(i => i !== -1);

            // Розрахунок циклів MDX
            for (let i = 0; i < 7; i++) {
                if (activityTypes[i] === 'MATCH') { dayStatuses[i] = 'MD'; continue; }
                let minDiff = Infinity;
                let bestStatus = 'TRAIN';
                
                matchIndices.forEach(mIdx => {
                    for (let offset of [-7, 0, 7]) {
                        let diff = i - (mIdx + offset);
                        if ((diff === 1 || diff === 2) || (diff >= -4 && diff <= -1)) {
                            if (Math.abs(diff) < Math.abs(minDiff)) {
                                minDiff = diff;
                                bestStatus = diff > 0 ? `MD+${diff}` : `MD${diff}`;
                            }
                        }
                    }
                });
                dayStatuses[i] = bestStatus;
            }

            // Кінцевий статус для сьогодні
            const finalStatus = (activityTypes[todayIdx] === 'REST') ? 'REST' : dayStatuses[todayIdx];
            
            if (statusDisplay) {
                statusDisplay.textContent = finalStatus;
                // Додаємо колір як у Weekly
                const colorMap = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
                statusDisplay.className = `md-status ${colorMap[finalStatus] || 'color-green'}`;
            }

            // Відображення вправ для цього статусу
            const planKey = `status_plan_${finalStatus}`;
            const plan = fbData[planKey];

            if (!plan || !plan.exercises || plan.exercises.length === 0) {
                listContainer.innerHTML = `<p style="text-align:center; padding:20px;">На сьогодні (${finalStatus}) вправ немає.</p>`;
            } else {
                renderExercises(plan.exercises, listContainer);
            }

        } catch (e) { console.error("Error:", e); }
    });
}

function renderExercises(exercises, container) {
    const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];
    container.innerHTML = STAGES.map(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
        if (stageExs.length === 0) return '';
        return `
            <div style="margin-top:20px;">
                <div style="color:#d4af37; font-size:0.7rem; text-transform:uppercase; border-bottom:1px solid #333;">${stage}</div>
                ${stageExs.map(ex => `
                    <div style="background:#111; padding:15px; border-radius:8px; margin-top:10px; border-left:4px solid #d4af37;">
                        <h4 style="margin:0; color:#fff;">${ex.name}</h4>
                        ${ex.videoKey ? `<iframe src="https://www.youtube.com/embed/${ex.videoKey}" style="width:100%; aspect-ratio:16/9; border:0; margin-top:10px;" allowfullscreen></iframe>` : ''}
                    </div>
                `).join('')}
            </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', loadDailyPlan);
