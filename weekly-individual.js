// weekly-individual.js
// ПОТРЕБУЄ exercise_library.js ДЛЯ РОБОТИ

const STORAGE_KEY = 'weeklyPlanData';
const COLOR_MAP = {
    // ... (без змін)
};

const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

// =========================================================
// 1. СТРУКТУРА ШАБЛОНІВ ТА ГЕНЕРАЦІЯ
// =========================================================
// ... (Функції generateRandomExercises, collectTemplatesFromUI, collectManualChanges, saveData, loadWeeklyPlanDisplay - без змін)

// =========================================================
// 2. УПРАВЛІННЯ ІНТЕРФЕЙСОМ ШАБЛОНІВ ДНЯ
// =========================================================
// ... (Функції renderDayTemplateInput, addTemplateControlListeners, displayGeneratedExercises, addExerciseControlListeners - без змін)

// =========================================================
// 3. АДАПТИВНІСТЬ ТА ІНІЦІАЛІЗАЦІЯ
// =========================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar-menu');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
    
    // Закриття меню при кліку на посилання
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar-menu');
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    });
}


function setupEventListeners() {
    // ... (існуючі обробники)
    document.querySelectorAll('.activity-type-select').forEach(select => {
        select.addEventListener('change', updateCycleColors);
    });
    
    document.getElementById('weekly-plan-form').addEventListener('submit', (e) => {
        e.preventDefault();
        // Примусова перегенерація при збереженні плану?
        // generateWeeklyPlan(true); // Якщо ви хочете перегенерацію
        saveData(); // Або просто зберігаємо поточні ручні дані
    });

    // ... (додаємо виклик нового налаштування)
    setupMobileMenu(); 
    // ...
}

// ... (решта логіки)
// ... (Всі ваші існуючі функції тут)
// ...

function init() {
    // ... (існуючий код ініціалізації)

    // Присвоєння івент-лісенерів
    setupEventListeners();

    // Завантаження збережених даних
    const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    loadDataToUI(savedData);
    updateCycleColors(); 
    loadWeeklyPlanDisplay(savedData);
    
    // ... (решта ініціалізації)
}

// Виклик ініціалізації
document.addEventListener('DOMContentLoaded', init);
