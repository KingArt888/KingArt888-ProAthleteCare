// daily-individual.js — ПОВНИЙ ФІНАЛЬНИЙ КОД (SYNKED & STYLED)

// 1. ІДЕНТИФІКАЦІЯ ТИЖНЯ (Точно як у твоєму Weekly)
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

// 2. ЗАВАНТАЖЕННЯ ТА ЛОГІКА
async function loadDailyPlan() {
    const listContainer = document.getElementById('daily-exercise-list');
    const statusDisplay = document.getElementById('md-status-display');
    const recContainer = document.getElementById('md-recommendations');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return;
        const uid = user.uid;
        const docPath = `${uid}_${currentWeekId}`;
        
        console.log("Шукаємо план за шляхом:", docPath);

        try {
            const doc = await db.collection('weekly_plans').doc(docPath).get();
            
            if (!doc.exists) {
                if (listContainer) listContainer.innerHTML = '<p style="text-align:center; color:#555; padding:30px;">План тренером ще не опублікований.</p>';
                return;
            }

            const fbData = doc.data().planData || {};
            console.log("Дані отримано (activity keys):", fbData); //

            // Визначаємо сьогоднішній день (0-Пн, 6-Нд)
            const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;

            // РОЗРАХУНОК СТАТУСУ (через activity_ як у твоїй базі)
            const mdStatus = calculateFinalStatus(fbData, todayIdx);
            
            if (statusDisplay) {
                statusDisplay.textContent = mdStatus;
                statusDisplay.className = `md-status ${getStatusColorClass(mdStatus)}`;
            }

            // Порада тренера (якщо є)
            if (recContainer && typeof MD_RECOMMENDATIONS !== 'undefined') {
                const advice = MD_RECOMMENDATIONS[mdStatus] || "Працюй згідно з планом.";
                recContainer.innerHTML = `<div style="border-left:4px solid #d4af37; padding:12px; background:#111; margin-bottom:20px;"><p style="margin:0; color:#eee; font-size:0.9rem;"><strong style="color:#d4af37; font-size:0.7rem;">ПОРАДА:</strong><br>${advice}</p></div>`;
            }

            // РЕНДЕР ВПРАВ (Ключ: status_plan_MD-1 і т.д.)
            const planKey = `status_plan_${mdStatus}`;
            const plan = fbData[planKey];

            if (!plan || !plan.exercises || plan.exercises.length === 0) {
                listContainer.innerHTML = `<p style="text-align:center; padding:30px; color:#777;">На сьогодні (${mdStatus}) вправи не заплановані.</p>`;
            } else {
                renderExercisesAccordion(plan.exercises, listContainer);
            }

            renderFeedbackForm(); // Малюємо форму звіту

        } catch (e) {
            console.error("Load Error:", e);
        }
    });
}

// 3. ЛОГІКА MDX (Синхронно з базою)
function calculateFinalStatus(data, todayIdx) {
    if (data[`activity_${todayIdx}`] === 'REST') return 'REST';
    if (data[`activity_${todayIdx}`] === 'MATCH') return 'MD';
    
    let matchIndices = [];
    for (let i = 0; i < 7; i++) {
        if (data[`activity_${i}`] === 'MATCH') matchIndices.push(i);
    }
    
    if (matchIndices.length === 0) return 'TRAIN';
    
    let minDiff = Infinity;
    let bestStatus = 'TRAIN';

    matchIndices.forEach(mIdx => {
        for (let offset of [-7, 0, 7]) {
            let diff = todayIdx - (mIdx + offset);
            if ((diff === 1 || diff === 2) || (diff >= -4 && diff <= -1)) {
                if (Math.abs(diff) < Math.abs(minDiff)) {
                    minDiff = diff;
                    bestStatus = diff > 0 ? `MD+${diff}` : `MD${diff}`;
                }
            }
        }
    });
    return bestStatus;
}

