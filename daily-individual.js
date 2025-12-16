// daily-individual.js - Логіка відображення щоденного індивідуального плану тренувань

const STORAGE_KEY = 'weeklyPlanData';
const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

/**
 * @const {Object.<string, {status: string, colorClass: string}>} COLOR_MAP - Колірна палітра MD-статусів.
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

/**
 * @const {string[]} dayNamesFull - Повні назви днів тижня, починаючи з Неділі (для new Date().getDay()).
 */
const dayNamesFull = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];

/**
 * @const {Object.<string, string>} MD_RECOMMENDATIONS - Рекомендації для кожного MD-статусу.
 */
const MD_RECOMMENDATIONS = {
    'MD': 'Сьогодні ігровий день. Зосередьтеся на швидкому відновленні, живленні та психологічній готовності. Уникайте важких фізичних навантажень, якщо вони не є частиною розминки.',
    'MD+1': 'Високе навантаження! Це ключовий тренувальний день. Максимальна інтенсивність і концентрація. Обов’язково виконуйте відновлювальні процедури після тренування.',
    'MD+2': 'Середнє навантаження. Хороший день для технічної роботи та помірної сили. Слідкуйте за самопочуттям, забезпечте якісний сон.',
    'MD-1': 'Низьке навантаження. День перед матчем. Легке, активуюче тренування. Фокус на швидкості та тактиці. Відпочинок — пріоритет!',
    'MD-2': 'Глибоке відновлення. Робота над якістю руху, мобільністю та м’язовою активацією. Використовуйте пінний ролик та стретчинг.',
    'MD-3': 'Активний відпочинок або дуже низька інтенсивність. Прогулянка, плавання, легке кардіо. Важливо для ментального та фізичного розвантаження.',
    'MD-4': 'Базове тренування/перехід. Можна включити легку загальнофізичну підготовку. Слідкуйте за тим, щоб не перевантажити м’язи.',
    'REST': 'ПОВНИЙ ВІДПОЧИНОК. Не тренуватися. Харчування та сон — єдині завдання.',
    'TRAIN': 'Стандартний тренувальний день без чіткої прив\'язки до матчу. Виконуйте заплановану програму згідно з вашим мікроциклом.'
};

/* ======================================================= */
/* --- ДОПОМІЖНІ ФУНКЦІЇ --- */
/* ======================================================= */

/**
 * Отримує індекс сьогоднішнього дня (0=Пн, 6=Нд) відповідно до структури плану.
 * JavaScript getDay() повертає 0=Нд, 1=Пн... 6=Сб.
 * Ми конвертуємо: 0=Пн, 6=Нд.
 * @returns {number} Індекс дня тижня (0-6).
 */
function getCurrentDayIndex() {
    const today = new Date();
    const jsDay = today.getDay(); 
    return (jsDay === 0) ? 6 : jsDay - 1; 
}

/**
 * Нормалізує назву етапу (stage) для групування.
 * @param {string|null} stage - Оригінальна назва етапу.
 * @returns {string} Нормалізована назва етапу.
 */
function normalizeStage(stage) {
    if (!stage) return 'UNSORTED';

    const s = stage
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    if (s === 'pre-training') return 'Pre-training';
    if (s === 'main-training') return 'Main-training';
    if (s === 'post-training') return 'Post-training';

    return 'UNSORTED';
}

/* ======================================================= */
/* --- ОБРОБКА ВИКОНАННЯ ВПРАВ ТА ЗВОРОТНОГО ЗВ'ЯЗКУ --- */
/* ======================================================= */

/**
 * Зберігає/оновлює статус виконання вправи в localStorage.
 * @param {string} id - Унікальний ID вправи.
 * @param {boolean} isChecked - Статус виконання.
 */
function toggleCompletion(id, isChecked) {
    localStorage.setItem(id, isChecked);
    const exerciseBlock = document.querySelector(`[data-exercise-id="${id}"]`);
    if (exerciseBlock) {
         // Закоментований ефект: exerciseBlock.style.opacity = isChecked ? 0.7 : 1; 
    }
    console.log(`Статус вправи ${id} встановлено: ${isChecked}`);
}

/**
 * Обробка відправки форми зворотного зв'язку.
 */
function submitFeedback() {
    const feedbackText = document.getElementById('user-feedback-text').value.trim();
    const ratingValue = document.getElementById('user-rating').value;

    if (!feedbackText && ratingValue === '3') { 
        alert("Будь ласка, введіть відгук або оберіть оцінку, відмінну від 3, перед відправкою.");
        return;
    }

    const todayIndex = getCurrentDayIndex();
    const todayFeedbackKey = `feedback_day_${todayIndex}`;
    
    const feedbackData = {
        date: new Date().toLocaleDateString('uk-UA'),
        text: feedbackText,
        rating: ratingValue
    };

    localStorage.setItem(todayFeedbackKey, JSON.stringify(feedbackData));

    alert("Ваш відгук успішно збережено! Дякуємо.");
    updateFeedbackDisplay(feedbackData);
}

