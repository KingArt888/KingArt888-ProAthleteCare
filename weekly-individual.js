// weekly-individual.js

// ----- Константи -----
const COLOR_MAP = {
    TRAIN: 'color-dark-grey',
    MATCH: 'color-blue',
    REST: 'color-green'
};
const STORAGE_KEY = 'weeklyPlanData';

// ----- Змінні -----
let weeklyPlan = {
    mdStatus: Array(7).fill('TRAIN'),
    activityType: Array(7).fill('TRAIN'),
    templates: Array(7).fill([]) // масив вправ для кожного дня
};

// ----- Ініціалізація -----
document.addEventListener('DOMContentLoaded', () => {
    loadPlanFromStorage();
    renderMDStatus();
    setupActivitySelectors();
    setupTaskTemplates();
    setupModal();
    setupFormSave();
});

// ----- Завантаження з localStorage -----
function loadPlanFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    if(data) {
        weeklyPlan = JSON.parse(data);
        console.log('Дані тижневого плану завантажені', weeklyPlan);
    }
}

// ----- Рендер MD Status та кольорів -----
function renderMDStatus() {
    weeklyPlan.mdStatus.forEach((status, index) => {
        const cell = document.querySelector(`#day-status-${index} span`);
        cell.textContent = status;
        cell.className = `md-status ${COLOR_MAP[status]}`;
        document.querySelector(`#md-title-${index}`).textContent = `День ${index+1}: ${status}`;
    });
}

// ----- Обробка змін у Activity Select -----
function setupActivitySelectors() {
    document.querySelectorAll('.activity-type-select').forEach((select, index) => {
        select.value = weeklyPlan.activityType[index];
        select.addEventListener('change', (e) => {
            weeklyPlan.activityType[index] = e.target.value;
            updateMDStatusByActivity(index, e.target.value);
        });
    });
}

// ----- Оновлення MD Status при зміні Activity -----
function updateMDStatusByActivity(dayIndex, value) {
    let status = value === 'REST' ? 'REST' : (value === 'MATCH' ? 'MATCH' : 'TRAIN');
    weeklyPlan.mdStatus[dayIndex] = status;
    renderMDStatus();
}

// ----- Підготовка контейнерів для вправ -----
function setupTaskTemplates() {
    weeklyPlan.templates.forEach((tasks, index) => {
        const container = document.querySelector(`.task-day-container[data-day-index="${index}"]`);
        container.innerHTML = '';
        tasks.forEach(task => {
            const div = document.createElement('div');
            div.textContent = task.name;
            div.className = 'task-item';
            container.appendChild(div);
        });
    });
}

// ----- Модальне вікно для вибору вправ -----
let selectedDayIndex = null;
function setupModal() {
    const modal = document.getElementById('exercise-selection-modal');
    const closeBtn = modal.querySelector('.close-modal-btn');
    const addBtn = document.getElementById('add-selected-btn');

    document.querySelectorAll('.task-day-container').forEach(container => {
        container.addEventListener('click', () => {
            selectedDayIndex = container.dataset.dayIndex;
            openModal(selectedDayIndex);
        });
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    addBtn.addEventListener('click', handleSelectionComplete);
}

// ----- Відкриття модального вікна -----
function openModal(dayIndex) {
    const modal = document.getElementById('exercise-selection-modal');
    modal.style.display = 'block';
    document.getElementById('modal-title-context').textContent = `Вибір вправ для Дня ${parseInt(dayIndex)+1}`;
    renderExerciseList(dayIndex);
}

// ----- Рендер списку вправ у модалі -----
function renderExerciseList(dayIndex) {
    const container = document.getElementById('exercise-list-container');
    container.innerHTML = '';
    const exercises = window.exerciseLibrary || []; // припускаємо, що exercise_library.js надає масив
    exercises.forEach((ex, i) => {
        const div = document.createElement('div');
        div.textContent = ex.name;
        div.className = 'exercise-option';
        div.dataset.index = i;
        div.addEventListener('click', () => {
            div.classList.toggle('selected');
            updateAddButtonCount();
        });
        container.appendChild(div);
    });
    updateAddButtonCount();
}

// ----- Оновлення кнопки додавання вправ -----
function updateAddButtonCount() {
    const addBtn = document.getElementById('add-selected-btn');
    const selectedCount = document.querySelectorAll('#exercise-list-container .selected').length;
    addBtn.textContent = `Додати вибрані (${selectedCount})`;
    addBtn.style.display = selectedCount > 0 ? 'block' : 'none';
}

// ----- Обробка підтвердження вибору вправ -----
function handleSelectionComplete() {
    const selectedExercises = Array.from(document.querySelectorAll('#exercise-list-container .selected')).map(div => {
        const idx = div.dataset.index;
        return window.exerciseLibrary[idx];
    });

    weeklyPlan.templates[selectedDayIndex] = selectedExercises;
    setupTaskTemplates();
    document.getElementById('exercise-selection-modal').style.display = 'none';
    savePlanToStorage();
}

// ----- Збереження форми в localStorage -----
function setupFormSave() {
    const form = document.getElementById('weekly-plan-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        savePlanToStorage();
        alert('Тижневий план та шаблони збережено!');
    });
}

// ----- Функція збереження -----
function savePlanToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weeklyPlan));
}
