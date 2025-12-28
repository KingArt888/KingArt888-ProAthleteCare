// daily-individual.js — ProAtletCare (FINAL HARMONIC VERSION)

function getWeekID() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
}

const currentWeekId = getWeekID();
const STAGES = ['Pre-Training', 'Main Training', 'Post-Training'];
const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed/';

async function loadDailyPlan() {
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const currentWeekId = getWeekID();

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return;
        const uid = user.uid;
        const docPath = `${uid}_${currentWeekId}`;

        try {
            const doc = await db.collection('weekly_plans').doc(docPath).get();
            if (!doc.exists) return;

            const fbData = doc.data().planData || {};
            const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;

            // Розрахунок статусу (activity_)
            const mdStatus = calculateFinalStatus(fbData, todayIdx);
            
            if (statusDisplay) {
                statusDisplay.textContent = mdStatus;
                const m = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
                statusDisplay.className = `md-status ${m[mdStatus] || 'color-green'}`;
            }

            const planKey = `status_plan_${mdStatus}`;
            const plan = fbData[planKey];

            if (!plan || !plan.exercises || plan.exercises.length === 0) {
                listContainer.innerHTML = `<p style="text-align:center; padding:30px; color:#777;">На сьогодні вправ немає.</p>`;
            } else {
                renderHarmonicAccordion(plan.exercises, listContainer);
            }
            renderFeedbackForm();
        } catch (e) { console.error(e); }
    });
}

function calculateFinalStatus(data, todayIdx) {
    if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
    if (data[`activity_${todayIdx}`] === 'MATCH') return 'MD';
    let mIndices = [];
    for (let i = 0; i < 7; i++) if (data[`activity_${i}`] === 'MATCH') mIndices.push(i);
    if (mIndices.length === 0) return 'TRAIN';
    let minDiff = Infinity; let best = 'TRAIN';
    mIndices.forEach(mIdx => {
        for (let offset of [-7, 0, 7]) {
            let diff = todayIdx - (mIdx + offset);
            if ((diff === 1 || diff === 2) || (diff >= -4 && diff <= -1)) {
                if (Math.abs(diff) < Math.abs(minDiff)) { minDiff = diff; best = diff > 0 ? `MD+${diff}` : `MD${diff}`; }
            }
        }
    });
    return best;
}

function renderHarmonicAccordion(exercises, container) {
    let html = '';
    STAGES.forEach(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
        if (stageExs.length > 0) {
            html += `
                <div style="margin-bottom:15px;">
                    <div class="stage-header" onclick="toggleStage(this)" style="background:#111; color:#d4af37; padding:12px 15px; border-left:4px solid #444; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-radius:4px;">
                        <span style="font-weight:900; font-size:0.75rem; text-transform:uppercase; letter-spacing:1px;">${stage}</span>
                        <span class="stage-arrow" style="font-size:0.6rem;">▶</span>
                    </div>
                    <div class="stage-content" style="display:none; padding:10px 0;">
                        ${stageExs.map((ex, i) => `
                            <div class="daily-exercise-item" style="background:#0a0a0a; border:1px solid #222; border-radius:10px; padding:15px; margin-bottom:12px; transition:0.3s;">
                                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                                    <h4 style="color:#fff; margin:0; font-size:1rem; flex:1;">${ex.name}</h4>
                                    <div style="display:flex; align-items:center; background:#1a1a1a; padding:5px 10px; border-radius:20px; border:1px solid #333;">
                                        <input type="checkbox" id="check-${stage}-${i}" style="margin-right:8px; cursor:pointer;" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.3 : 1">
                                        <label for="check-${stage}-${i}" style="color:#d4af37; font-size:0.65rem; font-weight:bold; cursor:pointer; text-transform:uppercase;">Done</label>
                                    </div>
                                </div>
                                
                                <div style="display:flex; gap:15px; align-items:center;">
                                    ${ex.videoKey ? `
                                    <div style="width:120px; min-width:120px; aspect-ratio:16/9; border-radius:6px; overflow:hidden; background:#000; border:1px solid #333;">
                                        <iframe src="${YOUTUBE_EMBED_BASE}${ex.videoKey}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe>
                                    </div>` : ''}
                                    
                                    <div style="flex:1;">
                                        <p style="color:#bbb; font-size:0.8rem; margin:0 0 5px 0; line-height:1.3;">${ex.description || 'Опис вправи відсутній.'}</p>
                                        <div style="color:#d4af37; font-weight:bold; font-size:0.85rem;">
                                            ${ex.reps ? `<span>Rep: ${ex.reps}</span>` : ''} 
                                            ${ex.sets ? `<span style="margin-left:10px;">Sets: ${ex.sets}</span>` : ''}
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

function toggleStage(header) {
    const content = header.nextElementSibling;
    const arrow = header.querySelector('.stage-arrow');
    const isOpen = content.style.display === "block";
    content.style.display = isOpen ? "none" : "block";
    arrow.textContent = isOpen ? "▶" : "▼";
    header.style.borderLeftColor = isOpen ? "#444" : "#d4af37";
    header.style.background = isOpen ? "#111" : "#1a1a1a";
}

// Рендер форми звіту (без змін як у файлі daily-individual (5).js)
function renderFeedbackForm() {
    const container = document.getElementById('user-feedback-container');
    if (!container) return;
    container.innerHTML = `
        <div style="background:#0a0a0a; border:1px solid #d4af37; border-radius:12px; padding:20px; margin-top:30px;">
            <h3 style="color:#d4af37; text-align:center; text-transform:uppercase; font-size:0.8rem; letter-spacing:1px;">📊 Аналіз тренування</h3>
            <div style="margin:20px 0; text-align:center;">
                <div style="display:flex; justify-content:center; gap:6px;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<button onclick="window.setDailyRpe(${n})" class="rpe-bolt" id="btn-rpe-${n}" style="background:#1a1a1a; border:none; font-size:18px; color:#333; cursor:pointer; padding:8px; border-radius:6px; transition:0.3s;">⚡</button>`).join('')}
                </div>
            </div>
            <textarea id="coach-comment" style="width:100%; height:60px; background:#111; color:#fff; border:1px solid #333; border-radius:8px; padding:10px; font-size:0.85rem;" placeholder="Твій коментар..."></textarea>
            <button id="send-report-btn" onclick="sendDailyReport()" style="width:100%; padding:14px; background:#d4af37; color:#000; border:none; border-radius:8px; font-weight:900; margin-top:15px; cursor:pointer; text-transform:uppercase; font-size:0.8rem;">Надіслати звіт</button>
        </div>
        <style>.rpe-bolt.active { color:#d4af37 !important; text-shadow:0 0 10px #d4af37; transform:scale(1.2); background:#222 !important; }</style>
    `;
}

let selectedRpe = 0;
window.setDailyRpe = (n) => {
    selectedRpe = n;
    document.querySelectorAll('.rpe-bolt').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-rpe-${n}`).classList.add('active');
};

async function sendDailyReport() {
    if (!selectedRpe) { alert("Будь ласка, обери RPE ⚡"); return; }
    try {
        await db.collection("training_reports").add({
            userId: firebase.auth().currentUser.uid,
            date: new Date().toISOString().split('T')[0],
            rpe: selectedRpe,
            comment: document.getElementById('coach-comment').value,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        const btn = document.getElementById('send-report-btn');
        btn.style.background = "#2ecc71"; btn.textContent = "✅ ВІДПРАВЛЕНО"; btn.disabled = true;
    } catch (e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', loadDailyPlan);
