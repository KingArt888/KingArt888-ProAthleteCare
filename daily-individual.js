// daily-individual.js — ProAtletCare (PREMIUM FINISHED)

(function() {
    const YOUTUBE_BASE = 'https://www.youtube.com/embed/';
    const STAGES_LIST = ['Pre-Training', 'Main Training', 'Post-Training'];

    // 1. ПЕРСОНАЛЬНІ ПОРАДИ ТРЕНЕРА
    const MD_RECS = {
        'MD': 'День гри! Максимальна концентрація. Тільки цільові рухи.',
        'MD+1': 'Відновлення: акцент на мобільності та легкому русі.',
        'MD-1': 'Активація: короткі вибухові рухи, робота над швидкістю.',
        'TRAIN': 'Стандартне тренування: фокус на якості виконання.',
        'REST': 'Повне відновлення. Тіло будується під час спокою.'
    };

    function getFormattedDate() {
        const d = new Date();
        const days = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П’ятниця', 'Субота'];
        const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
        return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    }

    async function initAthleteView() {
        const listContainer = document.getElementById('daily-exercise-list');
        const statusDisplay = document.getElementById('md-status-display');
        const recContainer = document.getElementById('md-recommendations');
        const welcomeBox = document.getElementById('athlete-welcome');

        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return;

            // ВІТАННЯ
            if (welcomeBox) {
                welcomeBox.innerHTML = `
                    <div style="margin-bottom:10px;">
                        <h2 style="color:#fff; margin:0; font-size:1.6rem; font-weight:800;">Привіт, ${user.displayName || 'Атлет'}! 👋</h2>
                        <p style="color:#d4af37; margin:5px 0 0 0; font-size:0.9rem; font-weight:500; text-transform:uppercase; letter-spacing:1px;">${getFormattedDate()}</p>
                    </div>`;
            }

            const weekId = new Date().toISOString().split('T')[0]; // Спрощений ID тижня
            
            try {
                const doc = await db.collection('weekly_plans').doc(`${user.uid}_${weekId}`).get();
                const fbData = doc.exists ? doc.data().planData : {};
                const todayIdx = (new Date().getDay() === 0) ? 6 : new Date().getDay() - 1;
                const mdStatus = calculateStatus(fbData, todayIdx);
                
                // СТАТУС ДНЯ
                if (statusDisplay) {
                    statusDisplay.textContent = mdStatus;
                    statusDisplay.style.background = mdStatus === 'MD' ? '#ff4d4d' : '#d4af37';
                }

                // ПОРАДА ТРЕНЕРА
                if (recContainer) {
                    recContainer.innerHTML = `
                        <div style="background:linear-gradient(135deg, #111 0%, #000 100%); border-left:3px solid #d4af37; padding:15px; border-radius:0 12px 12px 0; margin:20px 0;">
                            <span style="color:#d4af37; font-weight:900; font-size:0.65rem; text-transform:uppercase; letter-spacing:2px; display:block; margin-bottom:5px;">Порада на сьогодні:</span>
                            <p style="margin:0; color:#eee; font-size:0.9rem; font-style:italic;">"${MD_RECS[mdStatus] || MD_RECS['TRAIN']}"</p>
                        </div>`;
                }

                const planKey = `status_plan_${mdStatus}`;
                const exercises = fbData[planKey]?.exercises || [];
                renderExercises(exercises, listContainer);

            } catch (err) { console.error(err); }
        });
    }

    function renderExercises(exercises, container) {
        if (!exercises.length) {
            container.innerHTML = `<p style="color:#444; text-align:center; padding:40px;">На сьогодні вправ не заплановано</p>`;
            return;
        }

        let html = '';
        STAGES_LIST.forEach(stage => {
            const stageExs = exercises.filter(ex => ex.stage === stage);
            if (stageExs.length > 0) {
                html += `
                <div style="margin-bottom:20px;">
                    <div onclick="this.nextElementSibling.style.display = (this.nextElementSibling.style.display === 'none' ? 'block' : 'none')" 
                         style="background:#0a0a0a; color:#d4af37; padding:15px
