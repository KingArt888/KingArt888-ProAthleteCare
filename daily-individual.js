// daily-individual.js — ProAtletCare (COMPACT HEADER & PERSONALIZED)

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

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;

            // Отримуємо ім'я (беремо перше слово, якщо їх декілька)
            const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Атлет';

            // 1. ОНОВЛЕНИЙ КОМПАКТНИЙ HEADER
            if (welcomeBox) {
                welcomeBox.innerHTML = `
                    <div style="background: #0a0a0a; padding: 15px 20px; border-radius: 15px; border: 1px solid #1a1a1a; margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
                        
                        <div id="status-pill" style="background: #d4af37; color: #000; padding: 8px 12px; border-radius: 10px; font-weight: 900; font-size: 1.1rem; min-width: 60px; text-align: center; line-height: 1;">
                            ...
                        </div>

                        <div style="flex: 1;">
                            <h2 style="color: #fff; margin: 0; font-size: 1.1rem; font-weight: 700; line-height: 1.2;">
                                ${firstName}, твій план
                            </h2>
                            <p style="color: #666; margin: 2px 0 0 0; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">
                                ${getFormattedDate()}
                            </p>
                        </div>

                    </div>

                    <div style="background: rgba(212, 175, 55, 0.03); border-left: 3px solid #d4af37; padding: 12px 15px; border-radius: 0 10px 10px 0; margin-bottom: 25px;">
                         <p id="advice-text" style="color: #eee; margin: 0; font-size: 0.85rem; font-style: italic; line-height: 1.4;">
                            Завантаження поради...
                         </p>
                    </div>
                `;
            }

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

            } catch (err) { console.error(err); }
        });
    }

    // Решта функцій (renderExercises, calculateStatus) залишаються такими ж, як у попередньому коді
    function renderExercises(exercises, container) {
        if (!container) return;
        if (!exercises || exercises.length === 0) {
            container.innerHTML = `<p style="color:#444; text-align:center; padding:40px;">План відсутній</p>`;
            return;
        }
        let html = '';
        STAGES_LIST.forEach(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                <div style="margin-bottom:15px; width: 100%;">
                    <div onclick="const content = this.nextElementSibling; content.style.display = (content.style.display === 'none' ? 'block' : 'none')" 
                         style="background:#111; color:#d4af37; padding:15px 20px; border:1px solid #222; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-radius:12px;">
                        <span style="font-weight:900; font-size:0.85rem; text-transform:uppercase; letter-spacing:1px;">${stage}</span>
                        <span style="font-size:0.7rem; opacity:0.5;">▶</span>
                    </div>
                    <div style="display:none; padding:15px 0;">
                        ${stageExs.map(ex => `
                            <div class="ex-card" style="background:#050505; border:1px solid #111; border-radius:15px; padding:15px; margin-bottom:15px; display:flex; flex-direction:column; gap:12px;">
                                <div>
                                    <h4 style="color:#fff; margin:0 0 5px 0; font-size:1rem;">${ex.name}</h4>
                                    <p style="color:#777; font-size:0.8rem; margin:0; line-height:1.4;">${ex.description || ''}</p>
                                </div>
                                ${ex.videoKey ? `<div style="width:100%; aspect-ratio:16/9; border-radius:10px; overflow:hidden;"><iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe></div>` : ''}
                                <div style="display:flex; justify-content:flex-end;">
                                    <label style="display:flex; align-items:center; gap:8px; background:#000; color:#d4af37; border:1px solid #333; padding:8px 15px; border-radius:20px; cursor:pointer; font-weight:900; font-size:0.6rem; text-transform:uppercase;">
                                        <input type="checkbox" onchange="this.closest('.ex-card').style.opacity = this.checked ? 0.3 : 1"> DONE
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }
        });
        container.innerHTML = html;
    }

    function calculateStatus(data, todayIdx) {
        if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
        if (data[`activity_${todayIdx}`] === 'MATCH') return 'MD';
        let matches = [];
        for (let i = 0; i < 7; i++) if (data[`activity_${i}`] === 'MATCH') matches.push(i);
        if (matches.length === 0) return 'TRAIN';
        let min = Infinity; let res = 'TRAIN';
        matches.forEach(m => {
            for (let offset of [-7, 0, 7]) {
                let d = todayIdx - (m + offset);
                if (d >= -4 && d <= 2 && d !== 0) {
                    if (Math.abs(d) < Math.abs(min)) { min = d; res = d > 0 ? `MD+${d}` : `MD${d}`; }
                }
            }
        });
        return res;
    }

    document.addEventListener('DOMContentLoaded', initAthleteView);
})();
