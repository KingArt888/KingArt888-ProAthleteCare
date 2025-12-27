const USERS_COL = 'users';
const INJURIES_COL = 'injuries';
const WELLNESS_COL = 'wellness_reports';

// 1. Функція для кольорових тематичних іконок
function getStatusEmoji(type, value) {
    if (value === '-' || value === undefined) return '<span style="opacity: 0.2;">➖</span>';
    const val = parseInt(value);
    let color = '#00ff00'; // Зелений
    let emoji = '';

    if (type === 'sleep') emoji = '💤';
    if (type === 'stress') emoji = '🧠';
    if (type === 'soreness') emoji = '💪';
    if (type === 'ready') emoji = '⚡';

    // Логіка кольорів: Зелений (добре), Жовтий (середньо), Червоний (погано)
    if (type === 'sleep' || type === 'ready') {
        if (val >= 8) color = '#00ff00';
        else if (val >= 6) color = '#FFC72C';
        else color = '#ff4d4d';
    } else {
        // Для стресу та болю навпаки
        if (val <= 3) color = '#00ff00';
        else if (val <= 6) color = '#FFC72C';
        else color = '#ff4d4d';
    }

    return `
        <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; 
                    width: 40px; height: 40px; border-radius: 8px; background: ${color}15; border: 1px solid ${color}44;">
            <span style="font-size: 1.4em; filter: drop-shadow(0 0 2px ${color});">${emoji}</span>
        </div>`;
}

