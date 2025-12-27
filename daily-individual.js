// daily-individual.js — ФІКС РОЗПІЗНАВАННЯ ДНЯ

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
                console.log("Документ не знайдено:", docPath);
                return;
            }

            const fbData = doc.data().planData || {};
            console.log("Дані з Firebase отримано:", fbData);

            // Поточний день (0-Пн, 6-Нд)
            const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
            
            // ЗБИРАЄМО ТИПИ ДНІВ (точно як вони названі у вашому Weekly)
            let activityTypes = [];
            for (let i = 0; i < 7; i++) {
                // Перевіряємо ключ day_X, який створює ваш Weekly Individual
                activityTypes.push(fbData[`day_${i}`] || 'TRAIN');
            }
            console.log("Масив типів днів:", activityTypes);

            // Розрахунок статусів MDX
            const matchIndices = activityTypes.map((t, idx) => t === 'MATCH' ? idx : -1).filter(i => i !== -1);
            let dayStatuses = new Array(7).fill('TRAIN');

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

            // Визначаємо фінальний статус для сьогодні
            let finalStatus = dayStatuses[todayIdx];
            if (activityTypes[todayIdx] === 'REST') finalStatus = 'REST';

            console.log("Сьогоднішній розрахований статус:", finalStatus);

            if (statusDisplay) {
                statusDisplay.textContent = finalStatus;
                const colorMap = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
                statusDisplay.className = `md-status ${colorMap[finalStatus] || 'color-green'}`;
            }

            // Відображення вправ
            const planKey = `status_plan_${finalStatus}`;
            const plan = fbData[planKey];

            if (!plan || !plan.exercises || plan.exercises.length === 0) {
                listContainer.innerHTML = `<p style="text-align:center; padding:30px; color:#888;">На сьогодні (${finalStatus}) вправ немає.</p>`;
            } else {
                listContainer.innerHTML = plan.exercises.map(ex => `
                    <div style="background:#111; padding:15px; border-radius:8px; margin-bottom:10px; border-left:4px solid #d4af37;">
                        <h4 style="margin:0; color:#fff;">${ex.name}</h4>
                        ${ex.videoKey ? `<iframe src="https://www.youtube.com/embed/${ex.videoKey}" style="width:100%; aspect-ratio:16/9; border:0; margin-top:10px;" allowfullscreen></iframe>` : ''}
                    </div>
                `).join('');
            }

        } catch (e) { console.error("Помилка завантаження:", e); }
    });
}

document.addEventListener('DOMContentLoaded', loadDailyPlan);
