(function() {
    const COLLECTION_NAME = 'weight_history';
    let currentUserId = null;
    let weightChartInstance = null;

    // 1. Ініціалізація дати (сьогодні)
    const dateInput = document.getElementById('weight-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // 2. Авторизація та завантаження
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            currentUserId = urlParams.get('userId') || user.uid;
            console.log("Weight Control: Працюємо з ID:", currentUserId);
            await syncWeightFromFirebase(currentUserId);
        } else {
            await firebase.auth().signInAnonymously();
        }
    });

    // 3. Синхронізація даних
    async function syncWeightFromFirebase(uid) {
        if (!window.db) return;
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .limit(30) // Останні 30 записів
                .get();

            const labels = [];
            const values = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                // Форматуємо дату для графіка (ММ/ДД)
                const shortDate = data.date.split('-').slice(1).join('/');
                labels.push(shortDate);
                values.push(data.weight);
            });

            updateChart(labels, values);
        } catch (e) {
            console.error("Помилка завантаження ваги:", e);
        }
    }

    // 4. Оновлення графіка
    function updateChart(labels, values) {
        const ctx = document.getElementById('weightChart');
        if (!ctx) return;

        if (weightChartInstance) weightChartInstance.destroy();

        weightChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Вага тіла (кг)',
                    data: values,
                    borderColor: '#6C7A89',
                    backgroundColor: 'rgba(108, 122, 137, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: '#FFC72C'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        ticks: { color: '#888' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: { 
                        ticks: { color: '#888' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } }
                }
            }
        });
    }

    // 5. Обробка форми
    const form = document.getElementById('weight-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submit-btn');
            
            const weightValue = parseFloat(document.getElementById('weight-value').value);
            const selectedDate = document.getElementById('weight-date').value;
            const notes = document.getElementById('weight-notes').value;

            if (!currentUserId || isNaN(weightValue)) return;

            submitBtn.disabled = true;
            submitBtn.textContent = "Збереження...";

            try {
                await db.collection(COLLECTION_NAME).add({
                    userId: currentUserId,
                    weight: weightValue,
                    date: selectedDate,
                    notes: notes,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                alert("Дані ваги збережено!");
                location.reload(); 
            } catch (err) {
                alert("Помилка: " + err.message);
                submitBtn.disabled = false;
                submitBtn.textContent = "Записати вагу";
            }
        });
    }
})();
