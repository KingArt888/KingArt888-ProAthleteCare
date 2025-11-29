/* --- СТИЛІ ДЛЯ СТОРІНКИ LOAD SEASON (УНІКАЛЬНІ + КОМПОНЕНТИ) --- */

/* ============================================== */
/* 1. СТИЛІ МАКЕТА ТА КАРТОК */
/* ============================================== */

/* Контейнер для форми та графіків */
.dashboard-container {
    display: flex;
    gap: 30px;
    margin-top: 20px;
    flex-wrap: wrap;
    align-items: flex-start; /* Вирівнюємо елементи зверху вниз */
}

/* Область для графіків */
.visualization-area {
    display: flex;
    flex-direction: column; /* Графіки розташовані один під одним */
    gap: 20px;
    flex-grow: 1;
    min-width: 400px;
}

/* Картки для відображення */
.card {
    background-color: #0d0d0d;
    border: 1px solid #1a1a1a;
    border-radius: 10px;
    padding: 25px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.chart-card {
    height: 350px; /* Фіксована висота для гармонії графіків */
    padding: 15px;
}

/* Заголовки всередині карток */
.form-card h3, .card h3 {
    color: #FFC72C;
    margin-top: 0;
    border-bottom: 1px solid #333333;
    padding-bottom: 10px;
    margin-bottom: 20px;
}

/* Стилі для полів вводу (перекриваємо загальні стилі, якщо потрібно) */
.form-card input[type="date"],
.form-card input[type="number"] {
    margin-bottom: 15px;
    background-color: #1a1a1a;
    border: 1px solid #333;
    color: #CCCCCC;
}

/* Стилі для кнопки Зберегти */
.gold-button {
    background-color: #50C878; /* Зелений для збереження */
    color: #000000;
    border: none;
    padding: 12px 25px;
    border-radius: 5px;
    margin-top: 30px;
    cursor: pointer;
    font-size: 1.1em;
    font-weight: bold;
    transition: background-color 0.3s;
}
.gold-button:hover {
    background-color: #4CAF50;
}

/* Стилі для placeholder-тексту, коли даних недостатньо */
.placeholder-text {
    color: #888888;
    font-style: italic;
    font-size: 1.2em;
    text-align: center;
    padding: 20px;
}

/* ============================================== */
/* 2. УНІКАЛЬНІ СТИЛІ RPE (Rating Group) */
/* ============================================== */

/* Загальний стиль для рейтингів RPE */
.rating-group {
    display: flex;
    flex-direction: row-reverse; /* Щоб 10 була справа */
    justify-content: flex-end;
    direction: ltr;
    font-size: 1.5em;
    margin: 10px 0 20px 0;
}
.rating-group input {
    display: none;
}
.rating-group label {
    color: #333;
    cursor: pointer;
    transition: color 0.2s;
}

/* RPE: Використовуємо круги як маркери */
.pain-group label:before {
    content: '●';
    margin-right: 3px;
    margin-left: 3px;
    font-size: 0.8em;
}

/* Колірна індикація RPE: Зелений (легко), Жовтий (важко), Червоний (макс. важко) */
/* RPE 1-2 Green */
.pain-group input:nth-child(2):checked ~ label:before,
.pain-group input:nth-child(2) ~ label:hover:before,
.pain-group input:nth-child(2) ~ label:hover ~ label:before,
.pain-group input:nth-child(2):checked ~ label { color: #50C878; } 

/* RPE 3-7 Yellow */
.pain-group input:nth-child(4):checked ~ label:before,
.pain-group input:nth-child(4) ~ label:hover:before,
.pain-group input:nth-child(4) ~ label:hover ~ label:before,
.pain-group input:nth-child(4):checked ~ label { color: #FFC72C; } 

/* RPE 8-10 Red */
.pain-group input:nth-child(10):checked ~ label:before,
.pain-group input:nth-child(10) ~ label:hover:before,
.pain-group input:nth-child(10) ~ label:hover ~ label:before,
.pain-group input:nth-child(10):checked ~ label { color: #DA3E52; } 


/* ============================================== */
/* 3. СТИЛІ ACWR ТА РИЗИКУ */
/* ============================================== */

.risk-card h3 {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 5px;
}

#acwr-status {
    padding: 10px;
    font-size: 1.2em;
}

/* ============================================== */
/* 4. АДАПТИВНІСТЬ (Media Queries) */
/* ============================================== */

@media (max-width: 992px) {
    .dashboard-container {
        flex-direction: column;
        gap: 20px;
    }
    .form-card, .visualization-area {
        width: 100%;
        max-width: 100%;
        min-width: unset;
    }
    .chart-card {
        height: 300px;
    }
}