// 4. СТИЛІ ТА ВІЗУАЛ (Акордеон)
function renderExercisesAccordion(exercises, container) {
    let html = '';
    STAGES.forEach(stage => {
        const stageExs = exercises.filter(ex => ex.stage === stage);
        if (stageExs.length > 0) {
            html += `
                <div style="margin-bottom:12px;">
                    <div class="stage-header" onclick="toggleStage(this)" style="background:#1a1a1a; color:#d4af37; padding:15px; border-left:4px solid #444; cursor:pointer; display:flex; justify-content:space-between; font-weight:bold; font-size:0.85rem;">
                        <span>${stage}</span><span class="stage-arrow">▶</span>
                    </div>
                    <div class="stage-content" style="display:none; padding-top:10px;">
                        ${stageExs.map((ex, i) => `
                            <div class="daily-exercise-item" style="border:1px solid #222; margin-bottom:15px; padding:15px; background:#0a0a0a; border-radius:8px;">
                                <h4 style="color:#fff; margin:0 0 10px 0;">${ex.name}</h4>
                                ${ex.videoKey ? `<iframe src="${YOUTUBE_EMBED_BASE}${ex.videoKey}" style="width:100%; aspect-ratio:16/9; border:0; border-radius:6px;"></iframe>` : ''}
                                <div style="margin-top:12px; background:#1a1a1a; padding:10px; border-radius:5px; display:flex; align-items:center; gap:12px;">
                                    <input type="checkbox" style="width:18px; height:18px;" onchange="this.closest('.daily-exercise-item').style.opacity = this.checked ? 0.4 : 1">
                                    <label style="color:#eee; font-size:0.9rem;">Виконано</label>
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
}

// 5. ФОРМА ЗВІТУ (RPE ⚡)
function renderFeedbackForm() {
    const container = document.getElementById('user-feedback-container');
    if (!container) return;
    container.innerHTML = `
        <div style="background:#0a0a0a; border:1px solid #d4af37; border-radius:12px; padding:20px; margin-top:40px;">
            <h3 style="color:#d4af37; text-align:center; text-transform:uppercase; font-size:0.9rem;">📊 Аналіз тренування</h3>
            <div style="margin:20px 0; text-align:center;">
                <label style="color:#888; display:block; margin-bottom:10px; font-size:0.7rem;">НАВАНТАЖЕННЯ RPE ⚡:</label>
                <div style="display:flex; justify-content:center; gap:8px;">
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<button onclick="window.setDailyRpe(${n})" class="rpe-bolt" id="btn-rpe-${n}" style="background:#222; border:none; font-size:20px; color:#333; cursor:pointer; padding:5px; border-radius:4px;">⚡</button>`).join('')}
                </div>
            </div>
            <textarea id="coach-comment" style="width:100%; height:60px; background:#111; color:#fff; border:1px solid #333; border-radius:8px; padding:10px;" placeholder="Коментар..."></textarea>
            <button id="send-report-btn" onclick="sendDailyReport()" style="width:100%; padding:15px; background:#d4af37; color:#000; border:none; border-radius:8px; font-weight:bold; margin-top:15px; cursor:pointer;">НАДІСЛАТИ ЗВІТ</button>
        </div>
        <style>.rpe-bolt.active { color: #d4af37 !important; text-shadow: 0 0 10px #d4af37; transform: scale(1.2); }</style>
    `;
}

let selectedRpe = 0;
window.setDailyRpe = (n) => {
    selectedRpe = n;
    document.querySelectorAll('.rpe-bolt').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-rpe-${n}`).classList.add('active');
};

async function sendDailyReport() {
    if (!selectedRpe) { alert("Обери RPE!"); return; }
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
    } catch (e) { alert("Помилка відправки"); }
}

function getStatusColorClass(s) {
    const m = { 'MD': 'color-red', 'REST': 'color-neutral', 'TRAIN': 'color-dark-grey' };
    return m[s] || 'color-green';
}

document.addEventListener('DOMContentLoaded', loadDailyPlan);
