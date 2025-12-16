// daily-individual.js

const DAILY_STORAGE_KEY = 'weeklyPlanData';
const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

// Колірна палітра MD
const COLOR_MAP = {
    'MD': { status: 'MD', colorClass: 'color-red' },
    'MD+1': { status: 'MD+1', colorClass: 'color-dark-green' }, 
    'MD+2': { status: 'MD+2', colorClass: 'color-green' }, 
    'MD-1': { status: 'MD-1', colorClass: 'color-yellow' }, 
    'MD-2': { status: 'MD-2', colorClass: 'color-deep-green' }, 
    'MD-3': { status: 'MD-3', colorClass: 'color-orange' }, 
    'MD-4': { status: 'MD-4', colorClass: 'color-blue' }, 
    'REST': { status: 'REST', colorClass: 'color-neutral' }, 
    'TRAIN': { status: 'TRAIN', colorClass: 'color-dark-grey' }, 
};
const dayNamesFull = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'];

// Зберігання та завантаження тепер через DAILY_STORAGE_KEY
function toggleCompletion(id, isChecked) {
    localStorage.setItem(id, isChecked);
}

function loadAndDisplayDailyPlan() {
    const todayIndex = getCurrentDayIndex(); 
    const planKey = `day_plan_${todayIndex}`;
    
    const savedData = JSON.parse(localStorage.getItem(DAILY_STORAGE_KEY) || '{}');
    const todayPlan = savedData[planKey];

    // решта коду без змін, але localStorage використовує DAILY_STORAGE_KEY
}

// Всі виклики localStorage.getItem(STORAGE_KEY) → localStorage.getItem(DAILY_STORAGE_KEY)
// Всі виклики localStorage.setItem(STORAGE_KEY, ...) → localStorage.setItem(DAILY_STORAGE_KEY, ...)

// … (весь решта коду daily-individual.js)
