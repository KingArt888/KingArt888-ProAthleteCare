// daily-individual.js — ProAtletCare (FIREBASE SYNC FIX)

// Функція формування ID тижня (МАЄ БУТИ ТАКОЮ Ж, ЯК У WEEKLY)
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
            console.log("Користувач не залогінений");
            return;
        }

        const uid = user.uid;
        // ГЕНЕРУЄМО ТОЙ САМИЙ ID, ЩО В WEEKLY
        const docPath = `${uid}_${currentWeekId}`;
        console.log("Шукаємо план за шляхом:", docPath);

        try {
            const doc = await db.collection('weekly_plans').doc(docPath).get();
            
            if (!doc.exists) {
                console.log("Документ не знайдено в Firebase");
                listContainer.innerHTML = '<p style="text-align:center; color:#888;">План ще не опублікований тренером у Firebase.</p>';
                return;
            }

            const fbData = doc.data().planData;
            const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;

            // Визначаємо статус (ВИПРАВЛЕНО КЛЮЧІ: day_ замість activity_)
            const mdStatus = calculateStatusFromWeekly(fbData, todayIdx);
            
            if (statusDisplay) {
                statusDisplay.textContent = mdStatus;
                statusDisplay.className = `md-status color-dark-grey`;
            }

            const planKey = `status_plan_${mdStatus}`;
            const plan = fbData[planKey];

            if (!plan || !plan.exercises || plan.exercises.length === 0) {
                listContainer.innerHTML = `<p style="text-align:center; padding:20px;">На сьогодні (${mdStatus}) вправ немає.</p>`;
            } else {
                // Відображення вправ
                listContainer.innerHTML = plan.exercises.map(ex => `
                    <div style="background:#111; padding:15px; border-radius:8px; margin-bottom:10px; border-left:4px solid #d4af37;">
                        <h4 style="margin:0; color:#fff;">${ex.name}</h4>
                        <p style="color:#aaa; font-size:0.85rem;">${ex.description || ''}</p>
                        ${ex.videoKey ? `<iframe src="https://www.youtube.com/embed/${ex.videoKey}" style="width:100%; aspect-ratio:16/9; border:0; margin-top:10px;"></iframe>` : ''}
                    </div>
                `).join('');
            }

        } catch (e) {
            console.error("Firebase Error:", e);
            listContainer.innerHTML = '<p style="color:red;">Помилка доступу до бази даних.</p>';
        }
    });
}

function calculateStatusFromWeekly(data, todayIdx) {
    // ВАЖЛИВО: у твоєму weekly-individual.js ключі називаються day_0, day_1...
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

document.addEventListener('DOMContentLoaded', loadDailyPlan);
