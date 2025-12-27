// 1. Функція для створення кольорової іконки (SVG)
function getStatusIcon(type, value) {
    if (value === '-' || value === undefined) return '<span style="color: #444;">—</span>';
    
    const val = parseInt(value);
    let color = '#00ff00'; // За замовчуванням зелений

    // Логіка визначення кольору
    if (type === 'sleep' || type === 'ready') {
        if (val >= 8) color = '#00ff00';      // Добре
        else if (val >= 6) color = '#FFC72C'; // Середньо
        else color = '#ff4d4d';               // Погано
    } else {
        if (val <= 3) color = '#00ff00';      // Добре
        else if (val <= 6) color = '#FFC72C'; // Середньо
        else color = '#ff4d4d';               // Погано
    }

    // Набір іконок (SVG), які можна фарбувати
    const icons = {
        sleep: `<svg viewBox="0 0 24 24" width="24" height="24" fill="${color}"><path d="M9.5,2A1.5,1.5 0 0,0 8,3.5V5.5A1.5,1.5 0 0,0 9.5,7H11.5L8,12H13.5V10.5A1.5,1.5 0 0,0 12,9H10.5L14,4H8.5A1.5,1.5 0 0,0 7,5.5V7.5H2V5.5A1.5,1.5 0 0,1 3.5,4H5.5L2,9H7.5V7.5A1.5,1.5 0 0,1 6,6H4.5L8,1H13.5A1.5,1.5 0 0,1 15,2.5V4.5A1.5,1.5 0 0,1 13.5,6H11.5L15,1V1H9.5M17.5,15A1.5,1.5 0 0,0 16,16.5V18.5A1.5,1.5 0 0,0 17.5,20H19.5L16,25H21.5V23.5A1.5,1.5 0 0,0 20,22H18.5L22,17H16.5A1.5,1.5 0 0,0 15,18.5V20.5H10V18.5A1.5,1.5 0 0,1 11.5,17H13.5L10,22H15.5V20.5A1.5,1.5 0 0,1 14,19H12.5L16,14H21.5A1.5,1.5 0 0,1 23,15.5V17.5A1.5,1.5 0 0,1 21.5,19H19.5L23,14V14H17.5Z" /></svg>`,
        stress: `<svg viewBox="0 0 24 24" width="24" height="24" fill="${color}"><path d="M13,3C9.13,3 6,6.13 6,10C6,12.06 6.9,13.91 8.33,15.17C7.5,15.83 7,16.85 7,18V21H17V18C17,16.85 16.5,15.83 15.67,15.17C17.1,13.91 18,12.06 18,10C18,6.13 14.87,3 13,3M13,5A5,5 0 0,1 18,10C18,12.76 15.76,15 13,15A5,5 0 0,1 8,10C8,7.24 10.24,5 13,5M11,18H15V20H11V18Z" /></svg>`,
        soreness: `<svg viewBox="0 0 24 24" width="24" height="24" fill="${color}"><path d="M22,12.5V15.5H18V12.5H22M15,15.5H11V12.5H15V15.5M8,15.5H4V12.5H8V15.5M2,10V20H22V10H2M20,18H4V12H20V18Z" /></svg>`,
        ready: `<svg viewBox="0 0 24 24" width="24" height="24" fill="${color}"><path d="M7,2V13H10V22L17,10H13L17,2H7Z" /></svg>`
    };

    return `<div title="Оцінка: ${val}" style="cursor: help;">${icons[type]}</div>`;
}

// 2. Оновлений рендер у loadGlobalMonitor
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

        // Обробка профілів
        usersSnap.forEach(doc => {
            const data = doc.data();
            if (data.role !== 'admin') {
                athletesMap[doc.id] = {
                    uid: doc.id,
                    name: data.name || "Атлет",
                    photo: data.photoURL || `https://ui-avatars.com/api/?name=${data.name || 'A'}&background=FFC72C&color=000`,
                    club: data.club || "ProAtletCare",
                    activeInjuries: 0,
                    wellness: { sleep: '-', stress: '-', soreness: '-', ready: '-' }
                };
            }
        });

        // Травми
        injuriesSnap.forEach(doc => {
            const data = doc.data();
            if (athletesMap[data.userId] && data.status !== 'closed') {
                athletesMap[data.userId].activeInjuries++;
            }
        });

        // Wellness
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

        let athleteList = Object.values(athletesMap);

        // Тестовий атлет для перевірки всіх кольорів значків
        athleteList.push({
            uid: "test_id",
            name: "Артем (Тест)",
            photo: "https://ui-avatars.com/api/?name=Artem&background=FFC72C&color=000",
            club: "Admin Test",
            activeInjuries: 1,
            wellness: { sleep: 4, stress: 5, soreness: 2, ready: 9 } 
        });

        tbody.innerHTML = athleteList.map(athlete => {
            const isInjured = athlete.activeInjuries > 0;
            const w = athlete.wellness;

            return `
                <tr style="border-bottom: 1px solid #1a1a1a;">
                    <td style="padding: 15px 10px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${athlete.photo}" style="width: 40px; height: 40px; border-radius: 50%; border: 1px solid #FFC72C;">
                            <div>
                                <div style="font-weight: bold; color: #FFC72C; font-size: 0.9em;">${athlete.name}</div>
                                <div style="font-size: 0.7em; color: #888;">${athlete.club}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="font-size: 0.7em; padding: 3px 8px; border-radius: 4px; border: 1px solid ${isInjured ? '#ff4d4d' : '#00ff00'}; color: ${isInjured ? '#ff4d4d' : '#00ff00'};">
                            ${isInjured ? 'RISK' : 'SAFE'}
                        </span>
                    </td>
                    <td style="text-align: center;">${getStatusIcon('sleep', w.sleep)}</td>
                    <td style="text-align: center;">${getStatusIcon('stress', w.stress)}</td>
                    <td style="text-align: center;">${getStatusIcon('soreness', w.soreness)}</td>
                    <td style="text-align: center;">${getStatusIcon('ready', w.ready)}</td>
                    <td style="text-align: right;">
                        <a href="injury.html?userId=${athlete.uid}" style="background: #FFC72C; color: #000; padding: 6px 12px; border-radius: 4px; font-size: 0.75em; font-weight: bold; text-decoration: none; text-transform: uppercase;">Аналіз</a>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Помилка завантаження:", error);
    }
}
