// ==============================================
// navigation-common.js — ProAtletCare (FINAL)
// ==============================================

/**
 * 1. Логіка мобільного меню (sidebar)
 */
function setupMenuToggle() {
    const toggleButton = document.getElementById('menu-toggle-button');
    const sidebar = document.getElementById('main-sidebar'); 
    
    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', (event) => {
            event.stopPropagation();
            sidebar.classList.toggle('active');
            toggleButton.textContent = sidebar.classList.contains('active') ? '✕' : '☰';
        });
        
        // Закриття меню при кліку поза ним
        document.addEventListener('click', (event) => {
            if (!sidebar.contains(event.target) && !toggleButton.contains(event.target)) {
                sidebar.classList.remove('active');
                toggleButton.textContent = '☰';
            }
        });
    }
}

/**
 * 2. Підсвічування активної сторінки в меню
 */
function highlightActiveLink() {
    let currentPath = window.location.pathname.split('/').pop();
    if (currentPath.includes('?')) currentPath = currentPath.split('?')[0];
    if (currentPath === "" || currentPath === "/") currentPath = "index.html"; 
    
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const linkPath = link.getAttribute('href');
        // Перевіряємо чи шлях посилається на поточну сторінку
        if (linkPath && (linkPath === currentPath || linkPath.includes(currentPath))) {
            link.classList.add('active');
        }
    });
}

/**
 * 3. Відображення імені користувача (БЕЗ IMPORT)
 * Використовує глобальний об'єкт firebase, ініціалізований у firebase-config.js
 */
function setupUserDisplay() {
    // Чекаємо, поки Firebase Auth стане доступним
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged((user) => {
            const userNameElement = document.getElementById("user-name");
            if (user && userNameElement) {
                // Пріоритет: Ім'я профілю -> Частина Email -> Замовчування
                const userName = user.displayName || (user.email ? user.email.split("@")[0] : "Athlete");
                userNameElement.textContent = userName;
                console.log("✅ ProAtletCare: Вітаємо,", userName);
            }
        });
    }
}

// ЗАПУСК ПІСЛЯ ЗАВАНТАЖЕННЯ СТОРІНКИ
document.addEventListener('DOMContentLoaded', () => {
    setupMenuToggle();
    highlightActiveLink();
    setupUserDisplay();
});
