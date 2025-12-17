// daily-individual.js
// ФІНАЛЬНА ВЕРСІЯ: ВИПРАВЛЕНО КОНФЛІКТИ, ДАТУ, СТАТУС, РЕКОМЕНДАЦІЇ ТА ФОРМУ ЗВОРОТНОГО ЗВ'ЯЗКУ

const DAILY_STORAGE_KEY = 'weeklyPlanData'; 
const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

// ===================== CONSTANTS (АДАПТОВАНО ПІД КОНФЛІКТИ) =====================
const dayNamesFull = [ 
    'Понеділок','Вівторок','Середа','Четвер','Пʼятниця','Субота','Неділя' 
];

// Карта класів кольору (для відображення MD-статусу)
const MD_COLOR_CLASSES = {
    'MD': 'color-red',
    'MD+1': 'color-dark-green',
    'MD+2': 'color-green',
    'MD-1': 'color-yellow',
    'MD-2': 'color-deep-green',
    'MD-3': 'color-orange',
    'MD-4': 'color-blue',
    'REST': 'color-neutral',
    'TRAIN': 'color-dark-grey'
};

const MD_RECOMMENDATIONS = {
    'MD': 'Сьогодні ігровий день...',
    'MD+1': 'Високе навантаження!',
    'MD+2': 'Середнє навантаження.',
    'MD-1': 'День перед матчем.',
    'MD-2': 'Глибоке відновлення.',
    'MD-3': 'Активний відпочинок.',
    'MD-4': 'Базове тренування.',
    'REST': 'Повний відпочинок.',
    'TRAIN': 'Стандартний тренувальний день.'
};

// ===================== HELPERS =====================
function getCurrentDayIndex() {
    const d = new Date().getDay(); // 0 (Неділя) до 6 (Субота)
    return d === 0 ? 6 : d - 1; 
}

function getCurrentDateFormatted() {
    const today = new Date();
    const dayIndex = today.getDay(); 
    const dayName = dayNamesFull[dayIndex === 0 ? 6 : dayIndex - 1]; 
    
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();

    return `${dayName}, ${day}.${month}.${year}`;
}

function normalizeStage(stage) {
    if (!stage) return 'UNSORTED';
    return stage
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .replace(/^pre-training$/, 'Pre-training')
        .replace(/^main-training$/, 'Main-training')
        .replace(/^post-training$/, 'Post-training');
}

// ===================== COLLAPSIBLE LOGIC =====================
function initializeCollapsibles() {
    const headers = document.querySelectorAll('.stage-header.collapsible');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            if (!content) return;

            const icon = header.querySelector('.toggle-icon');
            const isOpen = content.classList.contains('active');

            content.classList.toggle('active');
            header.classList.toggle('active');

            if (icon) {
                icon.textContent = isOpen ? '►' : '▼';
            }
        });
    });
}

// ===================== EXERCISE ITEM =====================
function createExerciseItemHTML(exercise, index) {
    const todayIndex = getCurrentDayIndex();
    const id = `ex-${todayIndex}-${index}`;
    const checked = localStorage.getItem(id) === 'true' ? 'checked' : '';

    let media = '';
    if (exercise.imageURL) {
        media += `<img src="${exercise.imageURL}" alt="${exercise.name}">`;
    }
    if (exercise.videoKey) {
        media += `<iframe src="${YOUTUBE_EMBED_BASE}${exercise.videoKey}" allowfullscreen></iframe>`;
    }

    return `
        <div class="daily-exercise-item" data-exercise-id="${id}">
            <div class="exercise-content">
                <h4>${exercise.name}</h4>
                <p>${exercise.description || ''}</p>
            </div>
            <div class="media-container">
                ${media}
                <label>
                    <input type="checkbox" ${checked}
                        onchange="localStorage.setItem('${id}', this.checked)">
                    Виконано
                </label>
            </div>
        </div>
    `;
}

// ===================== FEEDBACK FORM LOGIC (ПОВЕРНЕНО) =====================
function loadFeedbackForm() {
    // Шукаємо ваш контейнер id="user-feedback-container"
    const feedbackSection = document.getElementById('user-feedback-container'); 
    
    if (!feedbackSection) return;

    // Вставляємо HTML-структуру форми
    feedbackSection.innerHTML = `
        <h3>Ваш Відгук та Показники Самопочуття</h3>
        <form id="daily-feedback-form">
            <textarea name="feedback_text" rows="4" placeholder="Коментарі щодо тренування та самопочуття..." required></textarea>
            <button type="submit" class="save-button">Надіслати відгук</button>
        </form>
        <p id="feedback-message" style="display:none; color: green;"></p>
    `;

    const form = document.getElementById('daily-feedback-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const feedbackText = form.elements['feedback_text'].value;
            console.log("Відгук надіслано:", feedbackText);
            
            const messageEl = document.getElementById('feedback-message');
            if (messageEl) {
                messageEl.textContent = 'Дякуємо! Ваш відгук отримано.';
                messageEl.style.display = 'block';
                form.reset();
                setTimeout(() => messageEl.style.display = 'none', 3000);
            }
        });
    }
}


