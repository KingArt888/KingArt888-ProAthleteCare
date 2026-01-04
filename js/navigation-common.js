// ==============================================
// navigation-common.js
// УНІВЕРСАЛЬНА ЛОГІКА ДЛЯ НАВІГАЦІЇ
// ==============================================


function setupMenuToggle() {
    const toggleButton = document.getElementById('menu-toggle-button');
    const sidebar = document.getElementById('main-sidebar'); 
    
    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', (event) => {
            event.stopPropagation();
            sidebar.classList.toggle('active');
            // ВИДАЛИВ toggleButton.textContent — тепер він не псує лінії!
            toggleButton.classList.toggle('is-open'); // Додаємо клас для хрестика
        });
        
        sidebar.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') {
                sidebar.classList.remove('active');
                toggleButton.classList.remove('is-open');
            }
        });
        
        document.addEventListener('click', (event) => {
            if (!sidebar.contains(event.target) && !toggleButton.contains(event.target)) {
                sidebar.classList.remove('active');
                toggleButton.classList.remove('is-open');
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