/**
 * Оновлення відображення форми/збереженого відгуку.
 * @param {Object|null} feedbackData - Збережені дані відгуку.
 */
function updateFeedbackDisplay(feedbackData = null) {
    const container = document.getElementById('user-feedback-container');
    if (!container) return;

    const todayIndex = getCurrentDayIndex();
    const savedFeedback = feedbackData || JSON.parse(localStorage.getItem(`feedback_day_${todayIndex}`) || 'null');
    
    if (savedFeedback) {
        container.innerHTML = `
            <h3>✅ Ваш Відгук на Сьогодні:</h3>
            <p><strong>Оцінка навантаження:</strong> ${savedFeedback.rating} / 5</p>
            <p><strong>Коментар:</strong> ${savedFeedback.text || 'Коментар відсутній.'}</p>
        `;
    } else {
        container.innerHTML = `
            <h3>✍️ Зворотний Зв'язок на Кінець Дня</h3>
            <div class="feedback-form">
                <p>Як ви оцінюєте загальне навантаження сьогодні (1-легко, 5-дуже важко)?</p>
                <input type="range" id="user-rating" min="1" max="5" value="3" oninput="document.getElementById('rating-value-display').innerText = this.value">
                <span id="rating-value-display">3</span> / 5
                
                <p>Ваш коментар для тренера:</p>
                <textarea id="user-feedback-text" rows="3" placeholder="Введіть ваші відчуття, проблеми чи успіхи..."></textarea>
                
                <button onclick="submitFeedback()">Відправити Відгук</button>
            </div>
        `;
    }
}


/* ======================================================= */
/* --- ЛОГІКА MDX ТА ГЕНЕРАЦІЯ HTML --- */
/* ======================================================= */

/**
 * Визначає тижневий діапазон MD-статусів (MDX) для відображення навантаження.
 * @param {Object} savedData - Дані тижневого плану з localStorage.
 * @returns {string} Рядок з діапазоном MDX (наприклад, "MD+2 до MD-1").
 */
function calculateMdxRange(savedData) {
    const mdStatuses = [];
    
    for (let i = 0; i < 7; i++) {
        const planKey = `day_plan_${i}`;
        let status = '';
        
        if (savedData[planKey] && savedData[planKey].mdStatus) {
            status = savedData[planKey].mdStatus;
        } else if (savedData[`activity_${i}`]) {
            status = savedData[`activity_${i}`] === 'MATCH' ? 'MD' : (savedData[`activity_${i}`] === 'REST' ? 'REST' : 'TRAIN');
        }

        if (status.startsWith('MD')) {
             mdStatuses.push(status);
        }
    }
    
    // Порядок MD-статусів від найвищого навантаження до найнижчого
    const mdOrder = [
        'MD+3', 'MD+2', 'MD+1', 'MD', 'MD-1', 'MD-2', 'MD-3', 'MD-4', 'MD-5', 'MD-6'
    ]; 
    
    if (mdStatuses.length === 0) {
        return "Базовий / REST";
    }
    
    let minIndex = mdOrder.length; // Найменший індекс (найвище навантаження)
    let maxIndex = -1;             // Найбільший індекс (найнижче навантаження)
                      
    mdStatuses.forEach(status => {
        const index = mdOrder.indexOf(status);
        if (index !== -1) {
            if (index < minIndex) minIndex = index; 
            if (index > maxIndex) maxIndex = index; 
        }
    });

    if (minIndex <= maxIndex && minIndex < mdOrder.length) {
        return `${mdOrder[minIndex]} до ${mdOrder[maxIndex]}`;
    }
    
    return "Не визначено";
}


/**
 * Генерує HTML для відображення однієї вправи.
 * @param {Object} exercise - Об'єкт вправи.
 * @param {number} index - Оригінальний індекс вправи в масиві.
 * @returns {string} HTML-розмітка для елемента вправи.
 */
