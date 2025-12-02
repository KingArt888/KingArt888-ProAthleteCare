// =========================================================
// weekly-individual.js - V22.0 (ВИПРАВЛЕНО: Повний Код)
// =========================================================

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
    // ФУНКЦІЯ: ІНІЦІАЛІЗАЦІЯ ШАБЛОНІВ (Вставляє текст за замовчуванням)
    // =========================================================
    function initializeTemplates() {
        const templates = [
            { name: 'tasks_md_plus_2', defaultText: 'Ролінг (10 хв), Стречінг (15 хв), Мобілізація суглобів' },
            { name: 'tasks_md_plus_1', defaultText: 'Ролінг (10 хв), Мобілізація, Превентивні вправи, Темпова пробіжка після тренування' },
            { name: 'tasks_md_minus_4', defaultText: 'Силова активація до тренувань, Вправи на розвиток вибухової сили' },
            { name: 'tasks_md_minus_3', defaultText: 'Core до тренувань, та спринти після' },
            { name: 'tasks_md_minus_2', defaultText: 'Масаж на ролах, Превентивні вправи, Зал на верхню частину тіла' },
            { name: 'tasks_md_minus_1', defaultText: 'Нейро активація до тренування, Легка ігрова розминка' }
        ];

        templates.forEach(template => {
            const textarea = document.querySelector(`textarea[name="${template.name}"]`);
            if (textarea && textarea.value.trim() === '') {
                textarea.value = template.defaultText;
                // Діагностика: Перевіряємо, чи спрацювало заповнення
                console.log(`[INIT] Заповнено шаблон: ${template.name}`); 
            }
        });
    }

    // =========================================================
    // ФУНКЦІЯ: ОТРИМАННЯ ШАБЛОНУ (З блоку recovery-details-container)
    // =========================================================
    function getTemplateText(status) {
        if (status === 'MD') return 'Матч: Індивідуальна розминка/завершення гри';
        if (status === 'REST') return 'Повний відпочинок, відновлення, сон.';
        
        let fieldName = '';
        if (status.startsWith('MD+')) {
            fieldName = `tasks_md_plus_${status.charAt(3)}`;
        } else if (status.startsWith('MD-')) {
            fieldName = `tasks_md_minus_${status.charAt(3)}`;
        } else {
             return ''; 
        }

        const templateElement = document.querySelector(`textarea[name="${fieldName}"]`);
        
        if (!templateElement) {
             console.warn(`[DIAGNOSTICS] Шаблон не знайдено для статусу: ${status}. Очікуване ім'я: ${fieldName}`);
             return '';
        }

        const templateText = templateElement.value.trim();
        
        if (templateText === '') {
             console.warn(`[DIAGNOSTICS] Шаблон знайдено (${fieldName}), але він порожній.`);
        } else {
             console.log(`[DIAGNOSTICS] Шаблон знайдено та використано для ${status}.`);
        }
        
        return templateText; 
    }

    // =========================================================
    // ФУНКЦІЯ: toggleDayInputs (Заборона введення для відпочинку/матчу)
    // =========================================================
    function toggleDayInputs(dayIndex, activityType, isPlanActive) {
        try {
            const isDisabledOverall = !isPlanActive;
            const currentDayIndexStr = dayIndex.toString();
            
            const fieldPrefixesToDisable = [
                'daily_task', 'tasks', 'cardio', 'opponent', 'venue', 'travel_km'
            ];

            // Перевіряємо лише елементи, які стосуються цього дня
            fieldPrefixesToDisable.forEach(prefix => {
                const element = document.querySelector(`[name="${prefix}_${currentDayIndexStr}"]`);
                if (element) {
                     let shouldBeDisabled = false;
                     
                     if (isDisabledOverall) {
                         shouldBeDisabled = true; 
                     } else if (
