// weekly-individual.js — ProAtletCare (Firebase Adapted)
const STORAGE_KEY = 'weeklyPlanData';
let currentUserId = null;

// Генеруємо ID тижня (понеділок), щоб дані зберігалися в календарі окремо
function getWeekID() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}
const currentWeekId = getWeekID();

/**
 * 1. FIREBASE СИНХРОНІЗАЦІЯ
 */
async function loadWeeklyPlanFromFirebase(uid) {
    try {
        const doc = await db.collection('weekly_plans').doc(`${uid}_${currentWeekId}`).get();
        if (doc.exists) {
            const data = doc.data().planData || {};
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            
            // Відновлюємо селектори активності (Тренування/Матч)
            document.querySelectorAll('.activity-type-select').forEach(sel => {
                if (data[sel.name]) sel.value = data[sel.name];
            });
        }
        // Викликаємо розрахунок кольорів ТІЛЬКИ після завантаження даних
        updateCycleColors();
    } catch (e) {
        console.error("Помилка завантаження:", e);
    }
}

async function syncToFirebase() {
    if (!currentUserId) return;
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    // Зберігаємо вибір активностей (Activity) у той самий об'єкт
    document.querySelectorAll('.activity-type-select').forEach(sel => {
        data[sel.name] = sel.value;
    });

    try {
        await db.collection('weekly_plans').doc(`${currentUserId}_${currentWeekId}`).set({
            userId: currentUserId,
            weekId: currentWeekId,
            planData: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log("Дані синхронізовано");
    } catch (e) {
        console.error("Помилка запису:", e);
    }
}

/**
 * 2. ЛОГІКА ЦИКЛІВ (ТВОЯ БАЗОВА ЛОГІКА)
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
    const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
    
    let activityTypes = Array.from(activitySelects).map(s => s.value);
    let dayStatuses = new Array(7).fill('TRAIN');

    const matchIndices = activityTypes.map((type, index) => type === 'MATCH' ? index : -1).filter(idx => idx !== -1);

    for (let i = 0; i < 7; i++) {
        if (activityTypes[i] === 'MATCH') { dayStatuses[i] = 'MD'; continue; }
        let minDiff = Infinity;
        let bestStatus = 'TRAIN';
        matchIndices.forEach(mIdx => {
            for (let offset of [-7, 0, 7]) {
                let diff = i - (mIdx + offset);
                if (diff === 1 || diff === 2) { if (Math.abs(diff) < Math.abs(minDiff)) { minDiff = diff; bestStatus = `MD+${diff}`; } }
                else if (diff >= -4 && diff <= -1) { if (Math.abs(diff) < Math.abs(minDiff)) { minDiff = diff; bestStatus = `MD${diff}`; } }
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
            mdEl.classList.add(style.colorClass);
        }
        
        const titleEl = document.getElementById(`md-title-${idx}`);
        if (titleEl) {
            titleEl.innerHTML = `<span class="md-status-label ${style.colorClass}">${finalStatus}</span> (${dayNamesShort[idx]})`;
        }
        renderExercisesByStatus(idx, finalStatus);
    });
}

/**
 * 3. РОБОТА З ВПРАВАМИ ТА МОДАЛКОЮ
 */
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
        syncToFirebase(); // Відразу в хмару
        btn.textContent = "✔";
        btn.style.background = "#28a745";
        btn.disabled = true;
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

// ... (Тут залишаються твої функції renderExercisesByStatus та openExerciseModal без змін)

/**
 * 4. ІНІЦІАЛІЗАЦІЯ ТА AUTH
 */
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        const urlParams = new URLSearchParams(window.location.search);
        currentUserId = urlParams.get('userId') || user.uid; // Пріоритет ID з URL для тренера
        await loadWeeklyPlanFromFirebase(currentUserId);
    } else {
        // Якщо немає Auth, пробуємо анонімно, щоб не було помилок
        firebase.auth().signInAnonymously();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('weekly-plan-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await syncToFirebase();
            alert("План збережено!");
        };
    }

    // Слухач змін селекторів (MD/REST/TRAIN)
    document.querySelectorAll('.activity-type-select').forEach(sel => {
        sel.addEventListener('change', () => {
            updateCycleColors();
            syncToFirebase();
        });
    });

    // Хрестик модалки
    const closeX = document.querySelector('.close-modal-btn'); 
    if (closeX) closeX.onclick = () => document.getElementById('exercise-selection-modal').style.display = 'none';
});
