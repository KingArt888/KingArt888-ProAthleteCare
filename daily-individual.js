// daily-individual.js — ProAtletCare (PREMIUM DATE & COMPACT DONE)

(function() {
    const YOUTUBE_BASE = 'https://www.youtube.com/embed/';
    const STAGES_LIST = ['Pre-Training', 'Main Training', 'Post-Training'];

    // РЕКОМЕНДАЦІЇ (Інтегровано в код)
    const MD_RECOMMENDATIONS = {
        'MD': 'День гри! Максимальна концентрація. Тільки цільові рухи.',
        'MD+1': 'Відновлення: акцент на мобільності та легкому русі.',
        'MD-1': 'Активація: короткі вибухові рухи, робота над швидкістю.',
        'TRAIN': 'Стандартне тренування: фокус на якості виконання.',
        'REST': 'Повне відновлення. Тіло будується під час спокою.'
    };

    // Функція для отримання поточної дати українською
    function getFormattedDate() {
        const d = new Date();
        const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота'];
        const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
        
        const dayName = days[d.getDay()];
        const dayNum = d.getDate();
        const monthName = months[d.getMonth()];
        
        return `${dayName}, ${dayNum} ${monthName}`;
    }

    function getWeekID() {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    async function initPremiumAthleteView() {
        const listContainer = document.getElementById('daily-exercise-list');
        const statusDisplay = document.getElementById('md-status-display');
        const recContainer = document.getElementById('md-recommendations');
        
        // Знаходимо або створюємо блок для дати
        let dateDisplay = document.getElementById('current-date-display');
        if (!dateDisplay) {
            // Якщо в HTML немає id='current-date-display', ми можемо замінити ним блок "Цикл MDX"
            const mdxLabel = document.querySelector('span:contains("Цикл MDX")') || document.querySelector('.mdx-label-container'); 
            // Порада: краще просто додати елемент в HTML, але я зроблю заміну через код:
            const infoRow = document.querySelector('.status-info-row'); // Припускаю назву контейнера
            if (infoRow) infoRow.innerHTML = `<div id="current-date-display" style="color:#d4af37; font-weight:bold; font-size:0.9rem;">${getFormattedDate()}</div>`;
        } else {
            dateDisplay.textContent = getFormattedDate();
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;
            const weekId = getWeekID();
            const docPath = `${user.uid}_${weekId}`;

            try {
                const doc = await db.collection('weekly_plans').doc(docPath).get();
                if (!doc.exists) return;

                const fbData = doc.data().planData || {};
                const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
                const mdStatus = calculateStatus(fbData, todayIdx);
                
                if (statusDisplay) {
                    statusDisplay.textContent = mdStatus;
                    const colors = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
                    statusDisplay.className = `md-status ${colors[mdStatus] || 'color-green'}`;
                }

                if (recContainer) {
                    const advice = MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN'];
                    recContainer.innerHTML = `
                        <div style="background:linear-gradient(90deg, #111 0%, #000 100%); border-left:3px solid #d4af37; padding:15px; border-radius:0 8px 8px 0; margin-bottom:25px;">
                            <span style="color:#d4af37; font-weight:900; font-size:0.6rem; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:5px;">Порада на сьогодні:</span>
                            <p style="margin:0; color:#fff; font-size:0.85rem; font-style:italic;">"${advice}"</p>
                        </div>`;
                }

                const planKey = `status_plan_${mdStatus}`;
                const dailyPlan = fbData[planKey];

                if (dailyPlan && dailyPlan.exercises) {
                    renderPremiumExercises(dailyPlan.exercises, listContainer);
                }
                renderRpeForm();
            } catch (err) { console.error(err); }
        });
    }

    function calculateStatus(data, todayIdx) {
        if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
        if (data[`activity_${todayIdx}`] === 'MATCH') return 'MD';
        let matches = [];
        for (let i = 0; i < 7; i++) if (data[`activity_${i}`] === 'MATCH') matches.push(i);
        if (matches.length === 0) return 'TRAIN';
        let minDiff = Infinity; let res = 'TRAIN';
        matches.forEach(m => {
            for (let o of [-7, 0, 7]) {
                let d = todayIdx - (m + o);
                if ((d === 1 || d === 2) || (d >= -4 && d <= -1)) {
                    if (Math.abs(d) < Math.abs(minDiff)) { minDiff = d; res = d > 0 ? `MD+${d}` : `MD${d}`; }
                }
            }
        });
        return res;
    }

    function renderPremiumExercises(exercises, container) {
        let html = '';
        STAGES_LIST.forEach(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                <div style="margin-bottom:20px;">
                    <div onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display === 'none' ? 'block' : 'none')" style="background:#0a0a0a; color:#d4af37; padding:14px; border:1px solid #1a1a1a; cursor:pointer; display:flex; justify-content:space-between; border-radius:8px;">
                        <span style="font-weight:900; font-size:0.7rem; text-transform:uppercase; letter-spacing:1px;">${stage}</span>
                        <span style="font-size:0.6rem; opacity:0.5;">▼</span>
                    </div>
                    <div style="display:none; padding:10px 0;">
                        ${stageExs.map((ex, i) => `
                            <div class="daily-exercise-item" style="background:#050505; border:1px solid #111; border-radius:12px; padding:20px; margin-bottom:12px; display:flex; gap:25px; align-items:center;">
                                <div style="flex:1;">
                                    <h4 style="color:#fff; margin:0 0 8px 0; font-size:1.05rem;">${ex.name}</h4>
                                    <p style="color:#666; font-size:0.8rem; line-height:1.4; margin-bottom:15px;">${ex.description || ''}</p>
                                    <div style="display:flex; gap:12px;">
                                        ${ex.reps ? `<div style="background:#111; padding:5px 10px; border-radius:6px; border:1px solid #222;"><span style="color:#d4af37; font-size:0.8rem; font-weight:bold;">${ex.reps} reps</span></div>` : ''}
                                        ${ex.sets ? `<div style="background:#111; padding:5px 10px; border-radius:6px; border:1px solid #222;"><span style="color:#d4af37; font-size:0.8rem; font-weight:bold;">${ex.sets} sets</span></div>` : ''}
                                    </div>
                                </div>
                                <div style="width:250px; text-align:right;">
                                    ${ex.videoKey ? `
                                    <div style="width:100%; aspect-ratio:16/9; border-radius:10px; overflow:hidden; border:1px solid #222; margin-bottom:10px;">
                                        <iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                    </div>` : ''}
                                    <div style="display:flex; justify-content:flex-end;">
                                        <label style="display:flex; align-items:center; gap:6px; background:#111; color:#d4af37; border:1px solid #333; padding:5px 10px; border-radius:20px; cursor:pointer; font-weight:900; font-size:0.55rem; text-transform:uppercase; transition:0.2s;">
                                            <input type="checkbox" style="width:12px; height:12px; accent-color:#d4af37;" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.2 : 1; this.parentElement.style.background = this.checked ? '#2ecc71' : '#111'; this.parentElement.style.color = this.checked ? '#000' : '#d4af37';">
                                            DONE
                                        </label>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }
        });
        container.innerHTML = html;
    }

    // Форма RPE (без змін)
    function renderRpeForm() { /* ... */ }
    window.setDailyRpe = (n) => { /* ... */ };
    window.sendDailyReport = async () => { /* ... */ };

    document.addEventListener('DOMContentLoaded', initPremiumAthleteView);
})();
