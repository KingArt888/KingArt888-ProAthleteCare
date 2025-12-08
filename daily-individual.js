// Передбачається, що цей код знаходиться в файлі daily-individual.js
const STORAGE_KEY = 'weeklyPlanData';
const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота', 'Неділя'];

document.addEventListener('DOMContentLoaded', () => {
    // Визначення поточного дня
    const today = new Date();
    const currentDayIndex = (today.getDay() + 6) % 7; // Понеділок = 0, Неділя = 6

    const savedData = localStorage.getItem(STORAGE_KEY);
    let data = {};
    if (savedData) {
        data = JSON.parse(savedData);
    }
    
    const dayPlanKey = `structured_plan_${currentDayIndex}`;
    const dayPlan = data[dayPlanKey];

    // Відображення структурованих завдань
    displayTasks(dayPlan, currentDayIndex);
});

// =========================================================
// ФУНКЦІЯ: displayTasks (ОНОВЛЕНО ДЛЯ ЧОРНО-ЗОЛОТОГО СТИЛЮ)
// =========================================================
function displayTasks(dayPlan, currentDayIndex) {
    const tasksContainer = document.getElementById('daily-tasks-container');
    const dayName = dayNames[currentDayIndex];
    tasksContainer.innerHTML = ''; // Очищаємо контейнер перед заповненням

    // Заголовок
    const header = document.getElementById('main-protocol-header');
    if (header) {
        header.innerHTML = `🔥 Daily Individual: Індивідуальний протокол на **${dayName}**`;
    }

    if (!dayPlan || !dayPlan.tasks || dayPlan.tasks.length === 0) {
        tasksContainer.innerHTML = `
            <div class="warning-box">
                <span class="icon-text">⚠️ План на ${dayName} відсутній</span>
                <p>Не знайдено структурованих завдань. Переконайтеся, що ви зберегли дані у <a href="weekly-individual.html">Weekly Individual</a> у правильному структурованому форматі (використовуйте ключові слова: "Розминка", "Основна", "Завершення").</p>
            </div>`;
        return;
    }

    // Додатковий заголовок для дня
    const dayHeader = document.createElement('h2');
    dayHeader.className = 'day-protocol-header';
    dayHeader.innerHTML = `<span class="icon-text">🔥 Протокол ${dayPlan.phase} на ${dayPlan.day}</span>`;
    // tasksContainer.appendChild(dayHeader); // Можна вимкнути, якщо достатньо основного заголовка

    dayPlan.tasks.forEach(task => {
        // Заглушка для відео. В реальному проекті тут має бути посилання на Youtube/Vimeo
        const videoHtml = task.video_key ? 
            `<div class="video-placeholder video-active"><img src="/img/video-placeholder-icon.png" alt="Video Icon"/> Відео ${task.video_key}</div>` : 
            `<div class="video-placeholder">Відео недоступно</div>`;

        let stageDisplay = '';
        if (task.stage === 'Pre-Training') {
            stageDisplay = 'Підготовка';
        } else if (task.stage === 'Main Training') {
            stageDisplay = 'Основна Робота';
        } else if (task.stage === 'Post-Training') {
            stageDisplay = 'Відновлення/Завершення';
        } else {
            stageDisplay = 'Завдання';
        }
        
        // Опис (description) тут може містити нумеровані списки, якщо він був форматований у weekly-individual.js
        const descriptionLines = task.description
            .replace(/(\r\n|\n|\r)/gm, ' ') // Замінюємо всі переноси рядків на пробіл для кращого парсингу
            .split(/\d+\.\s+/) // Розділяємо за нумерацією 1., 2., 3.
            .filter(line => line.trim() !== '')
            .map((line, index) => `<div class="task-list-item"><span class="list-number">${index + 1}.</span> <span class="list-text">${line.trim()}</span></div>`)
            .join('');


        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.dataset.stage = task.stage.replace(' ', '-');
        
        taskItem.innerHTML = `
            <div class="task-video-container">
                ${videoHtml}
            </div>
            
            <div class="task-details-content">
                <div class="stage-label-header">${stageDisplay}</div>
                <h3 class="task-title-phase">${task.title.split(':').pop().trim()}</h3>
                <div class="task-description-list">
                    ${descriptionLines}
                </div>
            </div>
        `;

        tasksContainer.appendChild(taskItem);
    });
}
