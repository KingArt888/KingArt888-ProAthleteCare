(function() {
    let weightChart = null;
    let currentUserId = null;

    // 1. ПАРАМЕТРИ URL ТА АВТОРИЗАЦІЯ (Твій блок без змін)
    const urlParams = new URLSearchParams(window.location.search);
    const viewUserId = urlParams.get('userId');

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Якщо є userId в URL - ми в режимі адміна, якщо ні - беремо ID поточного юзера
            currentUserId = viewUserId || user.uid;
            console.log("Працюємо з ID:", currentUserId);
            loadBaseData();
            loadHistory();
        } else {
            // Якщо юзер не залогінений - логінимо анонімно для тестів
            firebase.auth().signInAnonymously().catch(e => console.error("Auth error:", e));
        }
    });

    // 2. ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ
    document.addEventListener('DOMContentLoaded', () => {
        initChart();
        const form = document.getElementById('weight-form');
        if (form) {
            form.addEventListener('submit', handleWeightSubmit);
        }
    });

    // 3. ОБРОБКА ФОРМИ ТА РОЗРАХУНОК СКАНЕРА
    async function handleWeightSubmit(e) {
        e.preventDefault();
        
        const w = parseFloat(document.getElementById('weight-value').value);
        const h = parseFloat(document.getElementById('user-height').value);
        const a = parseInt(document.getElementById('user-age').value);

        if (!w || !h || !a) return;

        // Розрахунки для блоку COMPOSITION SCAN
        const bmi = (w / ((h / 100) ** 2)).toFixed(1);
        // Формула проценту жиру (Deurenberg)
        const fat = ((1.20 * bmi) + (0.23 * a) - 16.2).toFixed(1);

        // Оновлення значень на екрані
        const fatDisplay = document.getElementById('fat-percentage-value');
        const bmiDisplay = document.getElementById('bmi-value');
        
        if (fatDisplay) fatDisplay.textContent = fat + "%";
        if (bmiDisplay) bmiDisplay.textContent = bmi;

        // Збереження даних у Firebase (v8 Syntax)
        try {
            await firebase.firestore().collection('weight_history').add({
                userId: currentUserId,
                weight: w,
                date: new Date().toISOString().split('T')[0],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Оновлюємо базові дані користувача
            await firebase.firestore().collection('users').doc(currentUserId).set({
                height: h,
                age: a
            }, { merge: true });
            
            loadHistory();
        } catch (error) {
            console.error("Помилка збереження:", error);
        }
    }

    // 4. ГРАФІК (Chart.js)
    function initChart() {
        const canvas = document.getElementById('weightChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        weightChart = new Chart(ctx, {
            type: 'line',
            data: { 
                labels: [], 
                datasets: [{ 
                    label: 'Вага (кг)', 
                    data: [], 
                    borderColor: '#FFC72C', 
                    backgroundColor: 'rgba(255,199,44,0.1)',
                    tension: 0.4,
                    fill: true 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: false, grid: { color: '#222' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // 5. ЗАВАНТАЖЕННЯ ДАНИХ
    async function loadBaseData() {
        if (!currentUserId) return;
        const doc = await firebase.firestore().collection('users').doc(currentUserId).get();
        if (doc.exists) {
            const data = doc.data();
            if (document.getElementById('user-height')) document.getElementById('user-height').value = data.height || "";
            if (document.getElementById('user-age')) document.getElementById('user-age').value = data.age || "";
        }
    }

    async function loadHistory() {
        if (!currentUserId || !weightChart) return;
        const snap = await firebase.firestore().collection('weight_history')
            .where('userId', '==', currentUserId)
            .orderBy('date', 'asc').limit(10).get();
        
        if (!snap.empty) {
            const docs = snap.docs.map(d => d.data());
            weightChart.data.labels = docs.map(d => d.date.split('-').reverse().slice(0,2).join('.'));
            weightChart.data.datasets[0].data = docs.map(d => d.weight);
            weightChart.update();
        }
    }
})();
