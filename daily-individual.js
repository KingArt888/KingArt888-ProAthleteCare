// daily-individual.js — ProAtletCare (ULTIMATE STABLE VERSION)

(function() {
    // 1. КОНСТАНТИ (БЕЗ КОНФЛІКТІВ)
    const YOUTUBE_BASE = 'https://www.youtube.com/embed/';
    const STAGES_LIST = ['Pre-Training', 'Main Training', 'Post-Training'];

    function getCurrentWeekMonday() {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    // 2. ГОЛОВНА ФУНКЦІЯ
    async function initDailyPage() {
        const listContainer = document.getElementById('daily-exercise-list');
        const statusDisplay = document.getElementById('md-status-display');
        
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;

            const weekId = getCurrentWeekMonday();
            const docPath = `${user.uid}_${weekId}`;

            try {
                const doc = await db.collection('weekly_plans').doc(docPath).get();
                if (!doc.exists) {
                    if (listContainer) listContainer.innerHTML = '<p style="text-align:center; color:#555; padding:20px;">План на цей тиждень ще не створено.</p>';
                    return;
                }

                const data = doc.data().planData || {};
                const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;

                // Визначаємо статус за ключами activity_ (як у базі)
                const mdStatus = calculateStatus(data, todayIdx);
                
                if (statusDisplay) {
                    statusDisplay.textContent = mdStatus;
                    const colors = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
                    statusDisplay.className = `md-status ${colors[mdStatus] || 'color-green'}`;
                }

                // Завантаження вправ
                const planKey = `status_plan_${mdStatus}`;
                const dailyPlan = data[planKey];

                if (!dailyPlan || !dailyPlan.exercises || dailyPlan.exercises.length === 0) {
                    listContainer.innerHTML = `<p style="text-align:center; padding:30px; color:#777;">На сьогодні (${mdStatus}) вправи не заплановані.</p>`;
                } else {
                    renderExercises(dailyPlan.exercises, listContainer);
                }

                renderReportForm();
            } catch (err) {
                console.error("Помилка завантаження:", err);
            }
        });
    }

    // 3. ЛОГІКА СТАТУСУ (activity_)
    function calculateStatus(fbData, todayIdx) {
        if (fbData[`activity_${todayIdx}`] === 'REST') return 'REST';
        if (fbData[`activity_${todayIdx}`] === 'MATCH') return 'MD';
        
        let matchDays = [];
        for (let i = 0; i < 7; i++) {
            if (fbData[`activity_${i}`] === 'MATCH') matchDays.push(i);
        }
        
        if (matchDays.length === 0) return 'TRAIN';
        
        let minDiff = Infinity;
        let finalStatus = 'TRAIN';

        matchDays.forEach(mIdx => {
            for (let offset of [-7, 0, 7]) {
                let diff = todayIdx - (mIdx + offset);
                if ((diff === 1 || diff === 2) || (diff >= -4 && diff <= -1)) {
                    if (Math.abs(diff) < Math.abs(minDiff)) {
                        minDiff = diff;
                        finalStatus = diff > 0 ? `MD+${diff}` : `MD${diff}`;
                    }
                }
            }
        });
        return finalStatus;
    }

    // 4. ГАРМОНІЙНИЙ РЕНДЕР (Мале відео + Опис + Галочка)
    function renderExercises(exercises, container) {
        let html = '';
        STAGES_LIST.forEach(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                <div style="margin-bottom:15px;">
                    <div class="stage-header" onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display === 'none' ? 'block' : 'none')" style="background:#111; color:#d4af37; padding:12px 15px; border-left:4px solid #444; cursor:pointer; display:flex; justify-content:space-between; border-radius:4px;">
                        <span style="font-weight:900; font-size:0.75rem; text-transform:uppercase;">${stage}</span>
                        <span style="font-size:0.6rem;">▼</span>
                    </div>
                    <div class="stage-content" style="display:none; padding:10px 0;">
                        ${stageExs.map((ex, i) => `
                            <div class="daily-exercise-item" style="background:#0a0a0a; border:1px solid #222; border-radius:10px; padding:15px; margin-bottom:12px; display:flex; flex-direction:column; gap:10px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <h4 style="color:#fff; margin:0; font-size:1rem;">${ex.name}</h4>
                                    <div style="background:#1a1a1a; padding:5px 10px; border-radius:20px; border:1px solid #333; display:flex; align-items:center; gap:5px;">
                                        <input type="checkbox" id="check-${stage}-${i}" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.3 : 1" style="cursor:pointer;">
                                        <label for="check-${stage}-${i}" style="color:#d4af37; font-size:0.65rem; font-weight:bold; cursor:pointer;">DONE</label>
                                    </div>
                                </div>
                                <div style="display:flex; gap:15px; align-items:center;">
                                    ${ex.videoKey ? `
                                    <div style="width:120px; min-width:120px; aspect-ratio:16/9; border-radius:6px; overflow:hidden; border:1px solid #333;">
                                        <iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                    </div>` : ''}
                                    <div style="flex:1;">
                                        <p style="color:#bbb; font-size:0.8rem; margin:0 0 5px 0;">${ex.description || ''}</p>
                                        <div style="color:#d4af37; font-weight:bold; font-size:0.85rem;">
                                            ${ex.reps ? `Rep: ${ex.reps}` : ''} ${ex.sets ? ` | Sets: ${ex.sets}` : ''}
                                        </div>
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

    // 5. ФОРМА ЗВІТУ
    function renderReportForm() {
        const container = document.getElementById('user-feedback-container');
        if (!container) return;
        container.innerHTML = `
            <div style="background:#0a0a0a; border:1px solid #d4af37; border-radius:12px; padding:20px; margin-top:30px; text-align:center;">
                <h3 style="color:#d4af37; text-transform:uppercase; font-size:0.8rem; margin-bottom:15px;">📊 ЗВІТ ТРЕНУВАННЯ</h3>
                <div style="display:flex; justify-content:center; gap:6px; margin-bottom:15px;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<button onclick="window.setRpe(${n})" class="rpe-btn" id="rpe-${n}" style="background:#1a1a1a; border:none; font-size:18px; color:#333; cursor:pointer; padding:8px; border-radius:6px;">⚡</button>`).join('')}
                </div>
                <textarea id="report-text" style="width:100%; height:60px; background:#111; color:#fff; border:1px solid #333; border-radius:8px; padding:10px; font-size:0.8rem;" placeholder="Коментар для тренера..."></textarea>
                <button onclick="sendReport()" id="send-btn" style="width:100%; padding:14px; background:#d4af37; color:#000; border:none; border-radius:8px; font-weight:900; margin-top:15px; cursor:pointer; text-transform:uppercase;">Надіслати</button>
            </div>
            <style>.rpe-btn.active { color:#d4af37 !important; background:#222 !important; transform:scale(1.2); }</style>
        `;
    }

    let currentRpe = 0;
    window.setRpe = (n) => {
        currentRpe = n;
        document.querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`rpe-${n}`).classList.add('active');
    };

    window.sendReport = async () => {
        if (!currentRpe) return alert("Обери навантаження ⚡");
        try {
            await db.collection("training_reports").add({
                userId: firebase.auth().currentUser.uid,
                date: new Date().toISOString().split('T')[0],
                rpe: currentRpe,
                comment: document.getElementById('report-text').value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            const btn = document.getElementById('send-btn');
            btn.style.background = "#2ecc71"; btn.textContent = "✅ ВІДПРАВЛЕНО"; btn.disabled = true;
        } catch (e) { alert("Помилка!"); }
    };

    document.addEventListener('DOMContentLoaded', initDailyPage);
})();
