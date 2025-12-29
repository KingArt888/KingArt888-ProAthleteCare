// admin.js — Оновлений блок завантаження з різними показниками

async function loadAdminDashboard() {
    const names = ["Артем Кулик", "Максим Регбі", "Дмитро Сила", "Іван Бокс", "Олег Швидкість", "Сергій Атлет", "Андрій Крос", "Микола ММА", "Віктор Тренер", "Олександр Р"];
    const demo = {};
    const today = new Date();

    for(let i=1; i<=10; i++) {
        // Генеруємо випадкову історію навантажень для кожного атлета
        const history = [];
        let baseRPE = 4 + Math.random() * 3; // Базове навантаження 4-7
        
        // Створюємо записи за останні 28 днів
        for(let d=28; d>=0; d--) {
            if (d % 2 === 0) { // Тренування через день
                const date = new Date();
                date.setDate(today.getDate() - d);
                
                let currentRPE = baseRPE;
                // Робимо аномалії для різноманітності спідометрів
                if (i === 3 && d < 7) currentRPE += 4; // Атлет №3 перевантажений (червоний)
                if (i === 7) currentRPE -= 3;          // Атлет №7 недотренований (сірий)
                if (i === 1) currentRPE = baseRPE;     // Атлет №1 ідеальний (зелений)

                history.push({
                    date: date.toISOString().split('T')[0],
                    duration: 60 + (Math.random() * 30),
                    rpe: Math.min(Math.max(Math.round(currentRPE), 1), 10)
                });
            }
        }

        demo[`d${i}`] = {
            uid: `d${i}`, 
            name: names[i-1], 
            club: i % 2 == 0 ? "ProAtletCare" : "Paphos FC",
            photo: `https://i.pravatar.cc/150?u=${i+40}`,
            injuryStatus: i == 3 ? {label:'ТРАВМА', color:'#ff4d4d'} : (i == 2 ? {label:'УВАГА', color:'#FFC72C'} : {label:'ЗДОРОВИЙ', color:'#00ff00'}),
            wellness: { 
                sleep: 6 + Math.floor(Math.random() * 4), 
                stress: Math.floor(Math.random() * 5), 
                soreness: Math.floor(Math.random() * 6), 
                ready: 5 + Math.floor(Math.random() * 5) 
            },
            demoLoad: history
        };
    }

    renderAdminTable(demo);

    // Спроба підвантажити реальних користувачів
    try {
        const usersSnap = await db.collection(USERS_COL).get();
        const real = {};
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            if (data.role === 'admin') continue;
            real[doc.id] = {
                uid: doc.id,
                name: data.name || "Атлет",
                photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                club: data.club || "Клуб",
                wellness: data.lastWellness || { sleep: '-', stress: '-', soreness: '-', ready: '-' }
            };
        }
        if (Object.keys(real).length > 0) {
            renderAdminTable({...demo, ...real});
        }
    } catch (e) { console.warn("Firebase data empty or error:", e); }
}

// Залишаємо решту функцій (createMiniGauge, getStatusEmoji, renderAdminTable) без змін
