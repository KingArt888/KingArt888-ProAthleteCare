(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    // --- ГРАФІКА АТЛЕТА ---
    // Складний шлях: широкі плечі (дельти), вузька талія, атлетичні ноги
    const BODY_OUTLINE = `
        M100,30 c-7,0 -12,5 -12,12 s5,12 12,12 s12,-5 12,-12 s-5,-12 -12,-12 z 
        M82,58 c-18,2 -35,15 -38,35 c-2,12 3,45 3,45 l7,65 l5,85 l-15,125 l20,95 h22 l10,-85 l10,85 h22 l20,-95 l-15,-125 l5,-85 l7,-65 c0,0 5,-33 3,-45 c-3,-20 -20,-33 -38,-35 z
    `;
    
    // Деталізація м'язів: груди, прес, лінії рук та ніг
    const MUSCLE_DETAILS = `
        <path d="M72,105 q28,15 56,0" stroke-width="1.8" stroke-opacity="0.7" /> <path d="M86,145 h28 M87,165 h26 M88,185 h24" stroke-width="1.3" stroke-opacity="0.5" /> <path d="M58,95 l-28,75 l12,65 M142,95 l28,75 l-12,65" stroke-width="1.5" stroke-opacity="0.4" /> <path d="M82,290 l-8,80 M118,290 l8,80" stroke-width="1.3" stroke-opacity="0.3" /> `;

    // --- ФУНКЦІЇ ---
    async function loadUserProfile() {
        try {
            const doc = await db.collection(COLL_USERS).doc(currentUserId).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.height) document.getElementById('user-height').value = data.height;
                if (data.age) document.getElementById('user-age').value = data.age;
            }
        } catch (e) { console.error("Помилка профілю:", e); }
    }

    function updateInterface(weight, height, age) {
        if (!weight || !height) return;
        
        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        // Розрахунок жиру (формула Deurenberg)
        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(3, fat).toFixed(1) + "%";

        const hologramGroup = document.getElementById('body-hologram-img');
        if (hologramGroup) {
            hologramGroup.innerHTML = `<path d="${BODY_OUTLINE}" fill="none" stroke-width="2.5" />${MUSCLE_DETAILS}`;
            
            // Динамічна зміна кольору сканера
            if (bmi < 18.5 || bmi > 27.5) {
                hologramGroup.style.stroke = "#DA3E52"; // Критичний стан (червоний)
                hologramGroup.style.filter = "drop-shadow(0 0 15px #DA3E52)";
            } else if (bmi >= 24.5 && bmi <= 27.5) {
                hologramGroup.style.stroke = "#FFA500"; // Увага (помаранчевий)
            } else {
                hologramGroup.style.stroke = "#FFC72C"; // Атлетична норма (золотий)
                hologramGroup.style.filter = "url(#neon-glow)";
            }
        }

        const dietBox = document.getElementById('diet-plan-content');
        const statusText = document.getElementById('bmi-status-text');
        
        if (bmi < 18.5) {
            statusText.textContent = "(Дефіцит)";
            dietBox.innerHTML = "<strong>План:</strong> Профіцит калорій + силові тренування.";
        } else if (bmi < 25) {
            statusText.textContent = "(Норма)";
            dietBox.innerHTML = "<strong>План:</strong> Підтримка форми та розвиток витривалості.";
        } else {
            statusText.textContent = "(Зайва вага)";
            dietBox.innerHTML = "<strong>План:</strong> Невеликий дефіцит + інтенсивне кардіо.";
        }
    }

    async function checkDailyEntry() {
        const snap = await db.collection(COLL_HISTORY)
            .where("userId", "==", currentUserId)
            .orderBy("date", "desc").limit(1).get();
        if (!snap.empty) {
            const last = snap.docs[0].data();
            updateInterface(
                last.weight, 
                document.getElementById('user-height').value || 180, 
                document.getElementById('user-age').value || 25
            );
        }
    }

    // Ініціалізація Firebase Auth
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await loadUserProfile();
            await checkDailyEntry();
        }
    });

    // Обробка форми
    document.getElementById('weight-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);
        
        await db.collection(COLL_HISTORY).add({ 
            userId: currentUserId, 
            weight: w, 
            date: new Date().toISOString().split('T')[0],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await db.collection(COLL_USERS).doc(currentUserId).set({ height: h, age: a }, { merge: true });
        location.reload();
    });
})();
