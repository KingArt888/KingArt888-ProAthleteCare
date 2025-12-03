const STORAGE_KEY = 'weeklyPlanData';
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD+3': { status: 'MD+3', colorClass: 'color-neutral' }, 
    'MD-1': { status: 'MD-1', colorClass: 'color-yellow' }, 
    'MD-2': { status: 'MD-2', colorClass: 'color-deep-green' }, 
    'MD-3': { status: 'MD-3', colorClass: 'color-orange' }, 
    'MD-4': { status: 'MD-4', colorClass: 'color-blue' }, 
    'REST': { status: 'REST', colorClass: 'color-neutral' }, 
    'TRAIN': { status: 'TRAIN', colorClass: 'color-neutral' },
};

document.addEventListener('DOMContentLoaded', () => {
    
    // === ІНІЦІАЛІЗАЦІЯ ЗМІННИХ ===
    const activitySelects = document.querySelectorAll('.activity-type-select');
    const dynamicMatchFields = document.getElementById('dynamic-match-fields');
    const dayCells = document.querySelectorAll('#md-colors-row .cycle-day');
    const form = document.getElementById('weekly-plan-form');
    const saveButton = document.querySelector('.save-button'); 

    if (activitySelects.length === 0 || dayCells.length === 0 || !form) {
        console.error("Помилка: Не знайдено необхідних елементів таблиці або форми.");
        return; 
    }
    
    // =========================================================
    // ФУНКЦІЯ: ЗБЕРЕЖЕННЯ ДАНИХ (ТІЛЬКИ по натисканню кнопки)
    // =========================================================
    function saveData() {
        try {
            const data = {};
            
            document.querySelectorAll('#weekly-plan-form [name]').forEach(element => {
                const name = element.name;
                data[name] = element.value;
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти Тижневий План';
            }, 2000);
        } catch (e) {
            console.error("Помилка при збереженні даних:", e);
        }
    }

    // =========================================================
    // ФУНКЦІЯ: ІНІЦІАЛІЗАЦІЯ ШАБЛОНІВ 
    // =========================================================
    function initializeTemplates() {
        const templates = [
            { name: 'tasks_md_plus_2', defaultText: `1. **Самомасаж (Ролінг/Перкусія):** 10 хв (фокус на квадрицепси, сідниці, спина).\n2. **Мобілізація суглобів:** 15 хв (комплекс на гомілкостоп, тазостегновий суглоб).\n3. **Легкий Стретчинг (статичний):** 15 хв.\n4. **Гідратація:** Посилений контроль водного балансу.` },
            { name: 'tasks_md_plus_3', defaultText: `1. **Загальне Командне Тренування:** Фокус на техніку/тактику.\n2. **Індивідуальна робота:** Легка аеробна активність (15-20 хв).` },
            { name: 'tasks_md_plus_1', defaultText: `1. **Кардіо в легкій зоні (LSD):** 20-30 хв (пульс 120-130 уд/хв) або велотренажер.\n2. **Превентивні вправи:** 15 хв (зміцнення CORE та ротаторної манжети).\n3. **Робота з м'ячем (легка):** Індивідуальні технічні елементи (30 хв).\n4. **Харчування:** Підвищене споживання білка та вуглеводів.` },
            { name: 'tasks_md_minus_4', defaultText: `1. **Силова активація:** 10 хв (динамічна розминка, активація сідничних м'язів).\n2. **Тренування в залі (MAX Load):** 45-60 хв. Фокус на **максимальну/вибухову силу** ніг.\n3. **Пліометрика:** 3-5 сетів, 5 повторень (боксові стрибки/бар'єри).` },
            { name: 'tasks_md_minus_3', defaultText: `1. **CORE-тренування (функціональне):** 20 хв (планки, анти-ротаційні вправи).\n2. **Швидкість (Спринти):** 5-7 x 30 м (95-100% інтенсивності), **повне відновлення**.\n3. **Координація:** 10 хв (координаційні драбини).` },
            { name: 'tasks_md_minus_2', defaultText: `1. **Зал (Верх Тіла):** 30 хв (фокус на баланс сили).\n2. **Ігрові вправи:** Середня/Висока інтенсивність, фокус на **командну тактику/витривалість**.\n3. **Ролінг:** 10 хв (для підтримки еластичності).` },
            { name: 'tasks_md_minus_1', defaultText: `1. **Нейро активація:** 10 хв (сходи, реакція).\n2. **Легка ігрова розминка:** 30 хв (з акцентом на швидкість).\n3. **Пріоритет:** Якісний сон та відновлення (мінімум 8 годин).` }
        ];

        templates.forEach(template => {
            const textarea = document.querySelector(`textarea[name="${template.name}"]`);
            if (textarea && textarea.value.trim() === '') {
                textarea.value = template.defaultText;
            }
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ОТРИМАННЯ ШАБЛОНУ 
    // =========================================================
    function getTemplateText(status) {
        if (status === 'MD') return 'Матч: Індивідуальна розминка/завершення гри';
        if (status === 'REST') return 'Повний відпочинок, відновлення, сон.';
        if (status === 'TRAIN') return 'Загальнокомандне тренування: Специфічні вправи вводити вручну.';

        let fieldName = '';
        const numberMatch = status.match(/(\d+)/); 

        if (!numberMatch) {
            return '';
        }

        const phaseNumber = numberMatch[1]; 

        if (status.startsWith('MD+')) {
            fieldName = `tasks_md_plus_${phaseNumber}`;
        } else if (status.startsWith('MD-')) {
            fieldName = `tasks_md_minus_${phaseNumber}`;
        } else {
            return '';
        }

        const templateElement = document.querySelector(`textarea[name="${fieldName}"]`);

        if (!templateElement) {
            // Ця помилка означає, що у вас в HTML немає потрібних textarea-шаблонів
            console.error(`Помилка: Не знайдено textarea з іменем: ${fieldName}`); 
            return '';
        }

        const phaseTitle = `**Фаза: ${status}**\n`;
        return phaseTitle + templateElement.value.trim();
    }

    // =========================================================
    // ФУНКЦІЯ: toggleDayInputs (Управління активністю полів)
    // =========================================================
    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        try {
            const dailyTaskField = document.querySelector(`[name="daily_task_${dayIndex}"]`);
            
            if (dailyTaskField) {
                 // Спочатку встановлюємо дефолтний стан
                 let shouldDisable = true;
                 
                 if (isPlanActive) {
                     // Якщо план активний, поле активне для TRAIN, MATCH та MD-фаз
                     if (activityType !== 'REST') {
                         shouldDisable = false;
                     }
                 } else {
                     // Якщо плану немає, поле блокується і ставиться заглушка
                     dailyTaskField.value = 'Оберіть МАТЧ для активації планування.';
                 }
                 
                 dailyTaskField.disabled = shouldDisable;
                 
                 if (shouldDisable) {
                     dailyTaskField.classList.add('day-disabled');
                 } else {
                     dailyTaskField.classList.remove('day-disabled');
                     // Очищаємо заглушку, якщо поле стало активним
                     if (dailyTaskField.value === 'Оберіть МАТЧ для активації планування.') {
                         dailyTaskField.value = ''; 
                     }
                 }
            }

            // Поля деталей матчу (активні тільки якщо обрано MATCH)
            const fieldPrefixesToDisable = ['opponent', 'venue', 'travel_km'];
            
            fieldPrefixesToDisable.forEach(prefix => {
                const element = document.querySelector(`[name="${prefix}_${dayIndex}"]`);
                if (element) {
                     const shouldBeDisabled = (activityType !== 'MATCH');
                     element.disabled = shouldBeDisabled;
                     
                     if (shouldBeDisabled) {
                         element.classList.add('day-disabled');
                     } else {
                         element.classList.remove('day-disabled');
                     }
                }
            });
        } catch (e) {
            console.error("Помилка у toggleDayInputs:", e);
        }
    }


    // =========================================================
    // ФУНКЦІЯ: updateMatchDetails
    // =========================================================
    function updateMatchDetails(dayIndex, activityType, savedValues = {}) {
        const existingBlock = dynamicMatchFields.querySelector(`.match-detail-block[data-day-index="${dayIndex}"]`);
        const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];
        const dayName =
