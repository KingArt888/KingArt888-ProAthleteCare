// load-season.js - ЛОГІКА ДЛЯ СТОРІНКИ "LOAD SEASON"

// Тимчасові дані (заглушки) для демонстрації
let dailyLoadData = [
    { date: '2025-11-24', duration: 60, rpe: 7, distance: 8.5 },
    { date: '2025-11-25', duration: 90, rpe: 8, distance: 12.0 },
    { date: '2025-11-26', duration: 45, rpe: 5, distance: 5.2 },
    { date: '2025-11-27', duration: 70, rpe: 6, distance: 9.1 },
    { date: '2025-11-28', duration: 120, rpe: 9, distance: 15.0 },
    { date: '2025-11-29', duration: 60, rpe: 7, distance: 8.0 },
    { date: '2025-11-30', duration: 60, rpe: 6, distance: 8.5 },
    { date: '2025-12-01', duration: 80, rpe: 7, distance: 10.0 },
    { date: '2025-12-02', duration: 50, rpe: 5, distance: 6.0 },
    { date: '2025-12-03', duration: 90, rpe: 8, distance: 13.5 },
    { date: '2025-12-04', duration: 40, rpe: 4, distance: 4.5 },
    { date: '2025-12-05', duration: 100, rpe: 9, distance: 14.0 },
    { date: '2025-12-06', duration: 60, rpe: 7, distance: 9.0 },
    { date: '2025-12-07', duration: 75, rpe: 8, distance: 10.0 },
    { date: '2025-12-08', duration: 95, rpe: 9, distance: 15.0 },
    { date: '2025-12-09', duration: 65, rpe: 7, distance: 8.0 },
    { date: '2025-12-10', duration: 120, rpe: 10, distance: 18.0 },
    { date: '2025-12-11', duration: 50, rpe: 6, distance: 5.0 },
    { date: '2025-12-12', duration: 110, rpe: 9, distance: 16.0 },
    { date: '2025-12-13', duration: 80, rpe: 8, distance: 10.0 },
];

function calculateSessionRPE(duration, rpe) {
    return duration * rpe;
}

function getWeekNumber(dateString) {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return date.getFullYear() * 100 + weekNo;
}


function calculateACWR() {
    const sortedData = [...dailyLoadData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const latestDate = sortedData[sortedData.length - 1] ? new Date(sortedData[sortedData.length - 1].date) : new Date();

    const sevenDaysAgo = new Date(latestDate);
    sevenDaysAgo.setDate(latestDate.getDate() - 7);
    const twentyEightDaysAgo = new Date(latestDate);
    twentyEightDaysAgo.setDate(latestDate.getDate() - 28);

    const dataWithLoad = sortedData.map(item => ({
        ...item,
        load: calculateSessionRPE(item.duration, item.rpe)
    }));

    const acuteLoadDays = dataWithLoad.filter(item => new Date(item.date) > sevenDaysAgo);
    const totalAcuteLoad = acuteLoadDays.reduce((sum, item) => sum + item.load, 0);
    const acuteLoad = totalAcuteLoad / 7;

    const chronicLoadDays = dataWithLoad.filter(item => new Date(item.date) > twentyEightDaysAgo);
    const totalChronicLoad = chronicLoadDays.reduce((sum, item) => sum + item.load, 0);
    const chronicLoad = totalChronicLoad / 28;

    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;
    
    return {
        acuteLoad: Math.round(acuteLoad),
        chronicLoad: Math.round(chronicLoad),
        acwr: parseFloat(acwr.toFixed(2))
    };
}

function updateACWRGauge(acwrValue) {
    const needle = document.getElementById('gauge-needle');
    const acwrValueDisplay = document.getElementById('acwr-value');
    const statusText = document.getElementById('acwr-status');

    if (!needle || !acwrValueDisplay || !statusText) return; 

    let degree = 0;
    let status = 'Недостатньо даних';
    let statusClass = 'status-warning';

    if (acwrValue >= 0.8 && acwrValue <= 1.3) {
        // Оптимальна зона: від -30 до 30 градусів
        // Центр 1.05 = 0deg. 0.8 = -40deg. 1.3 = +40deg (приблизно)
        degree = (acwrValue - 1.05) * 160; 
        status = 'Безпечна зона (Оптимально)';
        statusClass = 'status-safe';
    } else if (acwrValue < 0.8 && acwrValue >= 0.5) {
        // Недотренованість: від -90 до -30 градусів
        degree = -90 + (acwrValue - 0.5) * (60 / 0.3); // 60 deg over range 0.3
        status = 'Ризик недотренованості (Низьке навантаження)';
        statusClass = 'status-warning';
    } else if (acwrValue > 1.3 && acwrValue <= 1.5) {
        // Підвищений ризик: від 30 до 60 градусів
        degree = 40 + (acwrValue - 1.3) * (20 / 0.2); // 20 deg over range 0.2
        status = 'Підвищений ризик травм (Зростання навантаження)';
        statusClass = 'status-warning';
    } else if (acwrValue > 1.5) {
        // Високий ризик: від 60 до 90 градусів
        degree = 60 + (acwrValue - 1.5) * 20; // 30 deg over 1.5+
        status = 'Високий ризик травм (Критичне навантаження)';
        statusClass = 'status-danger';
    } else {
        // < 0.5
        degree = -90; 
        status = 'Критично низьке навантаження (Детренування)';
        statusClass = 'status-danger';
    }
    
    // Обмеження стрілки в діапазоні -90 до 90
    degree = Math.min(90, Math.max(-90, degree)); 

    needle.style.transform = `translateX(-50%) rotate(${degree}deg)`;
    acwrValueDisplay.textContent = acwrValue.toFixed(2);
    statusText.textContent = status;
    // Оновлення класу для кольорового відображення статусу
    statusText.className = 'status-box ' + statusClass;
}

function formatDistanceDataForChart() {
    const weeklyDistance = {};

    dailyLoadData.forEach(item => {
        const week = getWeekNumber(item.date);
        if (!weeklyDistance[week]) {
            weeklyDistance[week] = 0;
        }
        weeklyDistance[week] += item.distance;
    });

    // Генеруємо мітки "Тиждень 1", "Тиждень 2" і т.д.
    const labels = Object.keys(weeklyDistance).map((weekNum, index) => `Тиждень ${index + 1}`);
    const data = Object.values(weeklyDistance);
    
    return { labels, data };
}

let distanceChart;
function renderDistanceChart() {
    const ctx = document.getElementById('distanceChart')?.getContext('2d');
    if (!ctx) return;

    const { labels, data } = formatDistanceDataForChart();

    if (distanceChart) {
        distanceChart.destroy();
    }
    
    distanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Загальна дистанція (км)',
                data: data,
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                borderWidth: 3,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#CCCCCC' } },
            },
            scales: {
                x: { ticks: { color: '#AAAA
