// weekly-individual.js — ProAtletCare (FIXED MODAL CLOSE)
const STORAGE_KEY = 'weeklyPlanData';

// 1. ФУНКЦІЇ ЗАКРИТТЯ ТА ЗБЕРЕЖЕННЯ
function closeExerciseModal() {
    const modal = document.getElementById('exercise-selection-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function saveData() {
    try {
        let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        document.querySelectorAll('.activity-type-select').forEach(sel => {
            data[sel.name] = sel.value;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { 
        console.warn("Дані не збережено:", e); 
    }
}

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

const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const templateStages = {
    'Pre-Training': ['Mobility', 'Activation'],
    'Main Training': ['Legs', 'Core', 'UpperBody'],
    'Post-Training': ['Recovery', 'FoamRolling']
};

// 2. РОЗРАХУНОК ЦИКЛУ
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
                }
                else if (diff >= -4 && diff <= -1) {
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
            Object.values(COLOR_MAP).forEach(m => mdEl.classList.remove(m.colorClass));
            mdEl.classList.add(style.colorClass);
        }
        
        const titleEl = document.getElementById(`md-title-${idx}`);
        if (titleEl) {
            titleEl.innerHTML = `<span class="md-status-label ${style.colorClass}">${finalStatus}</span> (${dayNamesShort[idx]})`;
        }
        
        renderExercisesByStatus(idx, finalStatus);
    });

    saveData();
}

// 3. ВПРАВИ ТА МОДАЛКА
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
    Object.keys(templateStages).forEach(stage => {
        const stageExs = plan.exercises.filter(ex => ex.stage === stage);
        html += `<div style="font-size: 0.7rem; color: #d4af37; margin-top: 10px; border-bottom: 1px solid #333; text-transform: uppercase;">${stage}</div>`;
        
        stageExs.forEach(ex => {
            html += `
                <div class="exercise-item" style="display:flex; justify-content:space-between; align-items:center; background:#111; margin: 3px 0; padding: 5px; border-left: 2px solid #d4af37;">
                    <span style="font-size: 0.85rem; color: #fff;">${ex.name}</span>
                    <button type="button" style="color:#ff4d4d; background:none; border:none; cursor:pointer;" onclick="removeExerciseFromStatus('${status}', '${ex.name}')">✕</button>
                </div>`;
        });
        html += `<button type="button" class="add-manual-btn" style="width:100%;" onclick="openExerciseModal('${status}', '${stage}')">+ Додати</button>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function openExerciseModal(status, stage) {
    window.currentAddStatus = status;
    window.currentAddStage = stage;
    const modal = document.getElementById('exercise-selection-modal');
    const list = document.getElementById('exercise-list-container');
    if (!modal || !list) return;
    list.innerHTML = '';

    const stageData = EXERCISE_LIBRARY[stage];
    if (stageData) {
        for (const cat in stageData) {
            const catDiv = document.createElement('div');
            catDiv.style.cssText = "background: #d4af37; color: #000; padding: 6px; margin-top: 10px; font-weight: bold; font-size: 0.8rem; text-transform: uppercase;";
            catDiv.textContent = cat;
            list.appendChild(catDiv);

            stageData[cat].exercises.forEach(ex => {
                const item = document.createElement('div');
                item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #222; background: #0a0a0a;";
                item.innerHTML = `
                    <span style="color: #fff; font-size: 0.9rem;">${ex.name}</span>
                    <button class="gold-button btn-small" onclick="addExerciseToStatus(this, '${ex.name}', '${stage}', '${cat}')">Додати</button>
                `;
                list.appendChild(item);
            });
        }
    }
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = "Готово";
    closeBtn.className = "gold-button";
    closeBtn.style.cssText = "width: 100%; padding: 12px; margin-top: 20px;";
    closeBtn.onclick = closeExerciseModal;
    list.appendChild(closeBtn);

    modal.style.display = 'flex';
}

function addExerciseToStatus(btn, name, stage, category) {
    const status = window.currentAddStatus;
    const exTemplate = EXERCISE_LIBRARY[stage][category].exercises.find(e => e.name === name);
    if (exTemplate) {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const key = `status_plan_${status}`;
        if (!data[key]) data[key] = { exercises: [] };
        data[key].exercises.push({ ...exTemplate, stage, category });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateCycleColors();
        btn.textContent = "✔";
        btn.style.background = "#28a745";
        btn.disabled = true;
    }
}

function removeExerciseFromStatus(status, name) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const key = `status_plan_${status}`;
    if (data[key]) {
        data[key].exercises = data[key].exercises.filter(e => e.name !== name);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateCycleColors();
    }
}

// 4. ІНІЦІАЛІЗАЦІЯ (ВИПРАВЛЕНО ДЛЯ ТВОГО HTML)
document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    document.querySelectorAll('.activity-type-select').forEach(sel => {
        if (data[sel.name]) sel.value = data[sel.name];
        sel.addEventListener('change', updateCycleColors);
    });

    // ШУКАЄМО КРЕСТИК ЗА ПРАВИЛЬНИМ КЛАСОМ: close-modal-btn
    const closeX = document.querySelector('.close-modal-btn'); 
    if (closeX) {
        closeX.onclick = function() {
            closeExerciseModal();
        };
    }

    // Закриття по кліку поза вікном (на темний фон)
    window.onclick = function(e) {
        const modal = document.getElementById('exercise-selection-modal');
        if (e.target == modal) closeExerciseModal();
    };

    updateCycleColors();
});

// Сама функція закриття
function closeExerciseModal() {
    const modal = document.getElementById('exercise-selection-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

    updateCycleColors();
});
