// navigation-common.js

/**
 * Динамічно встановлює клас 'active' для посилання в меню,
 * яке відповідає поточній URL-адресі.
 */
function highlightActiveLink() {
    // 1. Отримуємо поточний шлях сторінки (наприклад, /load-season.html)
    const currentPath = window.location.pathname.split('/').pop();

    // 2. Знаходимо всі посилання в бічній панелі
    const sidebarLinks = document.querySelectorAll('.sidebar a');

    sidebarLinks.forEach(link => {
        // 3. Отримуємо шлях посилання (наприклад, load-season.html)
        const linkPath = link.getAttribute('href');

        // 4. Порівнюємо їх
        if (linkPath === currentPath) {
            // 5. Якщо шляхи збігаються, додаємо клас 'active'
            link.classList.add('active');
        } else {
            // 6. Видаляємо клас 'active' з інших посилань (якщо був встановлений вручну)
             link.classList.remove('active'); 
        }
    });
}

// ... Ваш існуючий код setupMenuToggle() ...

// Запуск при завантаженні сторінки (ОНОВЛЕНО)
document.addEventListener('DOMContentLoaded', () => {
    setupMenuToggle();
    highlightActiveLink(); // <-- НОВИЙ ВИКЛИК!
    
    // Встановлення поточної дати для форм (залишаємо для прикладу)
    const dateInput = document.getElementById('weight-date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
});
