// daily-individual.js — ПОВНА СИНХРОНІЗАЦІЯ З ТВОЇМ WEEKLY

// 1. ІДЕНТИФІКАЦІЯ ТИЖНЯ (Точно як у твоєму Weekly)
function getWeekID() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}

const currentWeekId = getWeekID();

async function loadDailyPlan() {
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            console.log("Користувач не залогінений");
            return;
        }

        // Використовуємо UID поточного атлета
        const uid = user.uid;
        const docPath = `${uid}_${currentWeekId}`;
        
        console.log("Daily Individual: Завантаження для", docPath);

        try {
            // Зчитуємо саме той документ, який створив Weekly Individual
            const doc = await db.collection('weekly_plans').doc(docPath).get();
            
            if (!doc.exists) {
                listContainer.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">План на цей тиждень ще не опублікований тренером.</p>';
                return;
            }

            const data = doc.data().planData;
            // Поточний індекс дня (0-Пн, 6-Нд)
            const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;

            // Визначаємо статус дня на сьогодні (MD, TRAIN, REST)
            const mdStatus = calculateStatusFromWeekly(data, todayIdx);
            
            if (statusDisplay) {
                statusDisplay.textContent = mdStatus;
                statusDisplay.className = `md-status ${getStatusColorClass(mdStatus)}`;
            }

            // Отримуємо вправи саме для цього статусу
            const planKey = `status_plan_${mdStatus}`;
            const plan = data[planKey];

            if (!plan || !plan.exercises || plan.exercises.length === 0) {
                listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#888;">На сьогодні (${mdStatus}) вправи не заплановані.</div>`;
            } else {
                renderDailyExercises(plan.exercises, listContainer);
            }

        } catch (e) {
            console.error("Помилка завантаження:", e);
            listContainer.innerHTML = '<p style="color:red; text-align:center;">Помилка синхронізації з хмарою.</p>';
        }
    });
}

// Функція розрахунку статусу (ідентична логіці Weekly)
function calculateStatusFromWeekly(data, todayIdx) {
    // Перевіряємо типи днів за ключами day_0, day_1...
    if (data[`day_${todayIdx}`] === 'REST') return 'REST';
    if (data[`day_${todayIdx}`] === 'MATCH') return 'MD';
    
    let matchIndices = [];
    for (let i = 0; i < 7; i++) {
        if (data[`day_${i}`] === 'MATCH') matchIndices.push(i);
    }
    
    if (matchIndices.length === 0) return 'TRAIN';
    
    let minDiff = Infinity;
    let bestStatus = 'TRAIN';

    matchIndices.forEach(mIdx => {
        // Перевіряємо в межах поточного, минулого та наступного тижнів
        for (let offset of [-7, 0, 7]) {
            let diff = todayIdx - (mIdx + offset);
            if ((diff === 1 || diff === 2) || (diff >= -4 && diff <= -1)) {
                if (Math.abs(diff) < Math.abs(minDiff)) {
                    minDiff = diff;
                    bestStatus = diff > 0 ? `MD+${diff}` : `MD${diff}`;
                }
            }
        }
    });
    return bestStatus;
}

function getStatusColorClass(status) {
    const map = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
    return map[status] || 'color-green'; // Для MD-1, MD+1 тощо
}

function renderDailyExercises(exercises, container) {
    const stages = ['Pre-Training', 'Main Training', 'Post-Training'];
    container.innerHTML = stages.map(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
        if (stageExs.length === 0) return '';
        return `
            <div style="margin-bottom:25px;">
                <div style="color:#d4af37; font-size:0.75rem; text-transform:uppercase; border-bottom:1px solid #333; padding-bottom:5px; margin-bottom:12px; font-weight:bold;">${stage}</div>
                ${stageExs.map(ex => `
                    <div style="background:#111; padding:15px; border-radius:8px; margin-bottom:12px; border-left:4px solid #d4af37;">
                        <h4 style="margin:0; color:#fff; font-size:1.1rem;">${ex.name}</h4>
                        ${ex.videoKey ? `
                        <div style="margin-top:12px; position:relative; padding-bottom:56.25%; height:0; border-radius:6px; overflow:hidden; background:#000;">
                            <iframe src="https://www.youtube.com/embed/${ex.videoKey}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
                        </div>` : ''}
                    </div>
                `).join('')}
            </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', loadDailyPlan);
