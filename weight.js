(function() {
    const COLL_HISTORY = 'weight_history';
    const COLL_USERS = 'users';
    let currentUserId = null;
    let weightChartInstance = null;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            await loadUserProfile();
            await checkDailyEntry();
            await initWeightChart();
        } else {
            window.location.href = 'login.html';
        }
    });

    function updateInterface(weight, height, age) {
        if (!weight || !height) return;

        const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
        document.getElementById('bmi-value').textContent = bmi;

        let fat = (1.20 * bmi) + (0.23 * (age || 25)) - 16.2;
        document.getElementById('fat-percentage-value').textContent = Math.max(3, fat).toFixed(1) + "%";

        // КЕРУВАННЯ ГОЛОГРАМОЮ
        const hologram = document.getElementById('body-hologram-img');
        if (hologram) {
            if (bmi < 17 || bmi > 30) {
                hologram.style.stroke = "#DA3E52"; // Червоний
                hologram.style.filter = "drop-shadow(0 0 15px #DA3E52)";
            } else if (bmi >= 25 && bmi <= 30) {
                hologram.style.stroke = "#FFA500"; // Помаранчевий
                hologram.style.filter = "drop-shadow(0 0 10px #FFA500)";
            } else {
                hologram.style.stroke = "#FFC72C"; // Золотий
                hologram.style.filter = "url(#neon-glow)";
            }
        }

        // ОНОВЛЕННЯ ДІЄТИ
        const dietBox = document.getElementById('diet-plan-content');
        const statusText = document.getElementById('bmi-status-text');
        
        if (bmi < 18.5) {
            statusText.textContent = "(Дефіцит)";
            dietBox.innerHTML = `<strong>План: Гіпертрофія</strong><ul class="diet-list"><li>Калорії: +20%</li><li>Білок: 2.2г/кг</li></ul>`;
        } else if (bmi < 25) {
            statusText.textContent = "(Норма)";
            dietBox.innerHTML = `<strong>План: Атлетизм</strong><ul class="diet-list"><li>Підтримка ваги</li><li>Баланс БЖВ</li></ul>`;
        } else {
            statusText.textContent = "(Надмірна вага)";
            dietBox.innerHTML = `<strong>План: Рекомпозиція</strong><ul class="diet-list"><li>Дефіцит: -500 ккал</li><li>Кардіо: 40 хв</li></ul>`;
        }
    }

    // Додайте сюди ваші стандартні функції loadUserProfile, checkDailyEntry, initWeightChart та обробник форми submit
    // (Які ви скидали раніше, вони не змінюються)
})();
