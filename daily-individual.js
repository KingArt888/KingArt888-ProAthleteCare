// daily-individual.js — ProAtletCare (PREMIUM + FIX DATA LOAD)

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

    // ФУНКЦІЯ ОТРИМАННЯ ПРАВИЛЬНОГО ID ТИЖНЯ (ЯК У БАЗІ)
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

            // 1. ШАПКА: ПОРАДА ЗОЛОТА, ТЕКСТ БІЛИЙ
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

            try {
                const docPath = `${user.uid}_${weekId}`;
                const doc = await firebase.firestore().collection('weekly_plans').doc(docPath).get();
                
                if (!doc.exists) {
                    listContainer.innerHTML = "<p style='color:#666;text-align:center;padding:40px;'>План на цей тиждень ще не створено.</p>";
                    return;
                }

                const fbData = doc.data().planData || {};
                const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
                const mdStatus = calculateStatus(fbData, todayIdx);
                
                document.getElementById('status-pill').textContent = mdStatus;
                document.getElementById('advice-text').textContent = MD_RECS[mdStatus] || MD_RECS['TRAIN'];

                const planKey = `status_plan_${mdStatus}`;
                renderExercises(fbData[planKey]?.exercises || [], listContainer);
                renderFeedbackForm(feedbackContainer, user.uid, weekId, todayIdx);
            } catch (err) { console.error("Firebase Load Error:", err); }
        });
    }

    function renderExercises(exercises, container) {
        if (!exercises || exercises.length === 0) { 
            container.innerHTML = "<p style='color:#444;text-align:center;padding:40px;'>Сьогодні за планом відпочинок</p>"; 
            return; 
        }
        
        container.innerHTML = STAGES_LIST.map(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (!stageExs.length) return '';
            return `
                <div style="margin-bottom:12px;">
                    <div onclick="const content = this.nextElementSibling; content.style.display = (content.style.display==='none'?'block':'none')" style="background:#111; color:#d4af37; padding:15px; border-radius:10px; cursor:pointer; display:flex; justify-content:space-between; font-weight:900; font-size:0.8rem; border:1px solid #222;">
                        <span>${stage.toUpperCase()}</span><span>▼</span>
                    </div>
                    <div style="display:none; padding:10px 0;">
                        ${stageExs.map(ex => `
                            <div class="ex-card" style="background:#050505; border:1px solid #111; border-radius:15px; padding:15px; margin-bottom:10px; display:flex; flex-direction:column; gap:12px; transition:0.3s;">
                                <h4 style="color:#fff; margin:0; font-size:1rem;">${ex.name}</h4>
                                <p style="color:#777; font-size:0.8rem; margin:0;">${ex.description || ''}</p>
                                ${ex.videoKey ? `<div style="width:100%; aspect-ratio:16/9; border-radius:10px; overflow:hidden;"><iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe></div>` : ''}
                                <div style="display:flex; justify-content:flex-end;">
                                    <label style="display:flex; align-items:center; gap:8px; background:#000; color:#d4af37; border:1px solid #333; padding:8px 15px; border-radius:20px; cursor:pointer; font-weight:900; font-size:0.6rem; text-transform:uppercase;">
                                        <input type="checkbox" onchange="this.closest('.ex-card').style.opacity=this.checked?0.2:1"> DONE
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }).join('');
    }

    function renderFeedbackForm(container, uid, weekId, dayIdx) {
        if (!container) return;
        container.innerHTML = `
            <div style="background:#0a0a0a; border:1px solid #1a1a1a; padding:25px; border-radius:20px; margin-top:30px;">
                <h3 style="color:#fff; text-align:center; font-size:1.1rem; margin-bottom:20px; font-weight:800;">ЗВІТ ТРЕНУВАННЯ</h3>
                
                <p style="color:#d4af37; font-size:0.65rem; text-transform:uppercase; text-align:center; margin-bottom:12px; font-weight:900; letter-spacing:1px;">Складність (RPE)</p>
                <div style="display:flex; justify-content:space-between; margin-bottom:30px;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<span onclick="setRPE(${n})" class="bolt" style="font-size:1.6rem; cursor:pointer; color:#222; transition:0.3s;">⚡</span>`).join('')}
                </div>

                <p style="color:#d4af37; font-size:0.65rem; text-transform:uppercase; text-align:center; margin-bottom:12px; font-weight:900; letter-spacing:1px;">Оцінка тренування</p>
                <div style="display:flex; justify-content:space-between; margin-bottom:30px;">
                    ${[1,2,3,4,5].map(n => `<span onclick="setStars(${n})" class="star" style="font-size:2rem; cursor:pointer; color:#222; transition:0.3s;">★</span>`).join('')}
                </div>

                <textarea id="coach-comment" placeholder="Твої пропозиції або коментар тренеру..." style="width:100%; background:#000; border:1px solid #222; color:#fff; padding:15px; border-radius:12px; font-size:0.9rem; height:90px; margin-bottom:20px; box-sizing:border-box; outline:none;"></textarea>

                <button onclick="submitTrainingReport('${uid}', '${weekId}', ${dayIdx})" id="save-btn" style="width:100%; background:#d4af37; color:#000; border:0; padding:16px; border-radius:12px; font-weight:900; text-transform:uppercase; cursor:pointer; letter-spacing:1px;">Надіслати звіт</button>
            </div>
            <style>
                .bolt.active { color: #d4af37 !important; filter: drop-shadow(0 0 10px rgba(212,175,55,0.6)); }
                .star.active { color: #ffcc00 !important; filter: drop-shadow(0 0 10px rgba(255,204,0,0.6)); }
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
        btn.innerText = "ВІДПРАВКА...";
        
        try {
            await firebase.firestore().collection('athlete_reports').add({
                uid, weekId, dayIdx, rpe: selectedRPE, stars: selectedStars, comment, timestamp: new Date()
            });
            btn.style.background = "#2ecc71";
            btn.innerText = "ЗВІТ НАДІСЛАНО ✓";
        } catch (e) { alert("Помилка збереження"); btn.innerText = "СПРОБУВАТИ ЩЕ РАЗ"; }
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