function createExerciseItemHTML(exercise, index) {
    const todayIndex = getCurrentDayIndex();
    // Унікальний ID, прив'язаний до дня та позиції
    const uniqueId = `ex-${todayIndex}-${index}`; 
    const isCompleted = localStorage.getItem(uniqueId) === 'true' ? 'checked' : '';

    let mediaHtml = '';

    if (exercise.imageURL) {
        mediaHtml += `<img src="${exercise.imageURL}" alt="${exercise.name}">`;
    }

    if (exercise.videoKey) {
        mediaHtml += `
            <iframe 
                src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" 
                frameborder="0" allowfullscreen>
            </iframe>
        `;
    }

    const stageDisplay = exercise.stage ? `<p><strong>Етап:</strong> ${exercise.stage.replace('-', ' ')}</p>` : '';
    const categoryDisplay = exercise.category ? `<p><strong>Категорія:</strong> ${exercise.category}</p>` : '';

    // Форматування Sets/Reps
    let descriptionDisplay = exercise.description ? `<p><strong>Параметри/Опис:</strong> ${exercise.description}</p>` : '';
    
    if (exercise.sets || exercise.reps) {
        const setsReps = (exercise.sets ? `${exercise.sets} підходів` : '') + 
                             (exercise.sets && exercise.reps ? ', ' : '') + 
                             (exercise.reps ? `${exercise.reps} повторень` : '');
        
        // Використовуємо окремий блок для Sets/Reps
        descriptionDisplay = `
            <p class="sets-reps-display">
                <span style="color:#FFC72C; font-size:1.1em;">${setsReps}</span>
            </p>
            ${exercise.description ? `<p>Деталі: ${exercise.description}</p>` : ''}
        `;
    }

    return `
        <div class="daily-exercise-item" data-exercise-id="${uniqueId}">
            
            <div class="exercise-content">
                <h4>${exercise.name}</h4>
                <div class="exercise-details">
                    ${stageDisplay}
                    ${categoryDisplay}
                    ${descriptionDisplay} 
                </div>
            </div>

            <div class="media-container">
                ${mediaHtml}
                <div class="completion-section">
                    <label for="${uniqueId}">Виконано:</label>
                    <input type="checkbox" id="${uniqueId}" ${isCompleted} 
                               onchange="toggleCompletion('${uniqueId}', this.checked)">
                </div>
            </div>
        </div>
    `;
}


/**
 * Завантажує та відображає план на сьогоднішній день.
 */
