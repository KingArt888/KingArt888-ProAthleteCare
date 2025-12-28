// daily-individual.js — ProAtletCare (PREMIUM SYNC)

(function() {
    // 1. БІБЛІОТЕКА РЕКОМЕНДАЦІЙ (Тепер вони точно підтягнуться)
    const MD_RECOMMENDATIONS = {
        'MD': 'День гри! Максимальна концентрація. Тільки цільові рухи та повна мобілізація.',
        'MD+1': 'Відновлення: акцент на мобільності та виведенні продуктів розпаду. Низька інтенсивність.',
        'MD+2': 'Регенерація: легка активація м’язів, підготовка до повернення в загальну групу.',
        'MD-1': 'Активація: короткі вибухові рухи, робота над реакцією та швидкістю без перевтоми.',
        'MD-2': 'Тактична підготовка: фокус на гостроті дій та специфічних ігрових патернах.',
        'MD-3': 'Робочий пік: основне навантаження тижня. Працюємо на результат.',
        'MD-4': 'Силова база: розвиток потужності та витривалості.',
        'TRAIN': 'Стандартне тренування: дотримуйся техніки та заданого темпу.',
        'REST': 'Повне відновлення. Твоє тіло стає сильнішим саме під час відпочинку.'
    };

    const YOUTUBE_BASE = 'https://www.youtube.com/embed/';
    const STAGES_LIST = ['Pre-Training', 'Main Training', 'Post-Training'];

    function getWeekID() {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    async function initAthleteView() {
        const listContainer = document.getElementById('daily-exercise-list');
        const statusDisplay = document.getElementById('md-status-display');
        const recContainer = document.getElementById('md-recommendations');

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;
            const weekId = getWeekID();
            const docPath = `${user.uid}_${weekId}`;

            try {
                const doc = await db.collection('weekly_plans').doc(docPath).get();
                if (!doc.exists) return;

                const fbData = doc.data().planData || {};
                const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;

                // Розрахунок статусу дня (MDX)
                const mdStatus = calculateAthleteStatus(fbData, todayIdx);
                
                if (statusDisplay) {
                    statusDisplay.textContent = mdStatus;
                    const styleMap = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
                    statusDisplay.className = `md-status ${styleMap[mdStatus] || 'color-green'}`;
                }

                // ВІДОБРАЖЕННЯ РЕКОМЕНДАЦІЙ
                if (recContainer) {
                    const advice = MD_RECOMMENDATIONS[mdStatus] || MD_RECOMMENDATIONS['TRAIN'];
                    recContainer.innerHTML = `
                        <div style="background:linear-gradient(90deg, #111 0%, #000 100%); border-left:4px solid #d4af37; padding:20px; border-radius:0 12px 12px 0; margin-bottom:30px; box-shadow: 10px 0 20px rgba(0,0,0,0.5);">
                            <span style="color:#d4af37; font-weight:900; font-size:0.65rem; text-transform:uppercase; letter-spacing:2px; display:block; margin-bottom:8px;">Пріоритет на сьогодні:</span>
                            <p style="margin:0; color:#fff; font-size:0.95rem; font-style:italic; line-height:1.4;">"${advice}"</p>
                        </div>`;
                }

                const planKey = `status_plan_${mdStatus}`;
                const dailyPlan = fbData[planKey];

                if (!dailyPlan || !dailyPlan.exercises || dailyPlan.exercises.length === 0) {
                    listContainer.innerHTML = `<p style="text-align:center; padding:50px; color:#444; font-size:0.9rem;">Вправ не заплановано</p>`;
                } else {
                    renderPremiumExercises(dailyPlan.exercises, listContainer);
                }
                renderRpeForm();
            } catch (err) { console.error(err); }
        });
    }

    function calculateAthleteStatus(data, todayIdx) {
        if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
        if (data[`activity_${todayIdx}`] === 'MATCH') return 'MD';
        let matches = [];
        for (let i = 0; i < 7; i++) if (data[`activity_${i}`] === 'MATCH') matches.push(i);
        if (matches.length === 0) return 'TRAIN';
        let minDiff = Infinity; let finalS = 'TRAIN';
        matches.forEach(m => {
            for (let offset of [-7, 0, 7]) {
                let d = todayIdx - (m + offset);
                if ((d === 1 || d === 2) || (d >= -4 && d <= -1)) {
                    if (Math.abs(d) < Math.abs(minDiff)) { minDiff = d; finalS = d > 0 ? `MD+${d}` : `MD${d}`; }
                }
            }
        });
        return finalS;
    }

    function renderPremiumExercises(exercises, container) {
        let html = '';
        STAGES_LIST.forEach(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                <div style="margin-bottom:25px;">
                    <div onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display === 'none' ? 'block' : 'none')" style="background:#0a0a0a; color:#d4af37; padding:18px; border:1px solid #1a1a1a; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-radius:10px;">
                        <span style="font-weight:900; font-size:0.8rem; text-transform:uppercase; letter-spacing:2px;">${stage}</span>
                        <span style="font-size:0.7rem; opacity:0.6;">▼</span>
                    </div>
                    <div style="display:none; padding:15px 0;">
                        ${stageExs.map((ex, i) => `
                            <div class="daily-exercise-item" style="background:#050505; border:1px solid #111; border-radius:15px; padding:25px; margin-bottom:15px; display:flex; gap:30px; align-items:flex-start; transition:0.3s;">
                                <div style="flex:1;">
                                    <h4 style="color:#fff; margin:0 0 10px 0; font-size:1.2rem; font-weight:700;">${ex.name}</h4>
                                    <p style="color:#777; font-size:0.9rem; line-height:1.6; margin-bottom:20px;">${ex.description || ''}</p>
                                    <div style="display:flex; gap:20px;">
                                        ${ex.reps ? `<div style="background:#111; padding:8px 15px; border-radius:8px; border:1px solid #222;"><span style="color:#444; font-size:0.6rem; display:block; font-weight:900;">REPS</span><span style="color:#d4af37; font-size:1.1rem; font-weight:bold;">${ex.reps}</span></div>` : ''}
                                        ${ex.sets ? `<div style="background:#111; padding:8px 15px; border-radius:8px; border:1px solid #222;"><span style="color:#444; font-size:0.6rem; display:block; font-weight:900;">SETS</span><span style="color:#d4af37; font-size:1.1rem; font-weight:bold;">${ex.sets}</span></div>` : ''}
                                    </div>
                                </div>
                                <div style="width:250px; min-width:250px;">
                                    ${ex.videoKey ? `
                                    <div style="width:100%; aspect-ratio:16/9; border-radius:12px; overflow:hidden; border:1px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.8); margin-bottom:15px;">
                                        <iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                    </div>` : ''}
                                    <label style="display:flex; align-items:center; justify-content:center; gap:10px; background:#111; color:#d4af37; border:1px solid #d4af37; padding:12px; border-radius:50px; cursor:pointer; font-weight:900; font-size:0.75rem; text-transform:uppercase; transition:0.3s;">
                                        <input type="checkbox" style="width:18px; height:18px; accent-color:#d4af37;" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.2 : 1; this.parentElement.style.background = this.checked ? '#2ecc71' : '#111'; this.parentElement.style.color = this.checked ? '#000' : '#d4af37';">
                                        Мною виконано
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

    function renderRpeForm() {
        const container = document.getElementById('user-feedback-container');
        if (!container) return;
        container.innerHTML = `
            <div style="background:#0a0a0a; border:1px solid #d4af37; border-radius:20px; padding:30px; margin-top:50px; text-align:center;">
                <h3 style="color:#d4af37; text-transform:uppercase; font-size:0.85rem; letter-spacing:3px; margin-bottom:30px;">Daily Intensity Score</h3>
                <div style="display:flex; justify-content:center; gap:8px; margin-bottom:25px; flex-wrap:wrap;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<button onclick="window.setDailyRpe(${n})" class="rpe-bolt" id="btn-rpe-${n}" style="background:#111; border:1px solid #222; font-size:24px; color:#222; cursor:pointer; padding:12px; border-radius:10px; transition:0.3s;">⚡</button>`).join('')}
                </div>
                <textarea id="coach-comment" style="width:100%; height:100px; background:#000; color:#fff; border:1px solid #1a1a1a; border-radius:12px; padding:20px; font-size:0.95rem; margin-bottom:20px; outline:none; focus:border-color:#d4af37;" placeholder="Твій фідбек для тренера..."></textarea>
                <button id="send-report-btn" onclick="sendDailyReport()" style="width:100%; padding:20px; background:#d4af37; color:#000; border:none; border-radius:12px; font-weight:900; cursor:pointer; text-transform:uppercase; letter-spacing:2px; font-size:0.9rem;">Надіслати звіт тренеру</button>
            </div>
            <style>.rpe-bolt.active { color:#d4af37 !important; text-shadow:0 0 20px #d4af37; transform:translateY(-8px); background:#1a1a1a !important; border-color:#d4af37 !important; }</style>
        `;
    }

    let selectedRpe = 0;
    window.setDailyRpe = (n) => {
        selectedRpe = n;
        document.querySelectorAll('.rpe-bolt').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-rpe-${n}`).classList.add('active');
    };

    window.sendDailyReport = async () => {
        if (!selectedRpe) return alert("Обери рівень навантаження ⚡");
        const btn = document.getElementById('send-report-btn');
        try {
            await db.collection("training_reports").add({
                userId: firebase.auth().currentUser.uid,
                date: new Date().toISOString().split('T')[0],
                rpe: selectedRpe,
                comment: document.getElementById('coach-comment').value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            btn.style.background = "#2ecc71"; btn.textContent = "✅ Звіт прийнято"; btn.disabled = true;
        } catch (e) { alert("Помилка зв'язку"); }
    };

    document.addEventListener('DOMContentLoaded', initAthleteView);
})();
