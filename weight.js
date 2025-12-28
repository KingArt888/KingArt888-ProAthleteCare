(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;

    // --- ГРАФІКА ПРО-АТЛЕТА (V-SHAPE) ---
    const BODY_OUTLINE = `
        M100,30 c-7,0 -12,5 -12,12 s5,12 12,12 s12,-5 12,-12 s-5,-12 -12,-12 z 
        M100,58 c-12,0 -30,2 -42,12 c-18,15 -22,35 -22,35 l-8,65 l15,75 l-8,115 l20,90 h22 l10,-85 l10,85 h22 l20,-90 l-8,-115 l15,-75 l-8,-65 c0,0 -4,-20 -22,-35 c-12,-10 -30,-12 -42,-12 z
    `;
    
    const MUSCLE_DETAILS = `
        <path d="M72,108 q28,12 56,0 M75,115 q25,10 50,0" stroke-width="1.5" stroke-opacity="0.6" />
        <path d="M88,148 h24 M89,165 h22 M90,182 h20" stroke-width="1.2" stroke-opacity="0.5" />
        <path d="M98,140 v50" stroke-width="1" stroke-opacity="0.3" />
        <path d="M55,95 q-15,30 -5,75 M145,95 q15,30 5,75" stroke-width="1.8" stroke-opacity="0.4" />
        <path d="M85,290 q15,50 0,90 M115,290 q-15,50 0,90" stroke-width="1.5" stroke-opacity="0.3" />
    `;

    // --- ФУНКЦІЯ АНІМАЦІЇ СКАНУВАННЯ ---
    function startHologramEffect(bmi) {
        const hologramGroup = document.getElementById('body-hologram-img');
        if (!hologramGroup) return;

        // Колір залежно від стану
        const mainColor = (bmi < 18.5 || bmi > 27) ? "#DA3E52" : "#4facfe";
        const glowColor = (bmi < 18.5 || bmi > 27) ? "#ff4d4d" : "#00f2fe";

        hologramGroup.innerHTML = `
            <g id="body-main-paths" style="stroke: ${mainColor}; filter: drop-shadow(0 0 8px ${glowColor});">
                <path d="${BODY_OUTLINE}" fill="none" stroke-width="2.5" />
                ${MUSCLE_DETAILS}
            </g>
            <line id="scan-line-svg" x1="30" y1="50" x2="170" y2="50" stroke="${glowColor}" stroke-width="2" style="filter: blur(1px);">
                <animate attributeName="y1" from="40" to="420" dur="3s" repeatCount="indefinite" />
                <animate attributeName="y2" from="40" to="420" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite" />
            </line>
        `;
    }

    function updateInterface(weight, height, age) {
        if (!weight || !height) return;
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(3, fat).toFixed(1) + "%";

        // Запуск голограми
        startHologramEffect(bmi);

        const dietBox = document.getElementById('diet-plan-content');
        if (bmi < 18.5) {
            dietBox.innerHTML = "<strong>Гіпертрофія:</strong> Потребує набору маси.";
        } else if (bmi < 25) {
            dietBox.innerHTML = "<strong>Атлетизм:</strong> Оптимальна кондиція.";
        } else {
            dietBox.innerHTML = "<strong>Рекомпозиція:</strong> Робота над рельєфом.";
        }
    }

    // Firebase Auth & Data
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            const userDoc = await db.collection(COLL_USERS).doc(currentUserId).get();
            if (userDoc.exists) {
                document.getElementById('user-height').value = userDoc.data().height || 180;
                document.getElementById('user-age').value = userDoc.data().age || 25;
            }
            const snap = await db.collection(COLL_HISTORY)
                .where("userId", "==", currentUserId)
                .orderBy("date", "desc").limit(1).get();
            if (!snap.empty) {
                updateInterface(snap.docs[0].data().weight, 
                                document.getElementById('user-height').value, 
                                document.getElementById('user-age').value);
            }
        }
    });

    document.getElementById('weight-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        await db.collection(COLL_HISTORY).add({ 
            userId: currentUserId, 
            weight: w, 
            date: new Date().toISOString().split('T')[0] 
        });
        await db.collection(COLL_USERS).doc(currentUserId).set({ height: h, age: a }, { merge: true });
        location.reload();
    });
})();
