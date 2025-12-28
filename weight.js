(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    // Шляхи атлета
    const BODY_OUTLINE = "M100,35 c-6.5,0 -11.8,5.3 -11.8,11.8 s5.3,11.8 11.8,11.8 s11.8,-5.3 11.8,-11.8 s-5.3,-11.8 -11.8,-11.8 z M88,65 c-15,2 -25,12 -30,28 c-3,10 -1,45 -1,45 l8,65 l5,85 l-12,110 l18,85 h24 l6,-80 l6,80 h24 l18,-85 l-12,-110 l5,-85 l8,-65 c0,0 2,-35 -1,-45 c-5,-16 -15,-26 -30,-28 z";
    const MUSCLE_DETAILS = `
        <path d="M80,110 q20,8 40,0" stroke-width="1.5" stroke-opacity="0.6" />
        <path d="M90,145 h20 M91,165 h18 M92,185 h16" stroke-width="1.2" stroke-opacity="0.4" />
        <path d="M68,100 l-15,60 M132,100 l15,60" stroke-width="1.2" stroke-opacity="0.3" />
        <path d="M88,270 l-5,60 M112,270 l5,60" stroke-width="1.2" stroke-opacity="0.3" />
    `;

    async function loadUserProfile() {
        try {
            const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.height) document.getElementById('user-height').value = data.height;
                if (data.age) document.getElementById('user-age').value = data.age;
            }
        } catch (e) { console.error("Error profile:", e); }
    }

    function updateInterface(weight, height, age) {
        if (!weight || !height) return;
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(3, fat).toFixed(1) + "%";

        const hologramGroup = document.getElementById('body-hologram-img');
        if (hologramGroup) {
            hologramGroup.innerHTML = `<path d="${BODY_OUTLINE}" fill="none" stroke-width="2.5" />${MUSCLE_DETAILS}`;
            
            // Кольорова індикація
            if (bmi < 18.5 || bmi > 28) {
                hologramGroup.style.stroke = "#DA3E52";
                hologramGroup.style.filter = "drop-shadow(0 0 15px #DA3E52)";
            } else if (bmi >= 25 && bmi <= 28) {
                hologramGroup.style.stroke = "#FFA500";
            } else {
                hologramGroup.style.stroke = "#FFC72C";
                hologramGroup.style.filter = "url(#neon-glow)";
            }
        }

        const dietBox = document.getElementById('diet-plan-content');
        const statusText = document.getElementById('bmi-status-text');
        if (bmi < 18.5) {
            statusText.textContent = "(Дефіцит)";
            dietBox.innerHTML = `<strong>Гіпертрофія</strong><ul class="diet-list"><li>+20% калорій</li><li>2.2г білка/кг</li></ul>`;
        } else if (bmi < 25) {
            statusText.textContent = "(Норма)";
            dietBox.innerHTML = `<strong>Атлетизм</strong><ul class="diet-list"><li>Підтримка</li><li>Баланс БЖВ</li></ul>`;
        } else {
            statusText.textContent = "(Зайва вага)";
            dietBox.innerHTML = `<strong>Рекомпозиція</strong><ul class="diet-list"><li>-500 ккал</li><li>Збільшити NEAT</li></ul>`;
        }
    }

    async function checkDailyEntry() {
        const snap = await db.collection(COLL_HISTORY).where("userId", "==", currentUserId).orderBy("date", "desc").limit(1).get();
        if (!snap.empty) {
            const last = snap.docs[0].data();
            updateInterface(last.weight, document.getElementById('user-height').value || 180, document.getElementById('user-age').value || 25);
        }
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await loadUserProfile();
            await checkDailyEntry();
            // Тут виклик графіка...
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
