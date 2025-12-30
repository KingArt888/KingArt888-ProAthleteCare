let isLoginMode = false;

function toggleMode() {
    isLoginMode = !isLoginMode;
    const btn = document.getElementById('main-btn');
    const title = document.querySelector('.logo-text');
    const extraFields = ['name', 'age', 'club', 'consent', 'avatar-file'];
    
    if (isLoginMode) {
        btn.innerText = "Увійти";
        title.innerText = "PRO ATLET CARE | ВХІД";
        document.querySelector('.avatar-picker').style.display = 'none';
        document.querySelector('.consent-box').style.display = 'none';
        document.getElementById('name').style.display = 'none';
        document.getElementById('age').style.display = 'none';
        document.getElementById('club').style.display = 'none';
        document.querySelector('.toggle-link').innerHTML = "Немає акаунту? <span>Зареєструватися</span>";
    } else {
        location.reload(); // Найпростіший спосіб повернути стан реєстрації
    }
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('preview').src = e.target.result;
        reader.readAsDataURL(file);
    }
}

async function handleAuth(type) {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('pass').value;
    const btn = document.getElementById('main-btn');

    if (isLoginMode) {
        // ЛОГІКА ВХОДУ
        try {
            await firebase.auth().signInWithEmailAndPassword(email, pass);
            window.location.href = "injury.html";
        } catch (e) { alert("Помилка входу: " + e.message); }
        return;
    }

    // ЛОГІКА РЕЄСТРАЦІЇ
    const name = document.getElementById('name').value;
    const age = document.getElementById('age').value;
    const club = document.getElementById('club').value;
    const consent = document.getElementById('consent').checked;
    const file = document.getElementById('avatar-file').files[0];

    if (!consent) return alert("Потрібна згода на обробку даних!");
    if (!name || !age || !club) return alert("Заповніть всі поля атлета!");

    btn.disabled = true;
    btn.innerText = "Обробка...";

    try {
        // 1. Створюємо юзера
        const res = await firebase.auth().createUserWithEmailAndPassword(email, pass);
        const uid = res.user.uid;

        // 2. Завантажуємо аватарку (якщо є)
        let photoURL = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
        if (file) {
            const storageRef = firebase.storage().ref(`avatars/${uid}`);
            await storageRef.put(file);
            photoURL = await storageRef.getDownloadURL();
        }

        // 3. Зберігаємо профіль у Firestore
        await db.collection('users').doc(uid).set({
            uid: uid,
            name: name,
            age: parseInt(age),
            club: club,
            photoURL: photoURL,
            email: email,
            role: "athlete", // за замовчуванням
            consentDate: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        window.location.href = "injury.html";

    } catch (e) {
        alert(e.message);
        btn.disabled = false;
        btn.innerText = "Створити профіль";
    }
}
