// daily-individual.js — ProAtletCare (PREMIUM ALIGNED VERSION)

(function() {
    const YOUTUBE_BASE = 'https://www.youtube.com/embed/';
    const STAGES_LIST = ['Pre-Training', 'Main Training', 'Post-Training'];

    const MD_RECS = {
        'MD': 'День гри! Максимальна концентрація. Тільки цільові рухи.',
        'MD+1': 'Відновлення: акцент на мобільності та легкому русі.',
        'MD-1': 'Активація: короткі вибухові рухи, робота над швидкістю.',
        'TRAIN': 'Стандартне тренування: фокус на якості виконання.',
        'REST': 'Повне відновлення. Тіло будується під час спокою.'
    };

    function getFormattedDate() {
        const d = new Date();
        const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота'];
        const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    }

    async function initAthleteView() {
        const listContainer = document.getElementById('daily-exercise-list');
        const welcomeBox = document.getElementById('athlete-welcome');
        const recContainer = document.getElementById('md-recommendations');

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;

            // 1. Створюємо єдину структуру для статусів та вітання (Фікс "з’їхало")
            if (welcomeBox) {
                welcomeBox.style.padding = "0";
                welcomeBox.innerHTML = `
                    <div style="display: grid; grid-template-columns: auto 1fr auto; gap: 20px; align-items: center; background: #0a0a0a; padding: 20px; border-radius: 15px; border: 1px solid #1a1a1a; margin-bottom: 25px;">
                        <div id="status-pill" style="background: #d4af37; color: #000; padding: 10px 20px; border-radius: 10px; font-weight: 900; font-size: 1.2rem; text-align: center; min-width: 80px;">
                            ...
                        </div>
                        
                        <div>
                            <h2 style="color: #fff; margin: 0; font-size: 1.4rem; font-weight: 800;">Привіт, ${user.displayName || 'Атлет'}! 👋</h2>
                            <p style="color: #666; margin: 3px 0 0 0; font-size: 0.85rem;">${getFormattedDate()}</p>
                        </div>

                        <div id="mini-advice" style="max-width: 300px; border-left: 2px solid #d4af37; padding-left: 15px;">
                            <span style="color: #d4af37; font-size: 0.65rem; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">Порада:</span>
                            <p id="advice-text" style="color: #eee; margin: 2px 0 0 0; font-size: 0.8rem; font-style: italic;">Завантаження...</p>
                        </div>
                    </div>
                `;
            }

            // Очищуємо старі контейнери, які тепер в середині welcomeBox
            if (recContainer) recContainer.style.display = 'none';

            const weekId = new Date().toISOString().split('T')[0]; 
            
            try {
                const doc = await db.collection('weekly_plans').doc(`${user.uid}_${weekId}`).get();
                const fbData = doc.exists ? doc.data().planData : {};
                const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
                const mdStatus = calculateStatus(fbData, todayIdx);
                
                // Оновлюємо статус та пораду в новому блоці
                const pill = document.getElementById('status-pill');
                const adviceText = document.getElementById('advice-text');
                
                if (pill) {
                    pill.textContent = mdStatus;
                    pill.style.background = (mdStatus === 'MD' || mdStatus === 'MD-1') ? '#ff4d4d' : '#d4af37';
                }
                if (adviceText) adviceText.textContent = MD_RECS[mdStatus] || MD_RECS['TRAIN'];

                const planKey = `status_plan_${mdStatus}`;
                const exercises = fbData[planKey]?.exercises || [];
                renderExercises(exercises, listContainer);

            } catch (err) { console.error(err); }
        });
    }

    function renderExercises(exercises, container) {
        if (!exercises.length) {
            container.innerHTML = `<p style="color:#444; text-align:center; padding:40px;">На сьогодні план відсутній</p>`;
            return;
        }

        let html = '';
        STAGES_LIST.forEach(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                <div style="margin-bottom:20px;">
                    <div onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display === 'none' ? 'block' : 'none')" 
                         style="background:#111; color:#d4af37; padding:15px 20px; border:1px solid #222; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-radius:12px;">
                        <span style="font-weight:900; font-size:0.75rem; text-transform:uppercase; letter-spacing:2px;">${stage}</span>
                        <span style="font-size:0.6rem;">▼</span>
                    </div>
                    <div style="display:none; padding:15px 0;">
                        ${stageExs.map(ex => `
                            <div class="daily-exercise-item" style="background:#050505; border:1px solid #111; border-radius:16px; padding:20px; margin-bottom:12px; display:flex; gap:25px; align-items:center;">
                                <div style="flex:1;">
                                    <h4 style="color:#fff; margin:0 0 8px 0; font-size:1.1rem; font-weight:700;">${ex.name}</h4>
                                    <div style="display:flex; gap:10px;">
                                        ${ex.reps ? `<span style="color:#d4af37; font-size:0.8rem; font-weight:bold; background:#111; padding:3px 8px; border-radius:5px;">${ex.reps} reps</span>` : ''}
                                        ${ex.sets ? `<span style="color:#d4af37; font-size:0.8rem; font-weight:bold; background:#111; padding:3px 8px; border-radius:5px;">${ex.sets} sets</span>` : ''}
                                    </div>
                                </div>
                                <div style="width:250px; text-align:right;">
                                    <div style="width:100%; aspect-ratio:16/9; border-radius:12px; overflow:hidden; border:1px solid #222; margin-bottom:10px;">
                                        <iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                    </div>
                                    <label style="display:inline-flex; align-items:center; gap:5px; background:#000; color:#d4af37; border:1px solid #333; padding:5px 12px; border-radius:20px; cursor:pointer; font-weight:900; font-size:0.55rem; text-transform:uppercase; transition:0.3s;">
                                        <input type="checkbox" style="width:12px; height:12px; accent-color:#d4af37;" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.3 : 1; this.parentElement.style.background = this.checked ? '#2ecc71' : '#000'; this.parentElement.style.color = this.checked ? '#000' : '#d4af37';">
                                        DONE
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }
        });
        container.innerHTML = html;
        if (typeof renderFeedbackForm === 'function') renderFeedbackForm();
    }

    function calculateStatus(data, todayIdx) {
        if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
        if (data[`activity_${todayIdx}`] === 'MATCH') return 'MD';
        let matches = [];
        for (let i = 0; i < 7; i++) if (data[`activity_${i}`] === 'MATCH') matches.push(i);
        if (matches.length === 0) return 'TRAIN';
        let min = Infinity; let res = 'TRAIN';
        matches.forEach(m => {
            for (let o of [-7, 0, 7]) {
                let d = todayIdx - (m + o);
                if ((d >= -4 && d <= 2 && d !== 0)) {
                    if (Math.abs(d) < Math.abs(min)) { min = d; res = d > 0 ? `MD+${d}` : `MD${d}`; }
                }
            }
        });
        return res;
    }

    document.addEventListener('DOMContentLoaded', initAthleteView);
})();