// ===================== MAIN LOAD =====================
function loadAndDisplayDailyPlan() {
    const todayIndex = getCurrentDayIndex();
    const planKey = `day_plan_${todayIndex}`;

    const list = document.getElementById('daily-exercise-list');
    
    // 1. ОТРИМАННЯ ЕЛЕМЕНТІВ:
    const currentDateDisplayEl = document.getElementById('current-date-display'); 
    const mdStatusEl = document.getElementById('md-status-display'); 
    const recommendationsSection = document.getElementById('md-recommendations');
    const mdxRangeEl = document.getElementById('mdx-range-display'); 
    const loadingMessageEl = document.getElementById('loading-message'); 

    // Виводимо назву дня та дату
    if (currentDateDisplayEl) currentDateDisplayEl.textContent = getCurrentDateFormatted(); 
    
    // ОЧИЩЕННЯ: Прибираємо "Цикл MDX"
    if (mdxRangeEl) mdxRangeEl.textContent = ''; 
    
    // 2. ЗАВАНТАЖЕННЯ ДАНИХ
    let savedData;
    try {
        savedData = JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY) || '{}');
    } catch (e) {
        console.error("Помилка при зчитуванні плану з localStorage:", e);
        savedData = {};
    }
    
    const todayPlan = savedData[planKey];

    // 3. ЛОГІКА ДЛЯ ВИЗНАЧЕННЯ СТАТУСУ ТА РЕКОМЕНДАЦІЙ:
    let mdStatus = 'REST'; 
    let recommendationText = MD_RECOMMENDATIONS['REST'];
    let defaultStatus = true; 

    if (todayPlan && todayPlan.mdStatus) {
        mdStatus = todayPlan.mdStatus;
        recommendationText = MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN'];
        defaultStatus = false;
    }

    // 4. ВСТАВЛЯЄМО СТАТУС ТА РЕКОМЕНДАЦІЮ В HTML:
    if (mdStatusEl) {
        mdStatusEl.textContent = mdStatus;
        
        const colorClass = MD_COLOR_CLASSES[mdStatus] || MD_COLOR_CLASSES['TRAIN'];
        
        // Видаляємо всі класи кольору, включаючи клас за замовчуванням з HTML
        Object.values(MD_COLOR_CLASSES).forEach(cls => mdStatusEl.classList.remove(cls));
        mdStatusEl.classList.remove('color-dark-grey'); 
        
        // Додаємо коректний клас
        mdStatusEl.classList.add(colorClass);
    }
    
    // Оновлюємо секцію рекомендацій (ЗАГРУЖАЄМО РЕКОМЕНДАЦІЇ)
    if (recommendationsSection) {
        const pElement = recommendationsSection.querySelector('p');
        if (pElement) {
            pElement.textContent = recommendationText;
        } else {
            recommendationsSection.innerHTML = `<p>${recommendationText}</p>`;
        }
    }
    
    if (loadingMessageEl) {
        loadingMessageEl.style.display = 'none'; 
    }
    
    // 5. ВІДОБРАЖЕННЯ ВПРАВ
    if (!list) return;

    if (defaultStatus || !todayPlan.exercises?.length) {
        list.innerHTML = `<p>На сьогодні немає запланованих вправ (або план ще не був збережений у тижневому планувальнику).</p>`;
        return;
    }

    // === GROUP BY STAGE (ОБРОБКА ВПРАВ) ===
    const grouped = {};
    todayPlan.exercises.forEach((ex, i) => {
        const stage = normalizeStage(ex.stage);
        if (!grouped[stage]) grouped[stage] = [];
        grouped[stage].push({ ...ex, originalIndex: i });
    });

    const order = ['Pre-training','Main-training','Post-training','Recovery','UNSORTED'];
    const stages = Object.keys(grouped).sort((a,b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
    });

    let html = '';
    let idx = 1;

    stages.forEach(stage => {
        html += `
            <div class="training-section">
                <h3 class="stage-header collapsible">
                    ${idx++}. ${stage.replace('-', ' ').toUpperCase()}
                    <span class="toggle-icon">►</span>
                </h3>
                <div class="section-content">
                    ${grouped[stage].map(e =>
                        createExerciseItemHTML(e, e.originalIndex)
                    ).join('')}
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
    initializeCollapsibles();
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
    // Ініціалізація форми зворотного зв'язку
    loadFeedbackForm(); 
    // Завантаження плану
    loadAndDisplayDailyPlan();
});
