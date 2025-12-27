// daily-individual.js — ProAtletCare (FIXED)

// Використовуємо var замість const для STORAGE_KEY, щоб уникнути SyntaxError при подвійному підключенні
if (typeof STORAGE_KEY === 'undefined') {
    var STORAGE_KEY = 'weeklyPlanData';
}

var dailyDb = (typeof db !== 'undefined') ? db : firebase.firestore();
const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];

// 1. ОТРИМАННЯ ID ТИЖНЯ (Понеділок)
function getWeekID() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}

// 2. ЗАВАНТАЖЕННЯ З FIREBASE
async function loadDailyPlanFromFirebase() {
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const currentWeekId = getWeekID();

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return;
        
        const uid = user.uid;
        try {
            // Зчитуємо дані з Firebase за ID користувача та тижня
            const doc = await dailyDb.collection('weekly_plans').doc(`${uid}_${currentWeekId}`).get();
            
            if (!doc.exists) {
                if (listContainer) listContainer.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">План тренером ще не опублікований у Firebase.</p>';
                return;
            }

            const data = doc.data().planData;
            const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;

            // Визначаємо статус (ВИПРАВЛЕНО: використовуємо ключі day_ як у Weekly)
            const mdStatus = calculateTodayStatus(data, todayIdx);
            
            if (statusDisplay) {
                statusDisplay.textContent = mdStatus;
                statusDisplay.className = `md-status color-dark-grey`; // Базовий колір
            }

            const planKey = `status_plan_${mdStatus}`;
            const plan = data[planKey];

            if (!plan || !plan.exercises || plan.exercises.length === 0) {
                listContainer.innerHTML = `<div style="text-align:center; padding:30px; color:#888;">На сьогодні (${mdStatus}) вправи не заплановані.</div>`;
            } else {
                renderDailyExercises(plan.exercises, listContainer);
            }

            if (typeof renderFeedbackForm === 'function') renderFeedbackForm();

        } catch (e) {
            console.error("Firebase Load Error:", e);
        }
    });
}

// 3. РОЗРАХУНОК СТАТУСУ (ВИПРАВЛЕНО КЛЮЧІ)
function calculateTodayStatus(data, todayIdx) {
    // Змінено з activity_ на day_ для синхронізації з Weekly Individual
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

// 4. ВІДОБРАЖЕННЯ ВПРАВ
function renderDailyExercises(exercises, container) {
    let html = '';
    STAGES.forEach(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
        if (stageExs.length > 0) {
            html += `
                <div style="margin-bottom:20px;">
                    <div style="color:#d4af37; font-size:0.75rem; text-transform:uppercase; border-bottom:1px solid #333; padding-bottom:5px; margin-bottom:10px;">${stage}</div>
                    ${stageExs.map(ex => createExerciseItemHTML(ex)).join('')}
                </div>`;
        }
    });
    container.innerHTML = html;
}

function createExerciseItemHTML(ex) {
    return `
        <div class="exercise-card" style="background:#111; padding:15px; border-radius:8px; margin-bottom:10px; border-left:4px solid #d4af37;">
            <h4 style="margin:0; color:#fff;">${ex.name}</h4>
            <p style="color:#aaa; font-size:0.85rem; margin:5px 0;">${ex.description || ''}</p>
            ${ex.videoKey ? `
                <div style="margin-top:10px; position:relative; padding-bottom:56.25%; height:0; overflow:hidden;">
                    <iframe src="https://www.youtube.com/embed/${ex.videoKey}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
                </div>` : ''}
        </div>`;
}

document.addEventListener('DOMContentLoaded', loadDailyPlanFromFirebase);
