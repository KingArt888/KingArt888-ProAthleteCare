// ==============================================
// navigation-common.js
// УНІВЕРСАЛЬНА ЛОГІКА ДЛЯ НАВІГАЦІЇ
// ==============================================

/**
 * 1. Логіка для перемикання бічної панелі на мобільних пристроях.
 */
function setupMenuToggle() {
    const toggleButton = document.getElementById('menu-toggle-button');
    const sidebar = document.getElementById('main-sidebar'); 
    
    // КРИТИЧНА ПЕРЕВІРКА НА NULL
    if (toggleButton && sidebar) {
        
        // Обробник кліку на кнопку-бургер
        toggleButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Запобігаємо спливанню події
            sidebar.classList.toggle('active');
            
            // Зміна іконки 
            toggleButton.textContent = sidebar.classList.contains('active') ? '✕' : '☰';
        });
        
        // Обробник кліку на пункт меню (для мобільного: закрити після вибору)
        sidebar.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') {
                sidebar.classList.remove('active');
                toggleButton.textContent = '☰';
            }
        });
        
        // Обробник кліку поза меню (ДУЖЕ ВАЖЛИВО ДЛЯ МОБІЛЬНОГО UX)
        document.addEventListener('click', (event) => {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickOnToggle = toggleButton.contains(event.target);
            
            if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                toggleButton.textContent = '☰';
            }
        });
    }
}

/**
 * 2. Динамічно встановлює клас 'active' для посилання в меню.
 */
function highlightActiveLink() {
    // Отримуємо поточний шлях, видаляючи все до '/'
    let currentPath = window.location.pathname.split('/').pop();
    
    // Видаляємо параметри запиту (?param=value)
    if (currentPath.includes('?')) {
        currentPath = currentPath.split('?')[0];
    }
    
    // Обробка index.html (якщо path пустий, припускаємо, що активний Wellness)
    if (currentPath === "" || currentPath === "/") {
        currentPath = "wellness.html"; 
    }
    
    const sidebarLinks = document.querySelectorAll('.sidebar a');

    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const linkPath = link.getAttribute('href');
        
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });
}
// Обробка назви користувача
import { auth } from "../config/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
    const userNameElement = document.getElementById("user-name");

    const userName =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Athlete";

    if (userNameElement) {
    userNameElement.textContent = userName;
    }
    }
});

// ==============================================
// ЗАПУСК ПРИ ЗАВАНТАЖЕННІ СТОРІНКИ
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    setupMenuToggle(); 
    highlightActiveLink();
});
