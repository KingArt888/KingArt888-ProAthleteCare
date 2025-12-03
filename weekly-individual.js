const STORAGE_KEY = 'weeklyPlanData';
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD+3': { status: 'MD+3', colorClass: 'color-neutral' }, // Додано MD+3
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
    
    // Допоміжна функція для отримання індексу дня з імені поля
    function getDayIndexFromName(name) {
        const indexNumMatch = name.match(/_(\d+)/);
        if (indexNumMatch) {
            return parseInt(indexNumMatch[1], 10);
        }
        return -1;
    }

    // =========================================================
    // ФУНКЦІЯ: ЗБЕРЕЖЕННЯ ДАНИХ (Використовує localStorage)
    // =========================================================
    function saveData() {
        try {
            const formData = new FormData(form);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            saveButton.textContent = 'Збережено! (✔)';
            setTimeout(() => {
                saveButton.textContent = 'Зберегти зміни';
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
            { name: 'tasks_md_plus_2', defaultText: 
                `1. **Самомасаж (Ролінг/Перкусія):** 10 хв (фокус на квадрицепси, сідниці, спина).
2. **Мобілізація суглобів:** 15 хв (комплекс на гомілкостоп, тазостегновий суглоб).
3. **Легкий Стретчинг (статичний):** 15 хв.
4. **Гідратація:** Посилений контроль водного балансу.`
            },
            // ВИПРАВЛЕННЯ: Додано MD+3
            { name: 'tasks_md_plus_3', defaultText: 
                `1. **Загальне Командне Тренування:** Фокус на техніку/тактику.
2. **Індивідуальна робота:** Легка аеробна активність (15-20 хв).`
            },
            { name: 'tasks_md_plus_1', defaultText: 
                `1. **Кардіо в легкій зоні (LSD):** 20-30 хв (пульс 120-130 уд/хв) або велотренажер.
2. **Превентивні вправи:** 15 хв (зміцнення CORE та ротаторної манжети).
3. **Робота з м'ячем (легка):** Індивідуальні технічні елементи (30 хв).
4. **Харчування:** Підвищене споживання білка та вуглеводів.`
            },
            { name: 'tasks_md_minus_4', defaultText: 
                `1. **Силова активація:** 10 хв (динамічна розминка, активація сідничних м'язів).
2. **Тренування в залі (MAX Load):** 45-60 хв. Фокус на **максимальну/вибухову силу** ніг.
3. **Пліометрика:** 3-5 сетів, 5 повторень (боксові стрибки/бар'єри).`
            },
            { name: 'tasks_md_minus_3', defaultText: 
                `1. **CORE-тренування (функціональне):** 20 хв (планки, анти-ротаційні вправи).
2. **Швидкість (Спринти):** 5-7 x 30 м (95-
