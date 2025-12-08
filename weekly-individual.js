// ... (на початку файлу, після констант) ...
// Змінюємо функцію генерації вправ
function generateRandomExercises(stage, category, count) {
    const categoryData = EXERCISE_LIBRARY[stage] && EXERCISE_LIBRARY[stage][category] ? 
                         EXERCISE_LIBRARY[stage][category] : null;

    if (!categoryData || categoryData.exercises.length === 0) {
        console.warn(`Категорія ${stage} / ${category} не знайдена або порожня.`);
        return [];
    }
    
    const availableExercises = categoryData.exercises;
    const shuffled = [...availableExercises].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// ... (далі по файлу) ...

// =========================================================
// 5. УПРАВЛІННЯ ВИБОРОМ ВПРАВ (МОДАЛЬНЕ ВІКНО)
// =========================================================

// Зберігає контекст (який день, категорія)
let currentExerciseContext = null; 

function createExerciseHTML(exercise, stage, category) {
    // Функція створює HTML для однієї вправи в модальному вікні
    return `
        <div class="exercise-select-item" 
             data-name="${exercise.name}" 
             data-description="${exercise.description}" 
             data-videokey="${exercise.videoKey || ''}"
             data-stage="${stage}"
             data-category="${category}">
            <strong>${exercise.name}</strong>
            <p>${exercise.description.substring(0, 50)}...</p>
            <div class="select-buttons">
                <button type="button" class="select-exercise-btn gold-button">Вибрати</button>
            </div>
        </div>
    `;
}

function renderExerciseList(exercises, stage, category) {
    const listContainer = document.getElementById('exercise-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = ''; 

    if (exercises.length === 0) {
        listContainer.innerHTML = '<p>Не знайдено вправ за цими критеріями. Спробуйте іншу якість.</p>';
        return;
    }

    exercises.forEach(ex => {
        listContainer.innerHTML += createExerciseHTML(ex, stage, category);
    });

    // Додаємо слухач для кнопки "Вибрати"
    listContainer.querySelectorAll('.select-exercise-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.closest('.exercise-select-item');
            if (item && currentExerciseContext) {
                 insertExerciseManually(
                    currentExerciseContext.dayIndex,
                    currentExerciseContext.mdStatus,
                    item.dataset.stage,
                    item.dataset.category,
                    {
                        name: item.dataset.name,
                        description: item.dataset.description,
                        videoKey: item.dataset.videokey
                    }
                 );
                 closeExerciseModal();
            }
        });
    });
}

function openExerciseModal(dayIndex, mdStatus, stage, category) {
    const modal = document.getElementById('exercise-selection-modal');
    if (!modal) return;
    
    currentExerciseContext = { dayIndex, mdStatus, stage, category };
    
    // Заповнюємо фільтри та відображаємо початковий список
    const qualityFilters = document.getElementById('quality-filters');
    qualityFilters.innerHTML = QUALITIES.map(q => 
        `<button type="button" class="quality-filter-btn" data-quality="${q}">${q}</button>`
    ).join('');
    
    // Додаємо слухачі для фільтрів
    qualityFilters.querySelectorAll('.quality-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
             // Знімаємо активність з усіх, встановлюємо на поточний
             qualityFilters.querySelectorAll('.quality-filter-btn').forEach(b => b.classList.remove('active'));
             e.target.classList.add('active');
             filterExercises(e.target.dataset.quality);
        });
    });

    // Відображаємо всі вправи для даної Stage/Category
    const initialExercises = EXERCISE_LIBRARY[stage] && EXERCISE_LIBRARY[stage][category] ? 
                             EXERCISE_LIBRARY[stage][category].exercises : [];
    
    document.getElementById('modal-title-context').textContent = `Вибір вправи: ${stage} / ${category}`;
    
    renderExerciseList(initialExercises, stage, category);
    modal.style.display = 'flex';
}

