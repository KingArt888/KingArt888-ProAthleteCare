// navigation-common.js
// Це універсальний скрипт для мобільної навігації

/**
 * Логіка для перемикання бічної панелі на мобільних пристроях.
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

// Запуск функції при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    setupMenuToggle(); 
});
