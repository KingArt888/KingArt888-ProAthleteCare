// weekly-individual.js — ProAtletCare (CLOUD INTEGRATION)
const STORAGE_KEY = 'weeklyPlanData';
let currentUserId = null;

// Функція для визначення ID тижня (понеділок поточної неділі)
function getWeekID() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0]; // Формат YYYY-MM-DD
}

const currentWeekId = getWeekID();

/**
 * 1. FIREBASE: ЗБЕРЕЖЕННЯ ТА ЗАВАНТАЖЕННЯ
 */

// Збереження плану в Firebase для календаря
async function saveWeeklyPlanToFirebase() {
    if (!currentUserId) return;
    
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const weekRef = db.collection('weekly_plans').doc(`${currentUserId}_${currentWeekId}`);

    try {
        await weekRef.set({
            userId: currentUserId,
            weekId: currentWeekId,
            planData: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            // Поля для фільтрації в календарі
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
        }, { merge: true });
        
        alert(`План на тиждень ${currentWeekId} збережено!`);
    } catch (e) {
        console.error("Помилка збереження в Firebase:", e);
    }
}

// Завантаження плану з Firebase
async function loadWeeklyPlanFromFirebase(uid) {
    try {
        const doc = await db.collection('weekly_plans').doc(`${uid}_${currentWeekId}`).get();
        if (doc.exists) {
            const fbData = doc.data().planData;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fbData));
            
            // Оновлюємо селектори активності
            document.querySelectorAll('.activity-type-select').forEach(sel => {
                if (fbData[sel.name]) sel.value = fbData[sel.name];
            });
            console.log("Дані тижня завантажені з хмари");
        }
        updateCycleColors();
    } catch (e) {
        console.error("Помилка завантаження:", e);
    }
}

/**
 * 2. ЛОГІКА ЦИКЛУ ТА ВПРАВ
 */

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

function updateCycleColors() {
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    
    let activityTypes = Array.from(activitySelects).map(s => s.value);
    let dayStatuses = new Array(7).fill('TRAIN');

    const matchIndices = activityTypes.map((type, index) => type === 'MATCH' ? index : -1).filter(idx => idx !== -1);

    for (let i = 0; i < 7; i++) {
        if (activityTypes[i] === 'MATCH') {
            dayStatuses[i] = 'MD';
            continue;
        }

        let minDiff = Infinity;
        let bestStatus = 'TRAIN';

        matchIndices.forEach(mIdx => {
            for (let offset of [-7, 0, 7]) {
                let diff = i - (mIdx + offset);
                if (diff === 1 || diff === 2) {
                    if (Math.abs(diff) < Math.abs(minDiff)) {
                        minDiff = diff;
                        bestStatus = `MD+${diff}`;
                    }
                } else if (diff >= -4 && diff <= -1) {
                    if (Math.abs(diff) < Math.abs(minDiff)) {
                        minDiff = diff;
                        bestStatus = `MD${diff}`; 
                    }
                }
            }
        });
        dayStatuses[i] = bestStatus;
    }

    dayStatuses.forEach((status, idx) => {
        const isRest = activityTypes[idx] === 'REST';
        const finalStatus = isRest ? 'REST' : status;
        const style = COLOR_MAP[finalStatus] || COLOR_MAP['TRAIN'];
        
        const mdEl = dayCells[idx]?.querySelector('.md-status');
        if (mdEl) {
            mdEl.textContent = finalStatus;
            mdEl.className = `md-status ${style.colorClass}`;
        }
        
        const titleEl = document.getElementById(`md-title-${idx}`);
        if (titleEl) {
            titleEl.innerHTML = `<span class="md-status-label ${style.colorClass}">${finalStatus}</span> (${['Пн','Вт','Ср','Чт','Пт','Сб','Нд'][idx]})`;
        }
        
        renderExercisesByStatus(idx, finalStatus);
    });

    saveLocalProgress();
}

function saveLocalProgress() {
    let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    document.querySelectorAll('.activity-type-select').forEach(sel => {
        data[sel.name] = sel.value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 3. ІНІЦІАЛІЗАЦІЯ (AUTH СЛУХАЧ)
 */
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        const urlParams = new URLSearchParams(window.location.search);
        const viewUserId = urlParams.get('userId');
        
        currentUserId = viewUserId || user.uid;
        console.log("Weekly Individual працюємо з ID:", currentUserId);
        
        await loadWeeklyPlanFromFirebase(currentUserId);
    } else {
        await firebase.auth().signInAnonymously();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('weekly-plan-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await saveWeeklyPlanToFirebase();
        };
    }

    document.querySelectorAll('.activity-type-select').forEach(sel => {
        sel.addEventListener('change', updateCycleColors);
    });

    // Оживляємо хрестик модалки
    const closeX = document.querySelector('.close-modal-btn'); 
    if (closeX) closeX.onclick = () => { document.getElementById('exercise-selection-modal').style.display = 'none'; };
});

// Функція для відображення вправ (без змін логіки виводу)
function renderExercisesByStatus(dayIndex, status) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const plan = data[`status_plan_${status}`] || { exercises: [] };
    if (status === 'REST') {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #777;">☕ ВІДПОЧИНОК</div>';
        return;
    }
    // ... решта логіки renderExercisesByStatus з вашого файлу ...
}
