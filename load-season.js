(function() {
    const COLLECTION_NAME = 'load_season_reports';
    let dailyLoadData = [];
    let distanceChart = null;
    let loadChart = null;

    document.addEventListener('DOMContentLoaded', () => {
        const dateInput = document.getElementById('load-date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) await syncLoadFromFirebase(user.uid);
            else await firebase.auth().signInAnonymously().catch(console.error);
        });

        const form = document.getElementById('load-form');
        if (form) form.addEventListener('submit', handleFormSubmit);
    });

    async function syncLoadFromFirebase(uid) {
        try {
            const snapshot = await db.collection(COLLECTION_NAME)
                .where("userId", "==", uid)
                .orderBy("date", "asc")
                .get();
            
            dailyLoadData = [];
            snapshot.forEach(doc => dailyLoadData.push(doc.data()));
            if (dailyLoadData.length === 0) dailyLoadData = getDemoData();

            const { acute, chronic, acwr } = calculateMetrics();
            drawSpeedometer(acwr);
            renderCharts(acute, chronic);
        } catch (e) { console.error("Синхронізація не вдалася:", e); }
    }

    function calculateMetrics() {
        if (!dailyLoadData.length) return { acute:0, chronic:0, acwr:0 };
        const sorted = [...dailyLoadData].sort((a,b)=>new Date(a.date)-new Date(b.date));
        const lastDate = new Date(sorted[sorted.length-1].date);

        const getAvg = (days) => {
            const start = new Date(lastDate);
            start.setDate(lastDate.getDate() - days);
            const period = sorted.filter(d => new Date(d.date) > start);
            const total = period.reduce((s,d)=>s + (d.duration*(d.rpe||0)),0);
            return total / days;
        };

        const acute = getAvg(7);
        const chronic = getAvg(28);
        return { acute, chronic, acwr: chronic>0?acute/chronic:0 };
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const user = firebase.auth().currentUser;
        if (!user) return;

        const form = e.target;
        const data = {
            userId: user.uid,
            date: form.elements['date'].value,
            duration: parseInt(form.elements['duration'].value),
            distance: parseFloat(form.elements['distance'].value),
            rpe: parseInt(form.querySelector('input[name="rpe"]:checked')?.value||0),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTION_NAME).doc(`${user.uid}_${data.date}`).set(data);
        await syncLoadFromFirebase(user.uid);
    }

    function getDemoData() {
        return [{ date: new Date().toISOString().split('T')[0], duration:60, rpe:7, distance:5 }];
    }

    function renderCharts(acute, chronic) {
        const ctxD = document.getElementById('distanceChart');
        const ctxL = document.getElementById('loadChart');

        if (ctxD) {
            if (distanceChart) distanceChart.destroy();
            distanceChart = new Chart(ctxD, {
                type:'line',
                data:{
                    labels: dailyLoadData.slice(-7).map(d=>d.date.split('-').reverse().slice(0,2).join('.')),
                    datasets:[{
                        label:'Дистанція (км)',
                        data: dailyLoadData.slice(-7).map(d=>d.distance),
                        borderColor:'#FFC72C',
                        backgroundColor:'rgba(255,199,44,0.1)',
                        fill:true, tension:0.4, borderWidth:3
                    }]
                },
                options:{responsive:true, maintainAspectRatio:false}
            });
        }

        if (ctxL) {
            if (loadChart) loadChart.destroy();
            loadChart = new Chart(ctxL, {
                type:'line',
                data:{
                    labels:['Минулий період','Поточний період'],
                    datasets:[
                        { label:'Acute Load', data:[acute*0.85,acute], borderColor:'#d9534f', borderWidth:3, tension:0.3 },
                        { label:'Chronic Load', data:[chronic*0.95,chronic], borderColor:'#5cb85c', borderWidth:3, tension:0.3 }
                    ]
                },
                options:{responsive:true, maintainAspectRatio:false}
            });
        }
    }

    function drawSpeedometer(acwrValue) {
        const canvas = document.getElementById('speedometer-canvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width/2;
        const centerY = height;
        const radius = width/2-20;

        ctx.clearRect(0,0,width,height);

        const zones = [
            { color:'#5cb85c', start:-Math.PI, end:-Math.PI+Math.PI*0.4 },
            { color:'#f0ad4e', start:-Math.PI+Math.PI*0.4, end:-Math.PI+Math.PI*0.7 },
            { color:'#d9534f', start:-Math.PI+Math.PI*0.7, end:0 }
        ];

        zones.forEach(z=>{
            ctx.beginPath();
            ctx.arc(centerX,centerY,radius,z.start,z.end,false);
            ctx.lineWidth=18;
            ctx.strokeStyle=z.color;
            ctx.stroke();
        });

        let normalized = Math.min(acwrValue/2,1);
        let angle = -Math.PI + normalized*Math.PI;

        ctx.beginPath();
        ctx.moveTo(centerX,centerY);
        ctx.lineTo(centerX+radius*0.9*Math.cos(angle), centerY+radius*0.9*Math.sin(angle));
        ctx.lineWidth=4;
        ctx.strokeStyle='#FFD700';
        ctx.lineCap='round';
        ctx.stroke();

        const display = document.getElementById('acwr-value');
        display.textContent = acwrValue.toFixed(2);

        const statusBox = document.querySelector('.gauge-status-box');
        if (acwrValue<0.8){
            statusBox.textContent='НЕДОТРЕНОВАНІСТЬ';
            statusBox.className='gauge-status-box status-warning';
        } else if (acwrValue<=1.3){
            statusBox.textContent='БЕЗПЕЧНА ЗОНА';
            statusBox.className='gauge-status-box status-safe';
        } else{
            statusBox.textContent='РИЗИК ТРАВМИ';
            statusBox.className='gauge-status-box status-danger';
        }
    }

})();
