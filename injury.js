// ФУНКЦІЇ ДЛЯ INJURY STORY (injury.html)
// ==========================================================

// Функція-хелпер для отримання поточної дати у форматі YYYY-MM-DD
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Ініціалізація або отримання даних травм
let injuries = JSON.parse(localStorage.getItem('athleteInjuries')) || [];
let selectedInjury = null;
let currentPainChart = null; // Змінна для зберігання об'єкта Chart.js

// ІНІЦІАЛІЗАЦІЯ СТАТУСУ СПОРТСМЕНА
let athleteStatus = localStorage.getItem('athleteStatus') || 'healthy'; // 'healthy' або 'recovering'


function saveInjuries() {
    localStorage.setItem('athleteInjuries', JSON.stringify(injuries));
    // Оновлюємо статус атлета після збереження травм
    updateAthleteStatus();
}

// ----------------------------------------------------------
// ЛОГІКА СТАТУСУ АТЛЕТА
// ----------------------------------------------------------

function updateAthleteStatus() {
    // Якщо є хоча б одна активна (незакрита) травма, статус 'recovering'
    const isActiveInjury = injuries.some(i => i.status !== 'closed' && i.status !== undefined);
    athleteStatus = isActiveInjury ? 'recovering' : 'healthy';
    localStorage.setItem('athleteStatus', athleteStatus);
    displayAthleteStatus();
}

function displayAthleteStatus() {
    const statusEl = document.getElementById('athlete-status-display');
    if (!statusEl) return;

    let statusText = '';
    let statusColor = '';
    
    if (athleteStatus === 'healthy') {
        statusText = 'Здоровий 💪';
        statusColor = '#50C878'; // Зелений
    } else {
        statusText = 'У процесі відновлення 🩹';
        statusColor = '#FFC72C'; // Золотий
    }

    statusEl.innerHTML = `Поточний статус: <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>`;
}


// ----------------------------------------------------------
// ЛОГІКА ДЛЯ ЗМІНИ/ВИДАЛЕННЯ ТРАВМИ (ГЛОБАЛЬНІ ФУНКЦІЇ)
// ----------------------------------------------------------

// НОВА ФУНКЦІЯ: ЗМІНА СТАТУСУ ТРАВМИ (Викликається з HTML)
function toggleInjuryStatus(id) {
    const injuryIndex = injuries.findIndex(i => i.id === id);
    if (injuryIndex === -1) return;

    const injury = injuries[injuryIndex];
    
    if (injury.status === 'closed') {
        injury.status = 'active';
        alert(`Травма "${injury.location}" знову активна.`);
    } else {
        injury.status = 'closed';
        alert(`Травма "${injury.location}" успішно закрита.`);
    }

    saveInjuries();
    displayInjuryDetails(injury);
    renderInjuryMarkers();
    displayInjuryList();
}


// НОВА ФУНКЦІЯ: ВИДАЛЕННЯ ТРАВМИ (Викликається з HTML)
function deleteInjury(id) {
    if (!confirm("Ви впевнені, що хочете видалити цю травму та всю її історію?")) {
        return;
    }

    injuries = injuries.filter(i => i.id !== id);
    saveInjuries();
    
    // Скидання стану після видалення
    selectedInjury = null;
    const injuryForm = document.getElementById('injury-form');
    if (injuryForm) injuryForm.reset();
    const notesSection = document.getElementById('notes-section');
    if (notesSection) notesSection.style.display = 'none';
    
    const marker = document.getElementById('click-marker');
    if (marker) {
        marker.style.left = '-100px';
        marker.style.top = '-100px';
    }
    
    // Оновлення інтерфейсу
    const mapContainer = document.getElementById('bodyMapContainer');
    if (mapContainer) mapContainer.querySelectorAll('.injury-marker').forEach(m => m.remove());
    
    displayInjuryList();
    renderInjuryMarkers();
    if (currentPainChart) currentPainChart.destroy();
    
    const chartCard = document.getElementById('chart-card');
    if (chartCard) chartCard.innerHTML = '<h3>Динаміка відновлення</h3><canvas id="painChart"></canvas>';
}


