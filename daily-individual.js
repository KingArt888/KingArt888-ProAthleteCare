// daily-individual.js — ProAtletCare (FULL PREMIUM EDITION)

(function() {
    const YOUTUBE_BASE = 'https://www.youtube.com/embed/';
    const STAGES_LIST = ['Pre-Training', 'Main Training', 'Post-Training'];

    // Рекомендації залежно від статусу дня
    const MD_RECS = {
        'MD': 'День гри! Максимальна концентрація. Тільки цільові рухи.',
        'MD+1': 'Відновлення: акцент на мобільності та легкому русі.',
        'MD-1': 'Активація: короткі вибухові рухи, робота над швидкістю.',
        'TRAIN': 'Стандартне тренування: фокус на якості виконання.',
        'REST': 'Повне відновлення. Тіло будується під час спокою.'
    };

    // Форматування дати: Понеділок, 28 грудня
    function getFormattedDate() {
        const d = new Date();
        const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота'];
        const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    }

    // Головна функція ініціалізації
    async function initAthleteView() {
        const listContainer = document.getElementById('daily-exercise-list');
        const welcomeBox = document.getElementById('athlete-welcome');
        const dateDisplay = document.getElementById('current-date-display');

        if (dateDisplay) dateDisplay.textContent = getFormattedDate();

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;

            // 1. СТВОРЕННЯ ВЕРХНЬОГО БЛОКУ (СТАТУС + ПРИВІТАННЯ)
            if (welcomeBox) {
                welcomeBox.innerHTML = `
                    <div style="background: #0a0a0a; padding: 25px; border-radius: 20px; border: 1px solid #1a1a1a; margin-bottom: 20px; display: flex; flex-direction: column; gap: 20px;">
                        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                            <div id="status-pill" style="background: #d4af37; color: #000; padding: 15px 25px; border-radius: 12px; font-weight: 900; font-size: 1.4rem; min-width: 90px; text-align: center; box-shadow: 0 0 20px rgba(212, 175, 55, 0.15);">
                                ...
                            </div>
                            <div style="flex: 1; min-width: 200px;">
                                <h2 style="color: #fff; margin: 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;">Привіт, ${user.displayName || 'Атлет'}! 👋</h2>
                                <p style="color: #d4af37; margin: 5px 0 0 0; font-size: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Твій план на сьогодні готовий</p>
                            </div>
                        </div>
                        <div style="background: rgba(255, 255, 255, 0.03); border-left: 4px solid #d4af37; padding: 15px; border-radius: 0 12px 12px 0;">
                             <span style="color: #666; font-size: 0.75rem; text-transform: uppercase; font-weight: 900; letter-spacing: 1.5px; display: block; margin-bottom: 6px;">Порада тренера:</span>
                             <p id="advice-text" style="color: #eee; margin: 0; font-size: 1rem; font-style: italic; line-height: 1.5;">Завантаження...</p>
                        </div>
                    </div>
                `;
            }

            // Розрахунок ID поточного тижня (Понеділок)
            const d = new Date();
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const weekId = new Date(d.setDate(diff)).toISOString().split('T')[0];
            
            try {
                const doc = await firebase.firestore().collection('weekly_plans').doc(`${user.uid}_${weekId}`).get();
                const fbData = doc.exists ? doc.data().planData : {};
                const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
                
                const mdStatus = calculateStatus(fbData, todayIdx);
                const pill = document.getElementById('status-pill');
                const adviceText = document.getElementById('advice-text');
                
                if (pill) {
                    pill.textContent = mdStatus;
                    pill.style.background = (mdStatus === 'MD' || mdStatus === 'MD-1') ? '#ff4d4d' : '#d4af37';
                }
                if (adviceText) adviceText.textContent = `"${MD_RECS[mdStatus] || MD_RECS['TRAIN']}"`;

                const planKey = `status_plan_${mdStatus}`;
                const exercises = fbData[planKey]?.exercises || [];
                renderExercises(exercises, listContainer);

            } catch (err) { 
                console.error("Firestore Error:", err);
                if (listContainer) listContainer.innerHTML = `<p style="color:red; text-align:center;">Помилка завантаження даних</p>`;
            }
        });
    }

    // Функція рендеру списку вправ
    function renderExercises(exercises, container) {
        if (!container) return;
        if (!exercises || exercises.length === 0) {
            container.innerHTML = `<p style="color:#444; text-align:center; padding:50px; font-size:1.1rem;">Сьогодні вправи не заплановані</p>`;
            return;
        }

        let html = '';
        STAGES_LIST.forEach(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                <div style="margin-bottom:20px; width: 100%;">
                    <div onclick="const content = this.nextElementSibling; const arrow = this.querySelector('.arr'); content.style.display = (content.style.display === 'none' ? 'block' : 'none'); arrow.style.transform = (content.style.display === 'none' ? 'rotate(0deg)' : 'rotate(90deg)')" 
                         style="background:#111; color:#d4af37; padding:20px 25px; border:1px solid #222; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-radius:15px; transition: 0.3s;">
                        <span style="font-weight:900; font-size:1rem; text-transform:uppercase; letter-spacing:2px;">${stage}</span>
                        <span class="arr" style="font-size:1rem; opacity:0.5; transition: 0.3s; display: inline-block;">▶</span>
                    </div>
                    <div style="display:none; padding:20px 0;">
                        ${stageExs.map(ex => `
                            <div class="exercise-card" style="background:#050505; border:1px solid #111; border-radius:18px; padding:20px; margin-bottom:20px; display:flex; flex-direction:column; gap:18px; transition: 0.3s;">
                                <div>
                                    <h4 style="color:#fff; margin:0 0 8px 0; font-size:1.2rem; font-weight:700;">${ex.name}</h4>
                                    <p style="color:#888; font-size:0.95rem; margin:0 0 15px 0; line-height:1.6;">${ex.description || ''}</p>
                                    <div style="display:flex; gap:10px;">
                                        ${ex.reps ? `<span style="color:#d4af37; font-size:0.85rem; font-weight:bold; background:#111; padding:6px 12px; border-radius:8px; border:1px solid #222;">${ex.reps} reps</span>` : ''}
                                        ${ex.sets ? `<span style="color:#d4af37; font-size:0.85rem; font-weight:bold; background:#111; padding:6px 12px; border-radius:8px; border:1px solid #222;">${ex.sets} sets</span>` : ''}
                                    </div>
                                </div>
                                ${ex.videoKey ? `
                                <div style="width:100%; aspect-ratio:16/9; border-radius:15px; overflow:hidden; border:1px solid #222; background: #000;">
                                    <iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                </div>` : ''}
                                <div style="display:flex; justify-content:flex-end;">
                                    <label style="display:flex; align-items:center; gap:10px; background:#000; color:#d4af37; border:1px solid #333; padding:12px 25px; border-radius:30px; cursor:pointer; font-weight:900; font-size:0.75rem; text-transform:uppercase; transition:0.3s;">
                                        <input type="checkbox" style="width:20px; height:20px; accent-color:#d4af37;" onchange="const card = this.closest('.exercise-card'); card.style.opacity = this.checked ? 0.3 : 1; card.style.transform = this.checked ? 'scale(0.98)' : 'scale(1)';"> 
                                        ВИКОНАНО
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }
        });
        container.innerHTML = html;
        
        // Ініціалізація форми зворотного зв'язку, якщо функція існує
        if (typeof renderFeedbackForm === 'function') renderFeedbackForm();
    }

    // Розрахунок статусу MD (Match Day)
    function calculateStatus(data, todayIdx) {
        if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
        if (data[`activity_${todayIdx}`] === 'MATCH') return 'MD';
        
        let matches = [];
        for (let i = 0; i < 7; i++) {
            if (data[`activity_${i}`] === 'MATCH') matches.push(i);
        }
        
        if (matches.length === 0) return 'TRAIN';
        
        let minDiff = Infinity;
        let finalStatus = 'TRAIN';
        
        matches.forEach(mIdx => {
            // Перевіряємо поточний, минулий та наступний тижні для коректних MD+/-
            for (let offset of [-7, 0, 7]) {
                let diff = todayIdx - (mIdx + offset);
                if (diff >= -4 && diff <= 2 && diff !== 0) {
                    if (Math.abs(diff) < Math.abs(minDiff)) {
                        minDiff = diff;
                        finalStatus = diff > 0 ? `MD+${diff}` : `MD${diff}`;
                    }
                }
            }
        });
        return finalStatus;
    }

    // Запуск після завантаження DOM
    document.addEventListener('DOMContentLoaded', initAthleteView);
})();
