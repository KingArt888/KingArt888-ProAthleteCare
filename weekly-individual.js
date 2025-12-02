// =========================================================
// weekly-individual.js - V22.0 (Перевірка елементів у консолі)
// Використовувати з Вашим поточним HTML!
// =========================================================

const STORAGE_KEY = 'weeklyPlanData';
// ... (COLOR_MAP залишається без змін) ...

document.addEventListener('DOMContentLoaded', () => {
    
    // ... (Оголошення констант залишається без змін) ...
    
    // =========================================================
    // ФУНКЦІЯ: ІНІЦІАЛІЗАЦІЯ ШАБЛОНІВ (Залишається як у V20.0)
    // =========================================================
    function initializeTemplates() {
        // ... (Код initializeTemplates з V20.0) ...
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
            }
        });
    }


    // =========================================================
    // ФУНКЦІЯ: ОТРИМАННЯ ШАБЛОНУ (ЗМІНЕНО - Агресивна перевірка)
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

    // ... (Всі інші функції залишаються без змін від V20.0) ...
    // Включаючи updateCycleColors, loadData, saveData, toggleDayInputs, resetCycleAfterRest, updateMatchDetails
    
    // === ІНІЦІАЛІЗАЦІЯ ОБРОБНИКІВ ===
    // ... (залишаються без змін) ...
    
    // === ПОЧАТКОВИЙ ЗАПУСК ===
    initializeTemplates(); // Заповнює порожні шаблони текстом за замовчуванням
    loadData();           // Завантажує збережений план
    updateCycleColors();  // Запускає фінальний розрахунок
});