async function loadGlobalMonitor() {
    const tbody = document.getElementById('athletes-tbody');
    if (!tbody) return;

    try {
        const [usersSnap, injuriesSnap, wellnessSnap] = await Promise.all([
            db.collection(USERS_COL).get(),
            db.collection(INJURIES_COL).get(),
            db.collection(WELLNESS_COL).orderBy('timestamp', 'desc').get()
        ]);

        const athletesMap = {};

        // Крок 1: Завантаження реальних користувачів
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.role !== 'admin') {
                athletesMap[doc.id] = {
                    uid: doc.id,
                    name: data.name || "Атлет",
                    photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                    club: data.club || "ProAtletCare",
                    injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 },
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });

        // Крок 2: Аналіз динаміки травм
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (athletesMap[uid] && data.status !== 'closed') {
                const history = data.painHistory || data.history || [];
                if (history.length > 0) {
                    const lastPain = parseInt(history[history.length - 1].pain) || 0;
                    
                    if (lastPain === 0) {
                        athletesMap[uid].injuryStatus = { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 };
                    } else {
                        let trend = 'СТАБІЛЬНО';
                        let trendColor = '#FFC72C';

                        if (history.length > 1) {
                            const prevPain = parseInt(history[history.length - 2].pain) || 0;
                            if (lastPain < prevPain) {
                                trend = 'ПОКРАЩЕННЯ 📈';
                                trendColor = '#00ff00';
                            } else if (lastPain > prevPain) {
                                trend = 'ПОГІРШЕННЯ 📉';
                                trendColor = '#ff4d4d';
                            }
                        } else {
                            trend = 'НОВА ТРАВМА';
                            trendColor = '#ff4d4d';
                        }
                        athletesMap[uid].injuryStatus = { label: trend, color: trendColor, pain: lastPain };
                    }
                }
            }
        });

        // Крок 3: Заповнення Wellness
        wellnessSnap.forEach(doc => {
            const data = doc.data();
            const uid = data.userId;
            if (athletesMap[uid] && athletesMap[uid].wellness.sleep === '-') {
                athletesMap[uid].wellness = {
                    sleep: data.scores?.sleep,
                    stress: data.scores?.stress,
                    soreness: data.scores?.soreness,
                    ready: data.scores?.ready
                };
            }
        });

        // Крок 4: Створення списку (ReferenceError FIX)
        let athleteList = Object.values(athletesMap);

        // Крок 5: Додавання 5 тимчасових користувачів для тесту
        const temporaryAthletes = [
            {
                uid: "t1", name: "Олександр (Відновлення)", club: "Rugby Club",
                photo: "https://ui-avatars.com/api/?name=O&background=00ff00&color=000",
                injuryStatus: { label: 'ПОКРАЩЕННЯ 📈', color: '#00ff00', pain: 2 },
                wellness: { sleep: 9, stress: 2, soreness: 3, ready: 8 }
            },
            {
                uid: "t2", name: "Дмитро (Травма)", club: "FC Shakhtar",
                photo: "https://ui-avatars.com/api/?name=D&background=ff4d4d&color=000",
                injuryStatus: { label: 'ПОГІРШЕННЯ 📉', color: '#ff4d4d', pain: 7 },
                wellness: { sleep: 5, stress: 8, soreness: 9, ready: 3 }
            },
            {
                uid: "t3", name: "Максим (Стабільно)", club: "Paphos FC",
                photo: "https://ui-avatars.com/api/?name=M&background=FFC72C&color=000",
                injuryStatus: { label: 'СТАБІЛЬНО ⚠️', color: '#FFC72C', pain: 4 },
                wellness: { sleep: 7, stress: 5, soreness: 5, ready: 6 }
            },
            {
                uid: "t4", name: "Іван (Здоровий)", club: "Fit/Box EMS",
                photo: "https://ui-avatars.com/api/?name=I&background=00ff00&color=000",
                injuryStatus: { label: 'ЗДОРОВИЙ', color: '#00ff00', pain: 0 },
                wellness: { sleep: 10, stress: 1, soreness: 1, ready: 10 }
            },
            {
                uid: "t5", name: "Сергій (Новий)", club: "Office Fitness",
                photo: "https://ui-avatars.com/api/?name=S&background=ff4d4d&color=000",
                injuryStatus: { label: 'НОВА ТРАВМА', color: '#ff4d4d', pain: 6 },
                wellness: { sleep: 6, stress: 6, soreness: 7, ready: 5 }
            }
        ];

        athleteList = [...athleteList, ...temporaryAthletes];

        // Крок 6: Рендер таблиці
        tbody.innerHTML = athleteList.map(athlete => {
            const stat = athlete.injuryStatus;
            const w = athlete.wellness;

            return `
                <tr style="border-bottom: 1px solid #222;">
                    <td style="padding: 15px 10px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${athlete.photo}" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #FFC72C; object-fit: cover;">
                            <div>
                                <div style="font-weight: bold; color: #FFC72C; font-size: 0.95em;">${athlete.name}</div>
                                <div style="font-size: 0.75em; color: #888;">${athlete.club}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-size: 0.75em; padding: 6px; border-radius: 6px; text-align: center;
                            background: ${stat.color}15; color: ${stat.color}; border: 1px solid ${stat.color}44;">
                            <div style="font-weight: bold; text-transform: uppercase;">${stat.label}</div>
                            ${stat.pain > 0 ? `<div style="margin-top:2px;">Рівень: ${stat.pain}</div>` : ''}
                        </div>
                    </td>
                    <td style="text-align: center;">${getStatusEmoji('sleep', w.sleep)}</td>
                    <td style="text-align: center;">${getStatusEmoji('stress', w.stress)}</td>
                    <td style="text-align: center;">${getStatusEmoji('soreness', w.soreness)}</td>
                    <td style="text-align: center;">${getStatusEmoji('ready', w.ready)}</td>
                    <td style="text-align: right; padding-right: 15px;">
                        <a href="injury.html?userId=${athlete.uid}" style="display: inline-block; background: #FFC72C; color: #000; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 0.8em; text-decoration: none; text-transform: uppercase;">Аналіз</a>
                    </td>
                </tr>`;
        }).join('');

    } catch (error) {
        console.error("Критична помилка завантаження:", error);
    }
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) loadGlobalMonitor();
    else window.location.href = "auth.html";
});
