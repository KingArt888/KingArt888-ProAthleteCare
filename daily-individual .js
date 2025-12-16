// daily-individual.js

const STORAGE_KEY = 'weeklyPlanData';
const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

// Колірна палітра MD
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
const dayNamesFull = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];

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

/**
 * Отримує індекс сьогоднішнього дня (0=Пн, 6=Нд)
 */
function getCurrentDayIndex() {
    const today = new Date();
    const jsDay = today.getDay(); 
    return (jsDay === 0) ? 6 : jsDay - 1; 
}

/**
 * Зберігає/оновлює статус виконання вправи в localStorage
 */
function toggleCompletion(id, isChecked) {
    localStorage.setItem(id, isChecked);
    const exerciseBlock = document.querySelector(`[data-exercise-id="${id}"]`);
    if (exerciseBlock) {
         // exerciseBlock.style.opacity = isChecked ? 0.7 : 1; 
    }
    console.log(`Статус вправи ${id} встановлено: ${isChecked}`);
}

/**
 * Обробка відправки форми зворотного зв'язку
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
 * Оновлення відображення форми/відгуку
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


/**
 * Визначає тижневий діапазон MD-статусів (MDX)
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
    
    const mdOrder = [
        'MD+3', 'MD+2', 'MD+1', 'MD', 'MD-1', 'MD-2', 'MD-3', 'MD-4', 'MD-5', 'MD-6'
    ]; 
    
    if (mdStatuses.length === 0) {
        return "Базовий / REST";
    }
    
    let minIndex = mdOrder.length; 
    let maxIndex = -1;             
    
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
 * Генерує HTML для відображення однієї вправи
 */
function createExerciseItemHTML(exercise, index) {
    const uniqueId = `ex-${getCurrentDayIndex()}-${index}`; 
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

    // Краще оформлення Sets/Reps
    let descriptionDisplay = `<p><strong>Параметри/Опис:</strong> ${exercise.description}</p>`;
    
    if (exercise.sets || exercise.reps) {
        const setsReps = (exercise.sets ? `${exercise.sets} підходів` : '') + 
                         (exercise.sets && exercise.reps ? ', ' : '') + 
                         (exercise.reps ? `${exercise.reps} повторень` : '');
        
        descriptionDisplay = `
            <p class="sets-reps-display">
                <span style="color:#FFD700; font-size:1.1em;">${setsReps}</span>
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
 * Завантажує та відображає план на сьогоднішній день
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
    
    if (!statusDisplay || !listContainer || !dateDisplay || !recommendationContainer || !mdxRangeDisplay) {
        console.error("❌ Критична помилка: Не знайдено один або кілька контейнерів у daily-individual.html.");
        if (listContainer) {
            listContainer.innerHTML = '<p style="color:red;">❌ Критична помилка: Не знайдено контейнери для відображення плану. Перевірте HTML.</p>';
        }
        return;
    }
    
    const today = new Date();
    dateDisplay.textContent = `(${dayNamesFull[today.getDay()]}, ${today.toLocaleDateString('uk-UA')})`;

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
        Object.values(COLOR_MAP).forEach(map => statusDisplay.classList.remove(map.colorClass)); 
        statusDisplay.classList.add(style.colorClass); 
        
        // --- Відображення Рекомендацій ---
        const recommendation = MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN'];
        recommendationContainer.innerHTML = `
            <p><strong>Рекомендація:</strong> ${recommendation}</p>
        `;

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
        
        let exercisesHtml = '';
        let currentStage = '';

        todayPlan.exercises.forEach((exercise, index) => {
            if (exercise.stage && exercise.stage !== currentStage) {
                currentStage = exercise.stage;
                exercisesHtml += `<h3 class="stage-header">${currentStage.replace('-', ' ')}</h3>`;
            }
            exercisesHtml += createExerciseItemHTML(exercise, index); 
        });

        listContainer.innerHTML = exercisesHtml;
        
        // Відображення секції зворотного зв'язку
        updateFeedbackDisplay();

    } catch (e) {
        console.error("Помилка при завантаженні щоденного плану:", e);
        listContainer.innerHTML = '<p style="color:red;">❌ Виникла критична помилка при завантаженні плану тренувань. Перевірте console.</p>';
    }
}


/**
 * Логіка для перемикання бічної панелі на мобільних пристроях
 */
function setupMenuToggle() {
    const toggleButton = document.getElementById('menu-toggle-button');
    const sidebar = document.getElementById('main-sidebar');

    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}


// Запуск при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayDailyPlan();
});
