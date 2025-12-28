(function () {

  /* ===============================
     FIREBASE
  =============================== */
  const db = firebase.firestore();
  const auth = firebase.auth();

  const COLL_HISTORY = "weight_history";
  const COLL_USERS = "users";
  let currentUserId = null;

  /* ===============================
     3D ATHLETE INIT
  =============================== */
  const wrapper = document.querySelector(".hologram-wrapper");

  // Видаляємо SVG (fallback)
  const oldSVG = document.getElementById("human-vitals-svg");
  if (oldSVG) oldSVG.remove();

  // Створюємо 3D атлета
  const modelViewer = document.createElement("model-viewer");
  modelViewer.setAttribute("src", "assets/athlete.glb");
  modelViewer.setAttribute("auto-rotate", "");
  modelViewer.setAttribute("camera-controls", "");
  modelViewer.setAttribute("interaction-prompt", "none");
  modelViewer.setAttribute("exposure", "1.25");
  modelViewer.setAttribute("shadow-intensity", "0");
  modelViewer.style.width = "100%";
  modelViewer.style.height = "100%";
  modelViewer.style.background = "transparent";

  wrapper.appendChild(modelViewer);

  /* ===============================
     HOLOGRAM STYLE
  =============================== */
  function setHologramStyle(bmi) {
    let filter = "";

    if (bmi < 18.5 || bmi > 27) {
      // alert
      filter = `
        brightness(1.1)
        drop-shadow(0 0 10px rgba(255,77,77,0.6))
        drop-shadow(0 0 25px rgba(255,77,77,0.4))
      `;
    } else {
      // optimal
      filter = `
        brightness(1.2)
        drop-shadow(0 0 12px rgba(0,242,254,0.6))
        drop-shadow(0 0 30px rgba(0,242,254,0.35))
      `;
    }

    modelViewer.style.filter = filter;
  }

  /* ===============================
     UI UPDATE
  =============================== */
  function updateUI(weight, height, age) {
    const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
    document.getElementById("bmi-value").textContent = bmi;

    let statusText = "---";
    if (bmi < 18.5) statusText = "UNDERWEIGHT";
    else if (bmi < 25) statusText = "OPTIMAL";
    else statusText = "OVERLOAD";

    document.getElementById("bmi-status-text").textContent = statusText;

    const fat = Math.max(3, (1.2 * bmi) + (0.23 * age) - 16.2);
    document.getElementById("fat-percentage-value").textContent =
      fat.toFixed(1) + "%";

    setHologramStyle(bmi);

    const dietBox = document.getElementById("diet-plan-content");
    if (bmi < 18.5) {
      dietBox.innerHTML =
        "<strong>Hypertrophy:</strong><br>+500 kcal, високий білок, контроль відновлення.";
    } else if (bmi < 25) {
      dietBox.innerHTML =
        "<strong>Athletic balance:</strong><br>Поточна форма оптимальна.";
    } else {
      dietBox.innerHTML =
        "<strong>Recomposition:</strong><br>Дефіцит калорій + силова робота.";
    }
  }

  /* ===============================
     CHART.JS
  =============================== */
  let weightChart = null;

  function renderChart(data) {
    const ctx = document.getElementById("weightChart").getContext("2d");
    if (weightChart) weightChart.destroy();

    weightChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          data: data.map(d => d.weight),
          borderWidth: 2,
          tension: 0.4,
          fill: false
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: false } }
      }
    });
  }

  /* ===============================
     LOAD USER DATA
  =============================== */
  auth.onAuthStateChanged(async user => {
    if (!user) return;

    currentUserId = user.uid;

    const userDoc = await db.collection(COLL_USERS).doc(user.uid).get();
    if (userDoc.exists) {
      document.getElementById("user-height").value = userDoc.data().height || 180;
      document.getElementById("user-age").value = userDoc.data().age || 25;
    }

    const snap = await db
      .collection(COLL_HISTORY)
      .where("userId", "==", user.uid)
      .orderBy("date", "asc")
      .get();

    if (!snap.empty) {
      const history = snap.docs.map(d => d.data());
      renderChart(history);

      const last = history[history.length - 1];
      updateUI(
        last.weight,
        document.getElementById("user-height").value,
        document.getElementById("user-age").value
      );
    }
  });

  /* ===============================
     FORM SUBMIT
  =============================== */
  document.getElementById("weight-form").addEventListener("submit", async e => {
    e.preventDefault();

    const weight = +document.getElementById("weight-value").value;
    const height = +document.getElementById("user-height").value;
    const age = +document.getElementById("user-age").value;

    if (!currentUserId) return;

    await db.collection(COLL_HISTORY).add({
      userId: currentUserId,
      weight,
      date: new Date().toISOString().split("T")[0]
    });

    await db.collection(COLL_USERS).doc(currentUserId).set(
      { height, age },
      { merge: true }
    );

    location.reload();
  });

})();