function loadAndDisplayDailyPlan() {
    const todayIndex = getCurrentDayIndex(); 
    const planKey = `day_plan_${todayIndex}`;
    
    // 1. Отримання елементів DOM
    const statusDisplay = document.getElementById('md-status-display');
    const listContainer = document.getElementById('daily-exercise-list');
    const dateDisplay = document.getElementById('current-date-display');
    const recommendationContainer = document.getElementById('md-recommendations'); 
    const mdxRangeDisplay = document.getElementById('mdx-range-display'); 
    
    // Перевірка наявності всіх критичних елементів
    if (!statusDisplay || !listContainer || !dateDisplay || !recommendationContainer || !mdxRangeDisplay) {
        console.error("❌ Критична помилка: Не знайдено один або кілька контейнерів у daily-individual.html.");
        if (listContainer) {
            listContainer.innerHTML = '<p style="color:red;">❌ Критична помилка: Не знайдено контейнери для відображення плану. Перевірте HTML.</p>';
        }
        return;
    }
    
    const today = new Date();
    // Використовуємо dayNamesFull[today.getDay()] для коректної назви дня
    dateDisplay.textContent = (`${dayNamesFull[today.getDay()]}, ${today.toLocaleDateString('uk-UA')}`);

    try {
        const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const todayPlan = savedData[planKey];
        
        let mdStatus = 'TRAIN';
        if (todayPlan && todayPlan.mdStatus) {
            mdStatus = todayPlan.mdStatus;
        } else if (savedData[`activity_${todayIndex}`]) {
            mdStatus = savedData[`activity_${todayIndex}`] === 'MATCH' ? 'MD' : (savedData[`activity_${todayIndex}`] === 'REST' ? 'REST' : 'TRAIN');
        }

        // --- Відображення MDX та статусу ---
        mdxRangeDisplay.textContent = calculateMdxRange(savedData);
        const style = COLOR_MAP[mdStatus] || COLOR_MAP['TRAIN'];
        statusDisplay.textContent = style.status;
        
        // Очищення та додавання класу кольору
        Object.values(COLOR_MAP).forEach(map => statusDisplay.classList.remove(map.colorClass)); 
        statusDisplay.classList.add(style.colorClass); 
        
        // --- Відображення Рекомендацій ---
        const recommendation = MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN'];
        recommendationContainer.innerHTML = `
            <p><strong>Рекомендація:</strong> ${recommendation}</p>
        `;

        // Перевірка наявності вправ
        if (!todayPlan || !todayPlan.exercises || todayPlan.exercises.length === 0) {
            listContainer.innerHTML = `
                <div class="note-info" style="color: #EEE; border: 1px solid #FFD700; padding: 15px; border-radius: 6px; background-color: #333;">
                    <h3 style="color:#FFD700;">На сьогодні немає запланованих вправ.</h3>
                    ${style.status === 'REST' ? '<p>Це день повного відновлення. Добре відновлюйтесь!</p>' : '<p>Зверніться до тренера (Weekly Individual), щоб запланувати тренування.</p>'}
                </div>
            `;
            updateFeedbackDisplay();
            return;
        }
        
        // ----------------------------------------------------------------------
        // БЛОК: ГЕНЕРАЦІЯ ВКЛАДОК ДЛЯ ВСІХ ІСНУЮЧИХ ЕТАПІВ
        // ----------------------------------------------------------------------
        
        let exercisesByStage = {};
        // 1. Групування вправ за їхнім етапом (stage)
        todayPlan.exercises.forEach((exercise, index) => {
            const stage = normalizeStage(exercise.stage);
            if (!exercisesByStage[stage]) {
                exercisesByStage[stage] = [];
            }
            // Зберігаємо оригінальний індекс для унікального ID
            exercisesByStage[stage].push({ ...exercise, originalIndex: index }); 
        });
        
        let exercisesHtml = '';
        let stageIndex = 0;
        
        // 2. Визначення порядку відображення
        const stageOrder = ['Pre-training', 'Main-training', 'Post-training', 'Recovery', 'UNSORTED'];
        
        // Створюємо масив унікальних етапів, які мають бути відрендерені
        const allStages = Object.keys(exercisesByStage);
        
        // Сортування: спочатку відомі етапи, потім інші за алфавітом
        allStages.sort((a, b) => {
             const indexA = stageOrder.indexOf(a);
             const indexB = stageOrder.indexOf(b);
             
             if (indexA !== -1 && indexB !== -1) return indexA - indexB; // Обидва відомі: за порядком
             if (indexA !== -1) return -1; // A відомий: A йде першим
             if (indexB !== -1) return 1;  // B відомий: B йде першим
             
             return a.localeCompare(b); // Обидва невідомі: за алфавітом
        });


        // 3. Генерація HTML для кожного етапу
        allStages.forEach(stageKey => {
            if (exercisesByStage[stageKey] && exercisesByStage[stageKey].length > 0) {
                stageIndex++;
                
                // Класи для управління CSS: активний клас пустий, щоб приховати вміст (FOUC fix)
                const activeClass = ''; 
                // Іконка "закрита" (вправо)
                const icon = '►'; 
                
                const stageTitle = stageKey.replace('-', ' ').toUpperCase();
                
                exercisesHtml += `<div class="training-section">`;

                // Заголовок (Клікабельна вкладка)
                exercisesHtml += `
                    <h3 class="stage-header collapsible ${activeClass}">
                        ${stageIndex}. ${stageTitle} <span class="toggle-icon">${icon}</span>
                    </h3>
                `;
                // Вміст вправ (Контейнер)
                exercisesHtml += `<div class="section-content ${activeClass}">`;
                
                exercisesByStage[stageKey].forEach((exercise) => {
                    exercisesHtml += createExerciseItemHTML(exercise, exercise.originalIndex); 
                });
                
                exercisesHtml += `</div></div>`; 
            }
        });

        listContainer.innerHTML = exercisesHtml;
        
        // !!! КРИТИЧНИЙ ВИКЛИК !!! 
        // Запускаємо ініціалізацію слухачів КЛІКІВ (функція має бути визначена у HTML/іншому файлі)
        if (window.initializeCollapsibles) {
            window.initializeCollapsibles();
        } else {
            console.warn("initializeCollapsibles() не знайдено. Переконайтеся, що JS-блок з цією функцією визначено в daily-individual.html.");
        }
        
        // Відображення секції зворотного зв'язку
        updateFeedbackDisplay();

    } catch (e) {
        console.error("Помилка при завантаженні щоденного плану:", e);
        listContainer.innerHTML = '<p style="color:red;">❌ Виникла критична помилка при завантаженні плану тренувань. Перевірте console.</p>';
    }
}


function normalizeStage(stage) {
    if (!stage) return 'UNSORTED';

    return stage
        .toLowerCase()
        .replace(/\s+/g, '-')   // пробіли → дефіс
        .replace(/--+/g, '-')   // подвійні дефіси
        .replace(/training$/, 'training') // захист
        .replace(/^pre-training$/, 'Pre-training')
        .replace(/^main-training$/, 'Main-training')
        .replace(/^post-training$/, 'Post-training');
}



// Запуск при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayDailyPlan();
});
