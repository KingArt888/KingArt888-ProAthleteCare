// --- БЛОК ДІЄТИ: 3 КАТЕГОРІЇ (СНІДАНОК, ОБІД, ВЕЧЕРЯ) ---

async function generateWeeklyPlan() {
    if (!currentAnalysis) {
        alert("Спочатку введіть дані та натисніть 'Аналізувати'");
        return;
    }

    const categories = [
        { id: 'brf', label: 'СНІДАНОК', icon: '🍳', dbKey: 'breakfasts' },
        { id: 'lnc', label: 'ОБІД', icon: '🍱', dbKey: 'lunches' },
        { id: 'din', label: 'ВЕЧЕРЯ', icon: '🍗', dbKey: 'dinners' }
    ];

    // Формуємо план: по одній страві на кожну категорію
    currentDailyPlan = categories.map(cat => {
        const meals = dietDatabase[cat.dbKey].filter(m => m.speed === selectedSpeed);
        const meal = meals[Math.floor(Math.random() * meals.length)] || dietDatabase[cat.dbKey][0];
        return { 
            ...meal, 
            catLabel: cat.label, 
            catIcon: cat.icon, 
            catId: cat.id,
            kcal: (meal.p*4)+(meal.f*9)+(meal.c*4), 
            eaten: false 
        };
    });

    renderDietPlan();
    savePlanToMemory();
}

function renderDietPlan() {
    const container = document.getElementById('diet-container');
    if (!container) return;
    
    // Блокуємо кнопку після генерації
    document.getElementById('get-diet-plan-btn').disabled = true;

    container.innerHTML = currentDailyPlan.map(meal => `
        <div class="meal-category-block" style="margin-bottom:12px; border:1px solid #1a1a1a; border-radius:10px; overflow:hidden; background:#0a0a0a;">
            <div onclick="toggleMealCategory('${meal.catId}')" style="padding:15px; background:#111; display:flex; justify-content:space-between; align-items:center; cursor:pointer; border-bottom:1px solid #1a1a1a;">
                <span style="color:#FFC72C; font-weight:bold; font-size:13px; letter-spacing:1px; text-transform:uppercase;">
                    ${meal.catIcon} ${meal.catLabel}
                </span>
                <span id="arrow-${meal.catId}" style="color:#444; font-size:12px;">▼</span>
            </div>
            
            <div id="content-${meal.catId}" style="display:none; padding:15px; background:rgba(255,255,255,0.01);">
                <div style="display:flex; justify-content:space-between; align-items:center; transition: opacity 0.3s; opacity:${meal.eaten ? '0.2' : '1'}">
                    <div style="flex:1;">
                        <div style="color:#fff; font-weight:bold; font-size:16px; margin-bottom:5px;">${meal.name}</div>
                        <div style="color:#FFC72C; font-size:12px; font-family:monospace;">
                            ${meal.kcal} kcal | Б:${meal.p} Ж:${meal.f} В:${meal.c}
                        </div>
                    </div>
                    <input type="checkbox" ${meal.eaten ? 'checked' : ''} 
                           onchange="toggleMealCheck('${meal.catId}', this)" 
                           style="width:26px; height:26px; accent-color:#FFC72C; cursor:pointer;">
                </div>
            </div>
        </div>
    `).join('');
    
    updateMacrosLeftUI();
}

// Логіка відкриття/приховання вікна
window.toggleMealCategory = function(id) {
    const content = document.getElementById(`content-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    const isOpen = content.style.display === "block";
    
    content.style.display = isOpen ? "none" : "block";
    arrow.textContent = isOpen ? "▼" : "▲";
    arrow.style.color = isOpen ? "#444" : "#FFC72C";
};

// Логіка відмітки страви (віднімання Ккал)
window.toggleMealCheck = function(catId, checkbox) {
    const meal = currentDailyPlan.find(m => m.catId === catId);
    if (meal) {
        meal.eaten = checkbox.checked;
        
        // Оновлюємо візуал (прозорість) без перемальовування всього списку
        const contentDiv = checkbox.closest('div');
        if (contentDiv) contentDiv.style.opacity = meal.eaten ? "0.2" : "1";
        
        savePlanToMemory();
        updateMacrosLeftUI();
    }
};
