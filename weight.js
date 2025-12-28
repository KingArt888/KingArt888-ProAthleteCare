(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;

    // --- ГРАФІКА СПРАВЖНЬОГО АТЛЕТА (V-SHAPE) ---
    // Робимо плечі значно ширшими, а талію вузькою
    const BODY_OUTLINE = `
        M100,35 c-6,0 -11,5 -11,11 s5,11 11,11 s11,-5 11,-11 s-5,-11 -11,-11 z 
        M100,60 c-15,0 -35,2 -48,15 c-15,15 -18,35 -18,35 l-10,65 l18,75 l-12,115 l25,90 h25 l12,-85 l12,85 h25 l25,-90 l-12,-115 l18,-75 l-10,-65 c0,0 -3,-20 -18,-35 c-13,-13 -33,-15 -48,-15 z
    `;
    
    // М'язовий рельєф: дельти, груди, прес 
    const MUSCLE_DETAILS = `
        <path d="M68,110 q32,15 64,0 M72,118 q28,10 56,0" stroke-width="1.8" stroke-opacity="0.6" /> <path d="M88,155 h24 M89,175 h22 M90,195 h20" stroke-width="1.5" stroke-opacity="0.5" /> <path d="M50,105 q-18,40 -8,80 M150,105 q18,40 8,80" stroke-width="2" stroke-opacity="0.4" /> <path d="M85,300 q15,50 0,95 M115,300 q-15,50 0,95" stroke-width="1.5" stroke-opacity="0.3" /> `;

    // --- ЕФЕКТ СКАНУВАННЯ ---
    function startHologramEffect(bmi) {
        const hologramGroup = document.getElementById('body-hologram-img');
        if (!hologramGroup) return;

        const mainColor = (bmi < 18.5 || bmi > 27) ? "#DA3E52" : "#4facfe"; // Червоний або Блакитний
        const glowColor = (bmi < 18.5 || bmi > 27) ? "#ff4d4d" : "#00f2fe";

        hologramGroup.innerHTML = `
            <g style="stroke: ${mainColor}; filter: drop-shadow(0 0 10px ${glowColor});">
                <path d="${BODY_OUTLINE}" fill="none" stroke-width="2.8" stroke-linejoin="round" />
                ${MUSCLE_DETAILS}
            </g>
            <line x1="30" y1="50" x2="170" y2="50" stroke="${glowColor}" stroke-width="2.5" style="filter: blur(1.5px);">
                <animate attributeName="y1" from="45" to="415" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="y2" from="45" to="415" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" />
            </line>
        `;
    }

    function updateInterface(weight, height, age) {
        if (!weight || !height) return;
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(3, fat).toFixed(1) + "%";

        startHologramEffect(bmi);

        const dietBox = document.getElementById('diet-plan-content');
        if (bmi < 18.5) {
            dietBox.innerHTML = "<strong>Гіпертрофія:</strong> +500 ккал, фокус на профіцит.";
        } else if (bmi < 25) {
            dietBox.innerHTML = "<strong>Атлетизм:</strong> Оптимальна форма збережена.";
        } else {
            dietBox.innerHTML = "<strong>Рекомпозиція:</strong> Дефіцит калорій + силові.";
        }
    }

    // Решта стандартної логіки Firebase
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
            if (doc.exists) {
                document.getElementById('user-height').value = doc.data().height || 180;
                document.getElementById('user-age').value = doc.data().age || 25;
            }
            const snap = await db.collection(COLL_HISTORY).where("userId", "==", currentUserId).orderBy("date", "desc").limit(1).get();
            if (!snap.empty) updateInterface(snap.docs[0].data().weight, document.getElementById('user-height').value, document.getElementById('user-age').value);
        }
    });

    document.getElementById('weight-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        await db.collection(COLL_HISTORY).add({ userId: currentUserId, weight: w, date: new Date().toISOString().split('T')[0] });
        await db.collection(COLL_USERS).doc(currentUserId).set({ height: h, age: a }, { merge: true });
        location.reload();
    });
})();
