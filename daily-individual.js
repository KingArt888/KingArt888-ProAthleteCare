// daily-individual.js — ProAtletCare (CLEAN & FIXED VERSION)

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

            // 1. ПЕРСОНАЛЬНЕ ВІТАННЯ ТА СТАТУС (ФІКС ВИРІВНЮВАННЯ)
            if (welcomeBox) {
                welcomeBox.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 15px; background: #0a0a0a; padding: 20px; border-radius: 15px; border: 1px solid #1a1a1a; margin-bottom: 25px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div id="status-pill" style="background: #d4af37; color: #000; padding: 8px 15px; border-radius: 8px; font-weight: 900; font-size: 1.1rem;">...</div>
                            <div>
                                <h2 style="color: #fff; margin: 0; font-size: 1.3rem;">Привіт, ${user.displayName || 'Атлет'}! 👋</h2>
                                <p style="color: #666; margin: 0; font-size: 0.85rem;">${getFormattedDate()}</p>
                            </div>
                        </div>
                        <div style="border-top: 1px solid #222; padding-top: 10px;">
                            <span style="color: #d4af37; font-size: 0.65rem; text-transform: uppercase; font-weight: 900; letter-spacing: 1px;">Порада тренера:</span>
                            <p id="advice-text" style="color: #eee; margin: 5px 0 0 0; font-size: 0.85rem; font-style: italic;">Завантаження...</p>
                        </div>
                    </div>
                `;
            }

            if (recContainer) recContainer.style.display = 'none';

            // Отримання тижня (Monday-based)
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
                if (adviceText) adviceText.textContent = MD_RECS[mdStatus] || MD_RECS['TRAIN'];

                const planKey = `status_plan_${mdStatus}`;
                const exercises = fbData[planKey]?.exercises || [];
                renderExercises(exercises, listContainer);

            } catch (err) { console.error(err); }
        });
    }

    function renderExercises(exercises, container) {
        if (!exercises || exercises.length === 0) {
            container.innerHTML = `<p style="color:#444; text-align:center; padding:40px;">На сьогодні план відсутній</p>`;
            return;
        }

        let html = '';
        STAGES_LIST.forEach(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                <div style="margin-bottom:15px; width: 100%;">
                    <div onclick="const content = this.nextElementSibling; content.style.display = (content.style.display === 'none' ? 'block' : 'none')" 
                         style="background:#111; color:#d4af37; padding:15px; border:1px solid #222; cursor:pointer; display:flex; justify-content:space-between; border-radius:10px;">
                        <span style="font-weight:900; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px;">${stage}</span>
                        <span>▼</span>
                    </div>
                    <div style="display:none; padding:10px 0;">
                        ${stageExs.map(ex => `
                            <div style="background:#050505; border:1px solid #111; border-radius:12px; padding:15px; margin-bottom:10px; display:flex; flex-direction:column; gap:10px;">
                                <div>
                                    <h4 style="color:#fff; margin:0; font-size:1rem;">${ex.name}</h4>
                                    <p style="color:#666; font-size:0.8rem; margin:5px 0;">${ex.description || ''}</p>
                                    <div style="display:flex; gap:8px;">
                                        ${ex.reps ? `<span style="color:#d4af37; font-size:0.75rem; background:#111; padding:2px 6px; border-radius:4px;">${ex.reps} reps</span>` : ''}
                                        ${ex.sets ? `<span style="color:#d4af37; font-size:0.75rem; background:#111; padding:2px 6px; border-radius:4px;">${ex.sets} sets</span>` : ''}
                                    </div>
                                </div>
                                ${ex.videoKey ? `
                                <div style="width:100%; aspect-ratio:16/9; border-radius:8px; overflow:hidden;">
                                    <iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                </div>` : ''}
                                <label style="align-self: flex-end; display:flex; align-items:center; gap:5px; background:#000; color:#d4af37; border:1px solid #333; padding:4px 10px; border-radius:15px; cursor:pointer; font-weight:900; font-size:0.55rem; text-transform:uppercase;">
                                    <input type="checkbox" onchange="this.closest('div').parentElement.style.opacity = this.checked ? 0.3 : 1"> DONE
                                </label>
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
                if (d >= -4 && d <= 2 && d !== 0) {
                    if (Math.abs(d) < Math.abs(min)) { min = d; res = d > 0 ? `MD+${d}` : `MD${d}`; }
                }
            }
        });
        return res;
    }

    document.addEventListener('DOMContentLoaded', initAthleteView);
})();
