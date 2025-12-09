// navigation-common.js

/**
 * Логіка для перемикання бічної панелі на мобільних пристроях
 */
function setupMenuToggle() {
    const toggleButton = document.getElementById('menu-toggle-button');
    const sidebar = document.getElementById('main-sidebar');

    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', () => {
            sidebar.classList.toggle('active'); // Клас 'active' керує видимістю
        });
    }
}

// Запускаємо логіку після завантаження DOM
document.addEventListener('DOMContentLoaded', () => {
    setupMenuToggle(); 
});
