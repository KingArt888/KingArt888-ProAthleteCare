// daily-individual.js — ProAtletCare (PREMIUM FEEDBACK & COMPACT HEADER)

(function() {
    const YOUTUBE_BASE = 'https://www.youtube.com/embed/';
    const STAGES_LIST = ['Pre-Training', 'Main Training', 'Post-Training'];
    let selectedRPE = 0;
    let selectedStars = 0;

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
        const feedbackContainer = document.getElementById('user-feedback-container');

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;
            const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Атлет';

            // 1. КОМПАКТНИЙ HEADER (Золота порада, білий текст)
            if (welcomeBox) {
                welcomeBox.innerHTML = `
                    <div style="background: #0a0a0a; padding: 15px 20px; border-radius: 15px; border: 1px solid #1a1a1a; margin-bottom: 20px; display: flex; align-items: center; gap: 15px;">
                        <div id="status-pill" style="background: #d4af37; color: #000; padding: 8px 12px; border-radius: 10px; font-weight: 900; font-size: 1.1rem; min-width: 60px; text-align: center;">...</div>
                        <div style="flex: 1;">
                            <h2 style="color: #fff; margin: 0; font-size: 1.1rem; font-weight: 700;">${firstName}, твій план</h2>
                            <p style="color: #666; margin: 2px 0 0 0; font-size: 0.75rem;">${getFormattedDate()}</p>
                        </div>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.02); border-left: 3px solid #d4af37; padding: 12px 15px; border-radius: 0 10px 10px 0; margin-bottom: 25px;">
                         <span style="color: #d4af37; font-size: 0.7rem; text-transform: uppercase; font-weight: 900; letter-spacing: 1px; display: block; margin-bottom: 4px;">Порада тренера:</span>
                         <p id="advice-text" style="color: #fff; margin: 0; font-size: 0.9rem; font-style: italic;">Завантаження...</p>
                    </div>
                `;
            }

            const weekId = new Date().toISOString().split('T')[0]; // Для спрощення беремо поточну дату як ключ тижня
            
            try {
                const doc = await firebase.firestore().collection('weekly_plans').doc(`${user.uid}_${weekId}`).get();
                const fbData = doc.exists ? doc.data().planData : {};
                const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
                const mdStatus = calculateStatus(fbData, todayIdx);
                
                document.getElementById('status-pill').textContent = mdStatus;
                document.getElementById('advice-text').textContent = MD_RECS[mdStatus] || MD_RECS['TRAIN'];

                renderExercises(fbData[`status_plan_${mdStatus}`]?.exercises || [], listContainer);
                renderFeedbackForm(feedbackContainer, user, weekId, todayIdx);
            } catch (err) { console.error(err); }
        });
    }

    function renderExercises(exercises, container) {
        if (!exercises.length) { container.innerHTML = "<p style='color:#444;text-align:center;'>Відпочинок</p>"; return; }
        container.innerHTML = STAGES_LIST.map(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (!stageExs.length) return '';
            return `
                <div style="margin-bottom:12px;">
                    <div onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display==='none'?'block':'none')" style="background:#111; color:#d4af37; padding:15px; border-radius:10px; cursor:pointer; display:flex; justify-content:space-between; font-weight:900; font-size:0.8rem;">
                        <span>${stage.toUpperCase()}</span><span>▼</span>
                    </div>
                    <div style="display:none; padding:10px 0;">
                        ${stageExs.map(ex => `
                            <div style="background:#050505; border:1px solid #111; border-radius:15px; padding:15px; margin-bottom:10px; display:flex; flex-direction:column; gap:10px;">
                                <h4 style="color:#fff; margin:0; font-size:1rem;">${ex.name}</h4>
                                ${ex.videoKey ? `<iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; aspect-ratio:16/9; border-radius:8px; border:0;" allowfullscreen></iframe>` : ''}
                                <label style="align-self:flex-end; color:#d4af37; font-size:0.6rem; font-weight:900;"><input type="checkbox" onchange="this.closest('div').style.opacity=this.checked?0.3:1"> DONE</label>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }).join('');
    }

    // 2. ФОРМА ЗВОРОТНОГО ЗВ'ЯЗКУ (БЛИСКАВКИ ТА ЗІРКИ)
    function renderFeedbackForm(container, user, weekId, dayIdx) {
        container.innerHTML = `
            <div style="background:#0a0a0a; border:1px solid #1a1a1a; padding:20px; border-radius:20px; margin-top:30px;">
                <h3 style="color:#fff; text-align:center; font-size:1.1rem; margin-bottom:20px;">Аналіз тренування</h3>
                
                <p style="color:#666; font-size:0.7rem; text-transform:uppercase; text-align:center; margin-bottom:10px;">Складність (RPE)</p>
                <div style="display:flex; justify-content:space-between; margin-bottom:25px;" id="rpe-bolt-container">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<span onclick="setRPE(${n})" class="bolt" style="font-size:1.5rem; cursor:pointer; color:#222; transition:0.3s; filter:drop-shadow(0 0 0 gold);">⚡</span>`).join('')}
                </div>

                <p style="color:#666; font-size:0.7rem; text-transform:uppercase; text-align:center; margin-bottom:10px;">Оцінка тренування</p>
                <div style="display:flex; justify-content:space-between; margin-bottom:25px;" id="star-container">
                    ${[1,2,3,4,5].map(n => `<span onclick="setStars(${n})" class="star" style="font-size:1.8rem; cursor:pointer; color:#222; transition:0.3s;">★</span>`).join('')}
                </div>

                <textarea id="coach-rec" placeholder="Твої пропозиції або коментар тренеру..." style="width:100%; background:#000; border:1px solid #222; color:#fff; padding:12px; border-radius:10px; font-size:0.85rem; height:80px; margin-bottom:20px; box-sizing:border-box;"></textarea>

                <button onclick="saveFeedback('${user.uid}', '${weekId}', ${dayIdx})" id="save-btn" style="width:100%; background:#d4af37; color:#000; border:0; padding:15px; border-radius:12px; font-weight:900; text-transform:uppercase; cursor:pointer;">Зберегти звіт</button>
            </div>
            <style>
                .bolt:hover, .bolt.active { color: #d4af37 !important; filter: drop-shadow(0 0 8px #d4af37) !important; }
                .star:hover, .star.active { color: #ffcc00 !important; filter: drop-shadow(0 0 8px #ffcc00) !important; }
            </style>
        `;
    }

    window.setRPE = (val) => {
        selectedRPE = val;
        document.querySelectorAll('.bolt').forEach((el, i) => el.classList.toggle('active', i < val));
    };

    window.setStars = (val) => {
        selectedStars = val;
        document.querySelectorAll('.star').forEach((el, i) => el.classList.toggle('active', i < val));
    };

    window.saveFeedback = async (uid, weekId, dayIdx) => {
        const comment = document.getElementById('coach-rec').value;
        const btn = document.getElementById('save-btn');
        btn.innerText = "ЗБЕРЕЖЕННЯ...";
        
        try {
            await firebase.firestore().collection('athlete_reports').doc(`${uid}_${new Date().toISOString().split('T')[0]}`).set({
                uid, date: new Date(), rpe: selectedRPE, stars: selectedStars, comment, dayIdx
            });
            btn.style.background = "#2ecc71";
            btn.innerText = "ЗБЕРЕЖЕНО ✓";
        } catch (e) { alert("Помилка"); btn.innerText = "ЗБЕРЕГТИ"; }
    };

    function calculateStatus(data, todayIdx) {
        if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
        if (data[`activity_${todayIdx}`] === 'MATCH') return 'MD';
        let matches = [];
        for (let i = 0; i < 7; i++) if (data[`activity_${i}`] === 'MATCH') matches.push(i);
        if (!matches.length) return 'TRAIN';
        let min = 100, res = 'TRAIN';
        matches.forEach(m => {
            [-7, 0, 7].forEach(o => {
                let d = todayIdx - (m + o);
                if (d >= -4 && d <= 2 && d !== 0 && Math.abs(d) < Math.abs(min)) {
                    min = d; res = d > 0 ? `MD+${d}` : `MD${d}`;
                }
            });
        });
        return res;
    }

    document.addEventListener('DOMContentLoaded', initAthleteView);
})();