// ----------------------------------------------------------
// ЛОГІКА КАРТИ ТРАВМ
// ----------------------------------------------------------
function setupBodyMap() {
    const mapContainer = document.getElementById('bodyMapContainer');
    const marker = document.getElementById('click-marker');
    const coordXInput = document.getElementById('coordX');
    const coordYInput = document.getElementById('coordY');
    const notesSection = document.getElementById('notes-section');
    const injuryForm = document.getElementById('injury-form');
    const injuryLocationInput = document.getElementById('injury-location');

    // Якщо ключових елементів немає, виходимо
    if (!mapContainer || !injuryForm || !marker) return;


    // 1. Обробка кліку на карту (встановлення місця травми)
    mapContainer.addEventListener('click', function(e) {
        
        // Перевіряємо, чи клікнули саме на зображення або контейнер, а не на вже існуючий маркер
        if (e.target.classList.contains('injury-marker')) return; 

        const rect = mapContainer.getBoundingClientRect();
        const x = e.clientX - rect.left; 
        const y = e.clientY - rect.top;

        // Перетворюємо у відсотки для адаптивності
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        // Позиціонуємо червоний обідок (візуальний фідбек)
        marker.style.left = `${xPercent}%`;
        marker.style.top = `${yPercent}%`;
        
        // Відображаємо місце для нотаток
        notesSection.style.display = 'block';

        // Зберігаємо координати у приховані поля форми
        coordXInput.value = xPercent.toFixed(2);
        coordYInput.value = yPercent.toFixed(2);
        
        // Скидаємо вибір поточної травми для створення нової
        selectedInjury = null; 
        injuryForm.reset(); // Скидаємо форму
        document.getElementById('injury-date').value = getTodayDateString(); // Встановлюємо сьогоднішню дату
        document.getElementById('injury-notes').value = '';
        
        // Скидаємо відображення деталей
        document.getElementById('injury-list').innerHTML = `<p class="placeholder-text">Заповніть форму для нової травми.</p>`;
        if (currentPainChart) currentPainChart.destroy();

        renderInjuryMarkers(); // Оновлюємо відображення маркерів
    });

    // 2. Рендеринг збережених маркерів та їх функціональність
    function renderInjuryMarkers() {
        // Видаляємо всі існуючі маркери травм
        mapContainer.querySelectorAll('.injury-marker').forEach(m => m.remove());

        injuries.forEach((injury) => {
            const injuryEl = document.createElement('div');
            injuryEl.classList.add('injury-marker');
            injuryEl.style.left = `${injury.coordX}%`;
            injuryEl.style.top = `${injury.coordY}%`;
            
            // Встановлення кольору залежно від СТАТУСУ (ВИПРАВЛЕНО)
            if (injury.status === 'closed') {
                injuryEl.style.backgroundColor = 'rgba(80, 200, 120, 0.5)'; // Прозоро-зелений (Закрита/Стара)
            } else if (selectedInjury && selectedInjury.id === injury.id) {
                 injuryEl.style.backgroundColor = '#FFC72C'; // Золотий (Обрана)
                 injuryEl.style.width = '16px';
                 injuryEl.style.height = '16px';
            } else {
                 injuryEl.style.backgroundColor = 'rgb(218, 62, 82)'; // Червоний (Активна)
            }

            // Додаємо інформацію про травму при наведенні
            const statusText = injury.status === 'closed' ? 'Закрита' : 'Активна';
            const latestPain = injury.painHistory.length > 0 ? injury.painHistory[injury.painHistory.length - 1].pain : injury.pain;
            injuryEl.title = `${injury.location} (${injury.date})\nСтатус: ${statusText}\nОстанній біль: ${latestPain}/10`;
            
            // Обробка кліку на збережений маркер
            injuryEl.addEventListener('click', function(e) {
                e.stopPropagation(); // Запобігаємо спрацюванню кліку на карту
                selectedInjury = injury;
                displayInjuryDetails(injury);
                renderInjuryMarkers(); // Оновлюємо виділення
                
                // Переміщуємо червоний обідок на місце обраної травми
                marker.style.left = `${injury.coordX}%`;
                marker.style.top = `${injury.coordY}%`;
            });

            mapContainer.appendChild(injuryEl);
        });
    }

    // 3. Відображення деталей травми (при кліку на маркер)
    function displayInjuryDetails(injury) {
        const listContainer = document.getElementById('injury-list');
        const latestPain = injury.painHistory.length > 0 ? injury.painHistory[injury.painHistory.length - 1].pain : injury.pain;
        
        // Кнопка для зміни статусу
        const statusButton = injury.status === 'closed' 
            ? `<button class="gold-button" style="background-color: #50C878; padding: 5px 10px; margin-top: 10px; font-size: 0.9em; margin-right: 10px;" onclick="toggleInjuryStatus(${injury.id})">
                Відновити/Відкрити травму
               </button>`
            : `<button class="gold-button" style="background-color: #4C5A66; padding: 5px 10px; margin-top: 10px; font-size: 0.9em; margin-right: 10px;" onclick="toggleInjuryStatus(${injury.id})">
                Закрити/Завершити лікування
               </button>`;
        
        // Відображення деталей та кнопок
        listContainer.innerHTML = `
            <div style="padding: 10px; border: 1px solid #333; border-radius: 6px;">
                <h3>${injury.location} <span style="font-size: 0.8em; color: ${injury.status === 'closed' ? '#50C878' : '#DA3E52'};">(${injury.status === 'closed' ? 'Закрита' : 'Активна'})</span></h3>
                <p><strong>Дата початку:</strong> ${injury.date}</p>
                <p><strong>Поточний біль:</strong> <span style="color:#DA3E52; font-weight:bold;">${latestPain}</span>/10</p>
                <p style="font-style: italic;">"${injury.notes || 'Опис відсутній.'}"</p>
                <div style="margin-top: 10px;">
                    ${statusButton}
                    <button class="gold-button" style="background-color: #dc3545; padding: 5px 10px; margin-top: 10px; font-size: 0.9em;" onclick="deleteInjury(${injury.id})">
                        Видалити травму
                    </button>
                </div>
            </div>
        `;
        
        // Оновлюємо форму для ОНОВЛЕННЯ болю
        document.getElementById('injury-date').value = injury.date;
        injuryLocationInput.value = injury.location;
        document.getElementById('injury-notes').value = injury.notes;
        coordXInput.value = injury.coordX;
        coordYInput.value = injury.coordY;
        
        // Встановлюємо поточний рівень болю у формі
        const painRatingEl = document.getElementById('pain-rating-group').querySelector(`input[value="${latestPain}"]`);
        if (painRatingEl) painRatingEl.checked = true;

        notesSection.style.display = 'block';

        renderPainChart(); 
    }

    // 4. Обробка відправки форми (додавання/оновлення)
    injuryForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const currentPain = document.querySelector('input[name="pain"]:checked').value;
        const today = getTodayDateString();

        const newInjuryData = {
            date: document.getElementById('injury-date').value,
            location: injuryLocationInput.value,
            pain: currentPain,
            coordX: coordXInput.value,
            coordY: coordYInput.value,
            notes: document.getElementById('injury-notes').value,
        };
        
        if (!newInjuryData.coordX || !newInjuryData.coordY) {
            alert("Будь ласка, клікніть на силует, щоб відмітити місце травми.");
            return;
        }

        if (selectedInjury) {
            // ОНОВЛЕННЯ СТАРОЇ ТРАВМИ (оновлюємо деталі та біль)
            const index = injuries.findIndex(i => i.id === selectedInjury.id);
            
            let updatedPainHistory = selectedInjury.painHistory || [];
            
            const historyIndex = updatedPainHistory.findIndex(h => h.date === today);
            
            // ЛОГІКА ДОПОВНЕННЯ:
            if (historyIndex === -1) {
                updatedPainHistory.push({ date: today, pain: currentPain });
            } else {
                updatedPainHistory[historyIndex].pain = currentPain;
            }
            
            injuries[index] = { 
                ...selectedInjury, 
                ...newInjuryData,
                id: selectedInjury.id,
                // При оновленні травма завжди стає АКТИВНОЮ (якщо не закрити її)
                status: selectedInjury.status === 'closed' ? 'active' : selectedInjury.status || 'active', 
                painHistory: updatedPainHistory.sort((a, b) => new Date(a.date) - new Date(b.date))
            };
            
            selectedInjury = injuries[index];
            alert(`Травма "${newInjuryData.location}" оновлена!`);
            
            // ОНОВЛЕННЯ ДЕТАЛЕЙ І ГРАФІКА ПІСЛЯ ЗБЕРЕЖЕННЯ
            displayInjuryDetails(selectedInjury);

        } else {
            // СТВОРЕННЯ НОВОЇ ТРАВМИ
            const newInjury = {
                ...newInjuryData,
                id: Date.now(), 
                status: 'active', // Нова травма завжди активна
                painHistory: [{ date: newInjuryData.date, pain: newInjuryData.pain }] 
            };
            injuries.push(newInjury);
            alert(`Нова травма "${newInjuryData.location}" збережена!`);
        }

        saveInjuries();
        renderInjuryMarkers();
        
        // Скидаємо форму лише при створенні нової травми
        if (!selectedInjury) {
             injuryForm.reset();
             notesSection.style.display = 'none';
             marker.style.left = '-100px';
             marker.style.top = '-100px';
             document.getElementById('injury-date').value = getTodayDateString();
        }
        
        displayInjuryList();
    });

    // 5. Відображення списку усіх травм (ВИПРАВЛЕНО - тепер це список усіх травм)
    function displayInjuryList() {
        // !!! ПЕРЕВІРТЕ: ЦЕЙ ID має бути контейнером для списку всіх травм в HTML
        const listContainer = document.getElementById('injury-list-all'); 
        if (!listContainer) return;

        if (injuries.length === 0) {
            listContainer.innerHTML = '<p class="placeholder-text">Історія травм порожня. Додайте першу травму!</p>';
            return;
        }

        let html = injuries.map(injury => {
            const latestPain = injury.painHistory.length > 0 ? injury.painHistory[injury.painHistory.length - 1].pain : injury.pain;
            const statusColor = injury.status === 'closed' ? '#50C878' : '#DA3E52';
            const statusText = injury.status === 'closed' ? 'Закрита' : 'Активна';
            
            return `
                <div class="injury-item" style="padding: 10px; border-bottom: 1px dashed #333; cursor: pointer;" data-id="${injury.id}">
                    <p style="color: #FFC72C; font-weight: bold; margin: 0;">${injury.location} (${injury.date})</p>
                    <p style="margin: 0; font-size: 0.9em;">Статус: <span style="color:${statusColor};">${statusText}</span> | Біль: ${latestPain}/10</p>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = html;
        
        listContainer.querySelectorAll('.injury-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.getAttribute('data-id'));
                selectedInjury = injuries.find(i => i.id === id);
                // Тут відображаємо деталі у формі!
                displayInjuryDetails(selectedInjury);
                renderInjuryMarkers();
            });
        });
    }


    // 6. Функція для відображення графіка болю (ВИПРАВЛЕНО)
    function renderPainChart() {
        const ctx = document.getElementById('painChart');
        // Якщо графік вже існує, знищуємо його, щоб намалювати новий
        if (currentPainChart) currentPainChart.destroy();
        
        if (!selectedInjury || !ctx) {
             // Якщо травма не обрана, очищаємо графік
             const chartCard = document.getElementById('chart-card');
             if (chartCard) chartCard.innerHTML = '<h3>Динаміка відновлення</h3><canvas id="painChart"></canvas>';
             return;
        }

        const painData = selectedInjury.painHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const data = {
            labels: painData.map(d => d.date),
            datasets: [{
                label: `Біль "${selectedInjury.location}"`,
                data: painData.map(d => parseInt(d.pain)),
                borderColor: 'rgb(218, 62, 82)', 
                backgroundColor: 'rgba(218, 62, 82, 0.4)',
                tension: 0.3,
                fill: true
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 1, max: 10, ticks: { stepSize: 1, color: '#CCCCCC' }, grid: { color: '#333333' } },
                    x: { ticks: { color: '#CCCCCC' }, grid: { color: '#333333' } }
                },
                plugins: {
                    legend: { labels: { color: '#CCCCCC' } },
                    title: { display: false }
                }
            }
        };

        currentPainChart = new Chart(ctx, config);
    }
    
    // Початкова ініціалізація сторінки
    document.getElementById('injury-date').value = getTodayDateString();
    updateAthleteStatus(); // Ініціалізація статусу
    displayInjuryList();
    renderInjuryMarkers();
}


// ==========================================================
// ОСНОВНА ІНІЦІАЛІЗАЦІЯ
// ==========================================================

document.addEventListener('DOMContentLoaded', function() {
    // ... Ваш існуючий код ініціалізації Wellness Control ...
    
    // Ініціалізація Injury Story
    if (window.location.pathname.split('/').pop() === 'injury.html') {
        setupBodyMap();
    }
    
});
