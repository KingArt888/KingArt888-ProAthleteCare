// daily-individual.js — ProAtletCare (PREMIUM COMPACT EDITION)

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
        const days = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
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

    async function initAthleteView() {
        const listContainer = document.getElementById('daily-exercise-list');
        const welcomeBox = document.getElementById('athlete-welcome');
        const feedbackContainer = document.getElementById('user-feedback-container');

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;
            const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Атлет';
            const weekId = getWeekID();

            if (welcomeBox) {
                welcomeBox.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div id="status-pill" style="background: #d4af37; color: #000; padding: 6px 12px; border-radius: 8px; font-weight: 900; font-size: 1rem;">...</div>
                            <div>
                                <h2 style="color: #fff; margin: 0; font-size: 1.2rem; font-weight: 800; text-transform: uppercase;">${firstName}</h2>
                                <p style="color: #555; margin: 0; font-size: 0.7rem; font-weight: 600;">${getFormattedDate()}</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                             <span style="color: #d4af37; font-size: 0.6rem; text-transform: uppercase; font-weight: 900; letter-spacing: 1px; display: block;">ProAtletCare</span>
                             <span style="color: #333; font-size: 0.5rem; font-weight: 900;">PREMIUM ACCESS</span>
                        </div>
                    </div>
                    
                    <div style="background: linear-gradient(90deg, rgba(212,175,55,0.1) 0%, rgba(0,0,0,0) 100%); border-left: 2px solid #d4af37; padding: 10px 15px; margin-bottom: 25px;">
                         <p id="advice-text" style="color: #fff; margin: 0; font-size: 0.85rem; font-style: italic; line-height: 1.4;">Завантаження поради...</p>
                    </div>
                `;
            }

            try {
                const doc = await firebase.firestore().collection('weekly_plans').doc(`${user.uid}_${weekId}`).get();
                const fbData = doc.exists ? doc.data().planData : {};
                const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
                const mdStatus = calculateStatus(fbData, todayIdx);
                
                document.getElementById('status-pill').textContent = mdStatus;
                document.getElementById('advice-text').innerHTML = `<span style="color:#d4af37; font-weight:bold; font-style:normal;">Coach:</span> ${MD_RECS[mdStatus] || MD_RECS['TRAIN']}`;

                renderExercises(fbData[`status_plan_${mdStatus}`]?.exercises || [], listContainer);
                renderFeedbackForm(feedbackContainer, user.uid, weekId, todayIdx);
            } catch (err) { console.error(err); }
        });
    }

    function renderExercises(exercises, container) {
        if (!exercises.length) { container.innerHTML = "<p style='color:#444;text-align:center;'>REST DAY</p>"; return; }
        container.innerHTML = STAGES_LIST.map(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (!stageExs.length) return '';
            return `
                <div style="margin-bottom:10px;">
                    <div onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display==='none'?'block':'none')" style="background:#0a0a0a; color:#d4af37; padding:12px 15px; border-radius:8px; cursor:pointer; display:flex; justify-content:space-between; font-weight:900; font-size:0.75rem; border:1px solid #111;">
                        <span>${stage.toUpperCase()}</span><span>+</span>
                    </div>
                    <div style="display:none; padding:10px 0;">
                        ${stageExs.map(ex => `
                            <div class="ex-card" style="background:#050505; border:1px solid #111; border-radius:12px; padding:12px; margin-bottom:10px; display:flex; flex-direction:column; gap:10px;">
                                <h4 style="color:#fff; margin:0; font-size:0.9rem;">${ex.name}</h4>
                                ${ex.videoKey ? `<iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; aspect-ratio:16/9; border-radius:8px; border:0;" allowfullscreen></iframe>` : ''}
                                <label style="align-self:flex-end; color:#d4af37; font-size:0.55rem; font-weight:900;"><input type="checkbox" onchange="this.closest('.ex-card').style.opacity=this.checked?0.2:1"> DONE</label>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }).join('');
    }

    function renderFeedbackForm(container, uid, weekId, dayIdx) {
        if (!container) return;
        container.innerHTML = `
            <div style="background:#0a0a0a; border:1px solid #1a1a1a; padding:20px; border-radius:15px; margin-top:30px; max-width: 400px; margin-left: auto; margin-right: auto;">
                <h3 style="color:#fff; text-align:center; font-size:0.9rem; margin-bottom:15px; font-weight:800; letter-spacing:1px;">ЗВІТ ТРЕНУВАННЯ</h3>
                
                <div style="display:flex; flex-direction:column; align-items:center; gap:15px;">
                    <div style="width: 100%; text-align: center;">
                        <p style="color:#d4af37; font-size:0.6rem; text-transform:uppercase; margin-bottom:8px; font-weight:900;">Складність (RPE)</p>
                        <div style="display:flex; justify-content:center; gap:8px;">
                            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<span onclick="setRPE(${n})" class="bolt" style="font-size:1.1rem; cursor:pointer; color:#222;">⚡</span>`).join('')}
                        </div>
                    </div>

                    <div style="width: 100%; text-align: center;">
                        <p style="color:#d4af37; font-size:0.6rem; text-transform:uppercase; margin-bottom:8px; font-weight:900;">Оцінка</p>
                        <div style="display:flex; justify-content:center; gap:10px;">
                            ${[1,2,3,4,5].map(n => `<span onclick="setStars(${n})" class="star" style="font-size:1.4rem; cursor:pointer; color:#222;">★</span>`).join('')}
                        </div>
                    </div>
                </div>

                <textarea id="coach-comment" placeholder="Коментар..." style="width:100%; background:#000; border:1px solid #222; color:#fff; padding:10px; border-radius:8px; font-size:0.8rem; height:60px; margin-top:15px; box-sizing:border-box; outline:none;"></textarea>

                <button onclick="submitTrainingReport('${uid}', '${weekId}', ${dayIdx})" id="save-btn" style="width:100%; background:#d4af37; color:#000; border:0; padding:12px; border-radius:10px; font-weight:900; text-transform:uppercase; cursor:pointer; margin-top:15px; font-size:0.75rem;">Надіслати</button>
            </div>
            <style>
                .bolt.active { color: #d4af37 !important; filter: drop-shadow(0 0 5px #d4af37); }
                .star.active { color: #ffcc00 !important; filter: drop-shadow(0 0 5px #ffcc00); }
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

    window.submitTrainingReport = async (uid, weekId, dayIdx) => {
        const comment = document.getElementById('coach-comment').value;
        const btn = document.getElementById('save-btn');
        btn.innerText = "ОБРОБКА...";
        try {
            await firebase.firestore().collection('athlete_reports').add({
                uid, weekId, dayIdx, rpe: selectedRPE, stars: selectedStars, comment, timestamp: new Date()
            });
            btn.style.background = "#2ecc71";
            btn.innerText = "ГОТОВО ✓";
        } catch (e) { btn.innerText = "ПОМИЛКА"; }
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
