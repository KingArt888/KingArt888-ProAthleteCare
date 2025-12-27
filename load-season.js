(function() {
    const COLLECTION_NAME = 'load_season_reports';
    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;

    // --- 1. ІНІЦІАЛІЗАЦІЯ ТА АВТО-ДАТА ---
    document.addEventListener('DOMContentLoaded', () => {
        // Встановлюємо сьогоднішню дату автоматично
        const dateInput = document.getElementById('load-date') || document.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Авторизація та завантаження даних
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                await syncLoadFromFirebase(user.uid);
            } else {
                // Анонімний вхід для виконання правил Firebase (auth != null)
                await firebase.auth().signInAnonymously().catch(console.error);
            }
        });

        const form = document.getElementById('load-form');
        if (form) form.addEventListener('submit', handleFormSubmit);
    });

    // --- 2. ПРЕМІАЛЬНИЙ СПІДОМЕТР (Dashboard Style) ---
    function updateACWRGauge(acwrValue) {
        const needle = document.querySelector('.gauge-needle'); // З вашого CSS
        const display = document.getElementById('acwr-value'); // З вашого CSS
        const gaugeArc = document.querySelector('.gauge-arc');
        const statusBox = document.querySelector('.gauge-status-box');

        if (!needle || !display || !gaugeArc) return;

        // Малюємо цифрову шкалу навколо стрілки
        if (!gaugeArc.querySelector('.gauge-labels-container')) {
            const labelsContainer = document.createElement('div');
            labelsContainer.className = 'gauge-labels-container';
            labelsContainer.style.cssText = 'position:absolute; width:100%; height:100%; top:0; left:0; pointer-events:none;';
            
            const points = [
                { val: 0, lab: '0' },
                { val: 0.8, lab: '0.8' },
                { val: 1.3, lab: '1.3' },
                { val: 2.0, lab: '2.0+' }
            ];

            points.forEach(p => {
                const angle = -180 + (p.val <= 0.8 ? (p.val / 0.8) * 45 : 
                              p.val <= 1.3 ? 45 + ((p.val - 0.8) / 0.5) * 90 : 
                              135 + ((p.val - 1.3) / 0.7) * 45);
                
                const labelWrap = document.createElement('div');
                labelWrap.style.cssText = `position:absolute; bottom:10px; left:50%; width:2px; height:135px; background:rgba(255,255,255,0.2); transform-origin:bottom center; transform:translateX(-50%) rotate(${angle}deg);`;
                
                const labelText = document.createElement('span');
                labelText.innerText = p.lab;
                labelText.style.cssText = `position:absolute; top:-20px; left:50%; transform:translateX(-50%) rotate(${-angle}deg); color:#888; font-size:11px; font-weight:bold;`;
                
                labelWrap.appendChild(labelText);
                labelsContainer.appendChild(labelWrap);
            });
            gaugeArc.appendChild(labelsContainer);
        }

        // Логіка кута: -180 (ліво) до 0 (право) згідно з вашим CSS
        let degree = -180;
        let statusText = '';
        let statusClass = '';

        if (acwrValue < 0.8) {
            degree = -180 + (acwrValue / 0.8) * 45;
            statusText = 'НЕДОТРЕНОВАНІСТЬ';
            statusClass = 'status-warning';
        } else if (acwrValue <= 1.3) {
            degree = -135 + ((acwrValue - 0.8) / 0.5) * 90;
            statusText = 'ОПТИМАЛЬНА ФОРМА';
            statusClass = 'status-safe';
        } else {
            degree = -45 + ((acwrValue - 1.3) / 0.7) * 45;
            statusText = 'РИЗИК ТРАВМИ';
            statusClass = 'status-danger';
        }

        // Обмеження стрілки
        const finalDegree = Math.min(0, Math.max(-180, degree));
        
        // Анімація стрілки та значення
        needle.style.transform = `translateX(-50%) rotate(${finalDegree}deg)`;
        display.textContent = acwrValue.toFixed(2);
        
        // Колір цифри під стрілкою залежно від зони
        display.style.color = (acwrValue > 1.3) ? '#d9534f' : (acwrValue >= 0.8 ? '#5cb85c' : '#f0ad4e');

        if (statusBox) {
            statusBox.innerHTML = `<span class="${statusClass}">${statusText}</span>`;
        }
    }

    // --- 3. ГРАФІКИ (Стиль ProAtletCare) ---
    function renderCharts(acute, chronic) {
        const ctxD = document.getElementById('distanceChart');
        const ctxL = document.getElementById('loadChart');

        if (ctxD) {
            if (distanceChart) distanceChart.destroy();
            distanceChart = new Chart(ctxD, {
                type: 'line',
                data: {
                    labels: dailyLoadData.slice(-7).map(d => d.date.split('-').reverse().slice(0,2).join('.')),
                    datasets: [{
                        label: 'Дистанція (км)',
                        data: dailyLoadData.slice(-7).map(d => d.distance),
                        borderColor: '#FFC72C', // Золото з вашого CSS
                        backgroundColor: 'rgba(255, 199, 44, 0.1)',
                        fill: true, tension: 0.4, borderWidth: 3
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        if (ctxL) {
            if (loadChart) loadChart.destroy();
            loadChart = new Chart(ctxL, {
                type: 'line',
                data: {
                    labels: ['Минулий період', 'Поточний період'],
                    datasets: [
                        { label: 'Acute Load', data: [acute*0.85, acute], borderColor: '#d9534f', borderWidth: 3, tension: 0.3 },
                        { label: 'Chronic Load', data: [chronic*0.95, chronic], borderColor: '#5cb85c', borderWidth: 3, tension: 0.3 }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // --- 4. FIREBASE ТА РОЗРАХУНКИ ---
    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();
            
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            
            if (dailyLoadData.length === 0) dailyLoadData = getDemoData();

            const { acute, chronic, acwr } = calculateMetrics();
            updateACWRGauge(acwr);
            renderCharts(acute, chronic);
        } catch (e) {
            console.error("Синхронізація не вдалася:", e);
        }
    }

    function calculateMetrics() {
        if (dailyLoadData.length === 0) return { acute: 0, chronic: 0, acwr: 0 };
        const sorted = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
        const lastDate = new Date(sorted[sorted.length - 1].date);

        const getAvg = (days) => {
            const start = new Date(lastDate);
            start.setDate(lastDate.getDate() - days);
            const period = sorted.filter(d => new Date(d.date) > start);
            const total = period.reduce((s, d) => s + (d.duration * (d.rpe || 0)), 0);
            return total / days;
        };

        const acute = getAvg(7);
        const chronic = getAvg(28);
        return { acute, chronic, acwr: chronic > 0 ? acute / chronic : 0 };
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        const form = e.target;
        const data = {
            userId: user.uid,
            date: form.elements['date'].value,
            duration: parseInt(form.elements['duration'].value),
            distance: parseFloat(form.elements['distance'].value),
            rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value || 0),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTION_NAME).doc(`${user.uid}_${data.date}`).set(data);
        await syncLoadFromFirebase(user.uid);
    }

    function getDemoData() {
        return [{ date: new Date().toISOString().split('T')[0], duration: 60, rpe: 7, distance: 5 }];
    }
})();
