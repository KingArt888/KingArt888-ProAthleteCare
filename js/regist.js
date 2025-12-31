// ==============================================
// regist.js — ProAtletCare (FIXED FOR COMPAT)
// ==============================================

document.addEventListener('DOMContentLoaded', () => {
    const googleAuthBtn = document.getElementById('google-auth-btn');

    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', () => {
            // Створюємо провайдер Google (використовуємо глобальний firebase)
            const provider = new firebase.auth.GoogleAuthProvider();

            // Запускаємо вхід через спливаюче вікно
            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    const user = result.user;
                    console.log("✅ Вхід успішний:", user.displayName);
                    
                    // Після успішного входу перенаправляємо на головну
                    window.location.href = "index.html";
                })
                .catch((error) => {
                    console.error("❌ Помилка входу:", error.message);
                    alert("Помилка при вході через Google: " + error.message);
                });
        });
    }
});
