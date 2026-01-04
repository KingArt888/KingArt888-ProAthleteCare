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
    
    if (toggleButton && sidebar) {
        // Обробник кліку на кнопку-бургер
        toggleButton.addEventListener('click', (event) => {
            event.stopPropagation();
            sidebar.classList.toggle('active');
            toggleButton.textContent = sidebar.classList.contains('active') ? '✕' : '☰';
        });
        
        // Закрити при кліку на пункт меню
        sidebar.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') {
                sidebar.classList.remove('active');
                toggleButton.textContent = '☰';
            }
        });
        
        // Закрити при кліку поза меню
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
    let currentPath = window.location.pathname.split('/').pop();
    
    if (currentPath.includes('?')) {
        currentPath = currentPath.split('?')[0];
    }
    
    if (currentPath === "" || currentPath === "/" || currentPath === "index.html") {
        currentPath = "wellness.html"; 
    }
    
    const sidebarLinks = document.querySelectorAll('.sidebar a');

    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const linkPath = link.getAttribute('href').split('/').pop();
        
        if (linkPath === currentPath) {
            link.classList.add('active');
        }
    });
}

/**
 * 3. Обробка назви користувача через Firebase (ВЕРСІЯ 8.x)
 * Прибрали 'import', бо вони ламають скрипт.
 */
function setupUserStatus() {
    // Перевіряємо, чи завантажений firebase
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                const userNameElement = document.getElementById("user-name");
                const userName = user.displayName || user.email?.split("@")[0] || "Athlete";

                if (userNameElement) {
                    userNameElement.textContent = userName;
                }
            }
        });
    }
}

// ==============================================
// ЗАПУСК ПРИ ЗАВАНТАЖЕННІ СТОРІНКИ
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    setupMenuToggle(); 
    highlightActiveLink();
    setupUserStatus();
});
