// daily-individual.js — ProAtletCare (PREMIUM DESIGN & ADVICE FIX)

(function() {
    const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];
    const YOUTUBE_BASE = 'https://www.youtube.com/embed/';

    // Мапа порад (тепер вони точно підтягнуться)
    const ADVICE_MAP = {
        'MD': 'День гри! Максимальна концентрація та повна мобілізація сил.',
        'MD-1': 'Передігрове тренування: тонус та швидкість без перевтоми.',
        'MD-2': 'Робота над тактикою та гостротою рухів.',
        'MD+1': 'Відновлення: легкий стретчинг та лімфодренаж.',
        'TRAIN': 'Робочий день: фокус на техніці та інтенсивності.',
        'REST': 'Повний спокій. Тіло будується під час відпочинку.'
    };

    function getWeekID() {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    }

    async function loadPremiumDailyPlan() {
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

                // Визначаємо статус
                const mdStatus = calculateStatus(fbData, todayIdx);
                
                if (statusDisplay) {
                    statusDisplay.textContent = mdStatus;
                    const colors = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
                    statusDisplay.className = `md-status ${colors[mdStatus] || 'color-green'}`;
                }

                // Підтягуємо рекомендацію
                if (recContainer) {
                    const advice = ADVICE_MAP[mdStatus] || "Дотримуйтесь індивідуального плану.";
                    recContainer.innerHTML = `
                        <div style="border-left:3px solid #d4af37; padding:15px; background:linear-gradient(90deg, #111 0%, #000 100%); margin-bottom:25px; border-radius:0 8px 8px 0;">
                            <p style="margin:0; color:#fff; font-size:0.9rem; font-style:italic;">
                                <span style="color:#d4af37; font-weight:900; font-size:0.65rem; text-transform:uppercase; display:block; margin-bottom:5px; font-style:normal; letter-spacing:1px;">Порада тренера:</span>
                                "${advice}"
                            </p>
                        </div>`;
                }

                const planKey = `status_plan_${mdStatus}`;
                const plan = fbData[planKey];

                if (!plan || !plan.exercises || plan.exercises.length === 0) {
                    listContainer.innerHTML = `<p style="text-align:center; padding:40px; color:#444;">План відсутній</p>`;
                } else {
                    renderPremiumList(plan.exercises, listContainer);
                }
                renderFeedbackForm();
            } catch (err) { console.error(err); }
        });
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
                if ((d === 1 || d === 2) || (d >= -4 && d <= -1)) {
                    if (Math.abs(d) < Math.abs(min)) { min = d; res = d > 0 ? `MD+${d}` : `MD${d}`; }
                }
            }
        });
        return res;
    }

    function renderPremiumList(exercises, container) {
        let html = '';
        STAGES.forEach(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                <div style="margin-bottom:20px;">
                    <div onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display === 'none' ? 'block' : 'none')" style="background:#111; color:#d4af37; padding:16px; border-left:4px solid #444; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-radius:4px; transition:0.3s;">
                        <span style="font-weight:900; font-size:0.75rem; text-transform:uppercase; letter-spacing:2px;">${stage}</span>
                        <span style="font-size:0.7rem; opacity:0.5;">▼</span>
                    </div>
                    <div style="display:none; padding:15px 0;">
                        ${stageExs.map((ex, i) => `
                            <div class="daily-exercise-item" style="background:linear-gradient(145deg, #0f0f0f 0%, #050505 100%); border:1px solid #1a1a1a; border-radius:15px; padding:20px; margin-bottom:15px; position:relative; overflow:hidden;">
                                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px;">
                                    <h4 style="color:#fff; margin:0; font-size:1.1rem; font-weight:600; letter-spacing:0.5px; flex:1;">${ex.name}</h4>
                                </div>
                                
                                <div style="display:flex; gap:20px; align-items:flex-end;">
                                    <div style="flex:1;">
                                        <p style="color:#888; font-size:0.85rem; line-height:1.5; margin:0 0 15px 0;">${ex.description || ''}</p>
                                        <div style="display:flex; gap:15px;">
                                            ${ex.reps ? `<div style="background:#1a1a1a; padding:6px 12px; border-radius:6px; border:1px solid #222;"><span style="color:#666; font-size:0.6rem; text-transform:uppercase; display:block;">REPS</span><span style="color:#d4af37; font-weight:bold; font-size:0.9rem;">${ex.reps}</span></div>` : ''}
                                            ${ex.sets ? `<div style="background:#1a1a1a; padding:6px 12px; border-radius:6px; border:1px solid #222;"><span style="color:#666; font-size:0.6rem; text-transform:uppercase; display:block;">SETS</span><span style="color:#d4af37; font-weight:bold; font-size:0.9rem;">${ex.sets}</span></div>` : ''}
                                        </div>
                                    </div>

                                    <div style="width:200px; min-width:200px; text-align:right;">
                                        ${ex.videoKey ? `
                                        <div style="width:100%; aspect-ratio:16/9; border-radius:10px; overflow:hidden; border:1px solid #333; box-shadow:0 10px 20px rgba(0,0,0,0.5); margin-bottom:10px;">
                                            <iframe src="${YOUTUBE_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                        </div>` : ''}
                                        <label style="display:flex; align-items:center; justify-content:center; background:#d4af37; color:#000; padding:8px 15px; border-radius:30px; cursor:pointer; font-weight:900; font-size:0.7rem; text-transform:uppercase; transition:0.3s;">
                                            <input type="checkbox" style="margin-right:8px; accent-color:#000;" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.3 : 1; this.parentElement.style.background = this.checked ? '#2ecc71' : '#d4af37';">
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

    function renderFeedbackForm() {
        const container = document.getElementById('user-feedback-container');
        if (!container) return;
        container.innerHTML = `
            <div style="background:linear-gradient(180deg, #0a0a0a 0%, #000 100%); border:1px solid #d4af37; border-radius:15px; padding:25px; margin-top:40px; box-shadow: 0 0 30px rgba(212,175,55,0.1);">
                <h3 style="color:#d4af37; text-align:center; text-transform:uppercase; font-size:0.85rem; letter-spacing:2px; margin-bottom:25px;">📊 Daily Performance Review</h3>
                <div style="display:flex; justify-content:center; gap:8px; margin-bottom:20px;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<button onclick="window.setDailyRpe(${n})" class="rpe-bolt" id="btn-rpe-${n}" style="background:#111; border:1px solid #222; font-size:22px; color:#222; cursor:pointer; padding:10px; border-radius:8px; transition:0.4s;">⚡</button>`).join('')}
                </div>
                <textarea id="coach-comment" style="width:100%; height:80px; background:#0a0a0a; color:#fff; border:1px solid #222; border-radius:10px; padding:15px; font-size:0.9rem; margin-bottom:20px; outline:none;" placeholder="Як пройшло тренування?"></textarea>
                <button id="send-report-btn" onclick="sendDailyReport()" style="width:100%; padding:18px; background:#d4af37; color:#000; border:none; border-radius:10px; font-weight:900; cursor:pointer; text-transform:uppercase; letter-spacing:1px;">Надіслати звіт</button>
            </div>
            <style>.rpe-bolt.active { color:#d4af37 !important; text-shadow:0 0 15px #d4af37; transform:translateY(-5px); background:#1a1a1a !important; border-color:#d4af37 !important; }</style>
        `;
    }

    let selectedRpe = 0;
    window.setDailyRpe = (n) => {
        selectedRpe = n;
        document.querySelectorAll('.rpe-bolt').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-rpe-${n}`).classList.add('active');
    };

    window.sendDailyReport = async () => {
        if (!selectedRpe) return alert("Оберіть інтенсивність ⚡");
        const btn = document.getElementById('send-report-btn');
        try {
            await db.collection("training_reports").add({
                userId: firebase.auth().currentUser.uid,
                date: new Date().toISOString().split('T')[0],
                rpe: selectedRpe,
                comment: document.getElementById('coach-comment').value,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            btn.style.background = "#2ecc71"; btn.textContent = "✅ ВІДПРАВЛЕНО"; btn.disabled = true;
        } catch (e) { console.error(e); }
    };

    document.addEventListener('DOMContentLoaded', loadPremiumDailyPlan);
})();