function filterExercises(quality) {
    const allExercises = [];
    const { stage, category } = currentExerciseContext;

    // Шукаємо вправи в межах поточної фази (Pre, Main, Post)
    for (const [s, categories] of Object.entries(EXERCISE_LIBRARY)) {
        for (const [c, data] of Object.entries(categories)) {
            if (data.qualities && data.qualities.includes(quality)) {
                 data.exercises.forEach(ex => {
                     allExercises.push({ ...ex, stage: s, category: c });
                 });
            }
        }
    }
    
    // Відображаємо відфільтрований список. Ми дозволяємо вибирати вправи з будь-якої категорії, якщо вони відповідають якості.
    renderExerciseList(allExercises, stage, category);
}

function insertExerciseManually(dayIndex, mdStatus, stage, category, exercise) {
     const dayBlock = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
     if (!dayBlock) return;
     
     // Створюємо HTML для нової вправи
     const newExHtml = `
         <div class="exercise-item new-manual" data-day-index="${dayIndex}" data-stage="${stage}" data-category="${category}" data-videokey="${exercise.videoKey || ''}">
             <div class="exercise-fields">
                  <label>Назва вправи:</label>
                  <input type="text" value="${exercise.name || ''}" data-field="name">
                  <label>Параметри / Опис:</label>
                  <textarea data-field="description">${exercise.description || ''}</textarea>
                  <div class="exercise-actions">
                      <button type="button" class="replace-btn" data-stage="${stage}" data-category="${category}">🔄 Замінити</button>
                      <button type="button" class="remove-btn">❌ Видалити</button>
                  </div>
             </div>
         </div>
     `;

     // Знаходимо контейнер, куди вставити
     let targetStageContainer = dayBlock.querySelector(`.generated-exercises-list`);
     
     if (targetStageContainer) {
         // Простий спосіб: додаємо в кінець списку згенерованих вправ
         targetStageContainer.insertAdjacentHTML('beforeend', newExHtml);
     } else {
          // Якщо списку ще немає, створюємо його (це може статися, якщо план був порожній)
          const listContainer = document.createElement('div');
          listContainer.className = 'generated-exercises-list';
          listContainer.innerHTML = '<h4>Згенерований план (ручне редагування)</h4>';
          listContainer.innerHTML += newExHtml;
          dayBlock.appendChild(listContainer);
     }
     
     // Перевстановлюємо слухачі для кнопок "Видалити/Замінити" у цьому блоці
     addExerciseControlListeners(dayBlock); 
}

function closeExerciseModal() {
    const modal = document.getElementById('exercise-selection-modal');
    if (modal) {
        modal.style.display = 'none';
        currentExerciseContext = null;
    }
}


// Змінюємо функцію renderDayTemplateInput для додавання кнопки "Додати вручну"
function renderDayTemplateInput(dayIndex, mdStatus, savedTemplates) {
    const dayBlock = document.querySelector(`.task-day-container[data-day-index="${dayIndex}"]`);
    if (!dayBlock) return;
    // ... (існуючий код) ...
    
    // Додаємо кнопку після полів кількості вправ
    if (mdStatus !== 'REST') {
        categories.forEach(category => {
            const addBtnId = `add_btn_${dayIndex}_${stage.replace(/\s/g, '-')}_${category}`;
             html += `
                <div class="template-add-row" ${rowStyle}>
                    <button type="button" class="add-manual-exercise-btn" 
                            data-day-index="${dayIndex}" 
                            data-md-status="${mdStatus}" 
                            data-stage="${stage}"
                            data-category="${category}">
                         + Додати ${category} вручну
                    </button>
                </div>
             `;
        });
    }

    html += `</div>`;
    // ... (існуючий код) ...
}

// Додаємо слухачі в DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ... (існуючі слухачі) ...

    // НОВЕ: Слухач для кнопки "Додати вручну"
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-manual-exercise-btn')) {
            const { dayIndex, mdStatus, stage, category } = e.target.dataset;
            openExerciseModal(dayIndex, mdStatus, stage, category);
        }
    });
    
    // Слухач для закриття модального вікна
    const modal = document.getElementById('exercise-selection-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'exercise-selection-modal' || e.target.classList.contains('close-modal-btn')) {
                closeExerciseModal();
            }
        });
    }

    loadData();
});
