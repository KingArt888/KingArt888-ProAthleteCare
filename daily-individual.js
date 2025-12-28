// daily-individual.js — ProAtletCare (PREMIUM PERSONALIZED)

(function() {
    const YOUTUBE_BASE = 'https://www.youtube.com/embed/';
    const STAGES_LIST = ['Pre-Training', 'Main Training', 'Post-Training'];

    // 1. РЕКОМЕНДАЦІЇ ТРЕНЕРА
    const MD_RECOMMENDATIONS = {
        'MD': 'День гри! Максимальна концентрація. Тільки цільові рухи.',
        'MD+1': 'Відновлення: акцент на мобільності та легкому русі.',
        'MD-1': 'Активація: короткі вибухові рухи, робота над швидкістю.',
        'TRAIN': 'Стандартне тренування: фокус на якості виконання.',
        'REST': 'Повне відновлення. Тіло будується під час спокою.'
    };

    // 2. ФОРМАТУВАННЯ ДАТИ ТА ЧАСУ
    function getFormattedDate() {
        const d = new Date();
        const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота'];
        const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    }

    function getWeekID() {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    // 3. ГОЛОВНА ЛОГІКА СТОРІНКИ
    async function initAthleteInterface() {
        const listContainer = document.getElementById('daily-exercise-list');
        const statusDisplay = document.getElementById('md-status-display');
        const recContainer = document.getElementById('md-recommendations');
        const welcomeContainer = document.getElementById('athlete-welcome'); // Додай цей ID в HTML

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;

            // Вітання атлета
            if (welcomeContainer) {
                const athleteName = user.displayName || "Атлет";
                welcomeContainer.innerHTML = `
                    <div style="margin-bottom: 5px; color: #fff; font-size: 1.4rem; font-weight: 700;">Привіт, ${athleteName}! 👋</div>
                    <div style="color: #d4af37; font-size: 0.85rem; font-weight: 500; letter-spacing: 0.5px;">${getFormattedDate()}</div>
                `;
            }

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

                // Відображення рекомендації
                if (recContainer) {
                    const advice = MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN'];
                    recContainer.innerHTML = `
                        <div style="background: linear-gradient(90deg, #111 0%, #000 100%); border-left: 3px solid #d4af37; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
                            <span style="color: #d4af37; font-weight: 900; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">Порада тренера:</span>
                            <p style="margin: 0; color: #eee; font-size: 0.85rem; font-style: italic; line-height: 1.4;">"${advice}"</p>
                        </div>`;
                }

                const planKey = `status_plan_${mdStatus}`;
                const dailyPlan = fbData[planKey];

                if (dailyPlan && dailyPlan.exercises) {
                    renderExercises(dailyPlan.exercises, listContainer);
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

    function renderExercises(exercises, container) {
        let html = '';
        STAGES_LIST.forEach(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                <div style="margin-bottom:20px;">
                    <div onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display === 'none' ? 'block' : 'none')" style="background:#0a0a0a; color:#d4af37; padding:14px 18px; border:1px solid #1a1a1a; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-radius:10px;">
                        <span style="font-weight:900; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">${stage}</span>
                        <span style="font-size:0.6rem; opacity:0.5;">▼</span>
                    </div>
                    <div style="display:none; padding:12px 0;">
                        ${stageExs.map((ex, i) => `
                            <div class="daily-exercise-item" style="background:#050505; border:1px solid #111; border-radius:15px; padding:20px; margin-bottom:12px; display:flex; gap:20px; align-items:center;">
                                <div style="flex:1;">
                                    <h4 style="color:#fff; margin:0 0 8px 0; font-size:1.1rem; font-weight:600;">${ex.name}</h4>
                                    <p style="color:#666; font-size:0.85rem; line-height:1.4; margin-bottom:12px;">${ex.description || ''}</p>
                                    <div style="display:flex; gap:10px;">
                                        ${ex.reps ? `<div style="background:#111; padding:4px 10px; border-radius:6px; border:1px solid #222;"><span style="color:#d4af37; font-size:0.8rem; font-weight:bold;">${ex.reps} reps</span></div>` : ''}
                                        ${ex.sets ? `<div style="background:#111; padding:4px 10px; border-radius:6px; border:1px solid #222;"><span style="color:#d4af37; font-size:0.8rem; font-weight:bold;">${ex.sets} sets</span></div>` : ''}
                                    </div>
                                </div>
                                <div style="width:250px; min-width:250px; text-align:right;">
                                    ${ex.videoKey ? `
                                    <div style="width:100%; aspect-ratio:16/9; border-radius:12px; overflow:hidden; border:1px solid #222; margin-bottom:10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                                        <iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                    </div>` : ''}
                                    <div style="display:flex; justify-content:flex-end;">
                                        <label style="display:flex; align-items:center; gap:5px; background:#111; color:#d4af37; border:1px solid #333; padding:5px 12px; border-radius:20px; cursor:pointer; font-weight:900; font-size:0.55rem; text-transform:uppercase; transition:0.3s;">
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

    // Решта функцій (RPE) залишаються без змін
    function renderRpeForm() { /* Код форми звіту */ }

    document.addEventListener('DOMContentLoaded', initAthleteInterface);
})();
