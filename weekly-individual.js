// weekly-individual.js — ProAtletCare (FIREBASE INTEGRATION)
const STORAGE_KEY = 'weeklyPlanData';
let currentUserId = null;

// Функція для визначення ID тижня (дата понеділка поточного тижня)
function getWeekID() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0]; // Формат YYYY-MM-DD
}

const currentWeekId = getWeekID();

/**
 * 1. FIREBASE: СИНХРОНІЗАЦІЯ ДАНИХ
 */
async function loadWeeklyPlan(uid) {
    try {
        const doc = await db.collection('weekly_plans').doc(`${uid}_${currentWeekId}`).get();
        if (doc.exists) {
            const data = doc.data().planData || {};
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            
            // Відновлення вибраних селекторів активності в таблиці
            document.querySelectorAll('.activity-type-select').forEach(sel => {
                if (data[sel.name]) sel.value = data[sel.name];
            });
            console.log("План на тиждень завантажено з хмари");
        }
        updateCycleColors();
    } catch (e) {
        console.error("Помилка завантаження з Firebase:", e);
    }
}

async function saveToFirebase() {
    if (!currentUserId) return;
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    try {
        // Зберігаємо з метаданими для місячного та річного календаря
        await db.collection('weekly_plans').doc(`${currentUserId}_${currentWeekId}`).set({
            userId: currentUserId,
            weekId: currentWeekId,
            planData: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
        }, { merge: true });
        
        console.log("Дані успішно синхронізовано з Firebase");
    } catch (e) {
        console.error("Помилка збереження:", e);
    }
}

/**
 * 2. КОРИГУВАННЯ ВПРАВ (ІНДИВІДУАЛЬНО)
 */
window.addExerciseToStatus = function(btn, name, stage, category) {
    const status = window.currentAddStatus;
    const exTemplate = EXERCISE_LIBRARY[stage][category].exercises.find(e => e.name === name);
    
    if (exTemplate) {
        let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const key = `status_plan_${status}`;
        if (!data[key]) data[key] = { exercises: [] };
        
        data[key].exercises.push({ ...exTemplate, stage, category });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        
        updateCycleColors();
        btn.textContent = "✔";
        btn.style.background = "#28a745";
        btn.disabled = true;
        
        // Авто-збереження в хмару при кожній зміні
        saveToFirebase();
    }
};

window.removeExerciseFromStatus = function(status, name) {
    let data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const key = `status_plan_${status}`;
    if (data[key]) {
        data[key].exercises = data[key].exercises.filter(e => e.name !== name);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        updateCycleColors();
        saveToFirebase();
    }
};

/**
 * 3. АВТОРИЗАЦІЯ ТА ІНІЦІАЛІЗАЦІЯ
 */
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        // Пріоритет: ID з URL (для тренера) або власний ID (для атлета)
        const urlParams = new URLSearchParams(window.location.search);
        currentUserId = urlParams.get('userId') || user.uid;
        
        console.log("Weekly Individual працюємо з ID:", currentUserId);
        await loadWeeklyPlan(currentUserId);
    } else {
        // Якщо не авторизований, перекидаємо на вхід або анонімно
        firebase.auth().signInAnonymously();
    }
});

// Додаємо слухач на форму збереження
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('weekly-plan-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await saveToFirebase();
            alert("Тижневий план та шаблони збережено!");
        };
    }

    // Слухач змін активності для перерахунку кольорів MD
    document.querySelectorAll('.activity-type-select').forEach(sel => {
        sel.addEventListener('change', () => {
            updateCycleColors();
            saveToFirebase(); // Зберігаємо зміни активності
        });
    });
});
