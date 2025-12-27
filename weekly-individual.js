// weekly-individual.js — ProAtletCare (FIXED & STABLE)
const STORAGE_KEY = 'weeklyPlanData';
let currentUserId = null;

// 1. ВИЗНАЧЕННЯ ТИЖНЯ (ID документа)
function getWeekID() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Понеділок
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}
const currentWeekId = getWeekID();

// 2. ЦЕНТРАЛЬНА ЛОГІКА КОЛЬОРІВ ТА СТАТУСІВ (MD)
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
    const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
    
    let activityTypes = Array.from(activitySelects).map(s => s.value);
    let dayStatuses = new Array(7).fill('TRAIN');
    const matchIndices = activityTypes.map((t, idx) => t === 'MATCH' ? idx : -1).filter(i => i !== -1);

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

    dayStatuses.forEach((status, idx) => {
        const isRest = activityTypes[idx] === 'REST';
        const finalStatus = isRest ? 'REST' : status;
        const style = COLOR_MAP[finalStatus] || COLOR_MAP['TRAIN'];
        
        const mdEl = dayCells[idx]?.querySelector('.md-status');
        if (mdEl) {
            mdEl.textContent = finalStatus;
            Object.values(COLOR_MAP).forEach(m => mdEl.classList.remove(m.colorClass));
            mdEl.classList.add(style.class || style.colorClass);
        }
        
        const titleEl = document.getElementById(`md-title-${idx}`);
        if (titleEl) {
            titleEl.innerHTML = `<span class="md-status-label ${style.colorClass}">${finalStatus}</span> (${dayNamesShort[idx]})`;
        }
        renderExercisesByStatus(idx, finalStatus);
    });
}

// 3. ВІДОБРАЖЕННЯ ВПРАВ
function renderExercisesByStatus(dayIndex, status) {
    const container = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!container) return;

    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const plan = data[`status_plan_${status}`] || { exercises: [] };

    if (status === 'REST') {
        container.innerHTML = '<div style="text-align:center; padding: 20px; color: #777;">☕ ВІДПОЧИНОК</div>';
        return;
    }

    let html = '<div class="generated-exercises-list">';
    ['Pre-Training', 'Main Training', 'Post-Training'].forEach(stage => {
        const stageExs = plan.exercises.filter(ex => ex.stage === stage);
        html += `<div class="stage-label" style="font-size:0.7rem; color:#d4af37; margin-top:10px; text-transform:uppercase;">${stage}</div>`;
        stageExs.forEach(ex => {
            html += `
                <div class="exercise-item" style="display:flex; justify-content:space-between; background:#111; margin:2px 0; padding:5px;">
                    <span style="font-size:0.8rem;">${ex.name}</span>
                    <button type="button" onclick="removeExerciseFromStatus('${status}', '${ex.name}')" style="color:red; background:none; border:none;">✕</button>
                </div>`;
        });
        html += `<button type="button" class="add-manual-btn" onclick="openExerciseModal('${status}', '${stage}')" style="width:100%; border:1px dashed #444; background:none; color:#aaa; cursor:pointer;">+ Додати</button>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// 4. FIREBASE СИНХРОНІЗАЦІЯ
async function syncToFirebase() {
    if (!currentUserId) return;
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    document.querySelectorAll('.activity-type-select').forEach(sel => { data[sel.name] = sel.value; });

    try {
        await db.collection('weekly_plans').doc(`${currentUserId}_${currentWeekId}`).set({
            userId: currentUserId,
            weekId: currentWeekId,
            planData: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log("Хмара оновлена");
    } catch (e) { console.error("Помилка Firebase:", e); }
}

async function loadFromFirebase(uid) {
    try {
        const doc = await db.collection('weekly_plans').doc(`${uid}_${currentWeekId}`).get();
        if (doc.exists) {
            const data = doc.data().planData || {};
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            document.querySelectorAll('.activity-type-select').forEach(sel => {
                if (data[sel.name]) sel.value = data[sel.name];
            });
        }
        updateCycleColors();
    } catch (e) { console.error("Помилка завантаження:", e); }
}

// 5. МОДАЛЬНЕ ВІКНО ТА КЕРУВАННЯ ВПРАВАМИ
window.openExerciseModal = function(status, stage) {
    window.currentAddStatus = status;
    window.currentAddStage = stage;
    const modal = document.getElementById('exercise-selection-modal');
    const list = document.getElementById('exercise-list-container');
    if (!modal || !list) return;
    list.innerHTML = '';

    const stageData = EXERCISE_LIBRARY[stage];
    if (stageData) {
        for (const cat in stageData) {
            let catDiv = document.createElement('div');
            catDiv.className = "category-header"; catDiv.textContent = cat;
            list.appendChild(catDiv);
            stageData[cat].exercises.forEach(ex => {
                let item = document.createElement('div');
                item.className = "exercise-modal-item";
                item.innerHTML = `<span>${ex.name}</span><button class="gold-button btn-small" onclick="addExerciseToStatus(this, '${ex.name}', '${stage}', '${cat}')">Додати</button>`;
                list.appendChild(item);
            });
        }
    }
    modal.style.display = 'flex';
};

window.addExerciseToStatus = function(btn, name, stage, category) {
    const status = window.currentAddStatus;
    const exTemplate = EXERCISE_LIBRARY[stage][category].exercises.find(e => e.name === name);
    if (exTemplate) {
        let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const key = `status_plan_${status}`;
        if (!data[key]) data[key] = { exercises: [] };
        data[key].exercises.push({ ...exTemplate, stage, category });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateCycleColors();
        syncToFirebase();
        btn.textContent = "✔"; btn.disabled = true;
    }
};

window.removeExerciseFromStatus = function(status, name) {
    let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const key = `status_plan_${status}`;
    if (data[key]) {
        data[key].exercises = data[key].exercises.filter(e => e.name !== name);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateCycleColors();
        syncToFirebase();
    }
};

// 6. ІНІЦІАЛІЗАЦІЯ (СТАРТ)
document.addEventListener('DOMContentLoaded', () => {
    // Хрестик закриття
    const closeX = document.querySelector('.close-modal-btn');
    if (closeX) closeX.onclick = () => document.getElementById('exercise-selection-modal').style.display = 'none';

    // Слухач на селектори
    document.querySelectorAll('.activity-type-select').forEach(sel => {
        sel.addEventListener('change', () => { updateCycleColors(); syncToFirebase(); });
    });

    // Перевірка Auth (Тут виправлено помилку TypeError)
    const checkAuth = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            clearInterval(checkAuth);
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    const urlParams = new URLSearchParams(window.location.search);
                    currentUserId = urlParams.get('userId') || user.uid; //
                    await loadFromFirebase(currentUserId);
                }
            });
        }
    }, 500);
});
