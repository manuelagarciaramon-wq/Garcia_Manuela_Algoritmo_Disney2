// =====================
// 1) Películas Disney
// =====================

const peliculas = [
  "El Rey León",
  "La Bella y la Bestia",
  "Aladdín",
  "Frozen",
  "Moana",
  "Mulan",
  "Hércules",
  "Toy Story",
  "Encanto",
  "Zootopia"
];

const audiencias = {
  "N": "Niños",
  "J": "Adolescentes",
  "A": "Adultos",
  "C": "Fans clásicos",
  "M": "Fans era moderna"
};

const criterios = {
  "G": "¿Cuál es mejor película en general?",
  "H": "¿Cuál tiene mejor historia?",
  "S": "¿Cuál tiene mejor banda sonora?",
  "E": "¿Cuál es más emotiva?"
};

// =====================
// 2) Parámetros Elo
// =====================

const RATING_INICIAL = 1000;
const K = 32;
const STORAGE_KEY = "disneymash_state_v1";

// =====================
// 3) Estado
// =====================

function defaultState(){
  const buckets = {};

  for (const seg of Object.keys(audiencias)){
    for (const ctx of Object.keys(criterios)){
      const key = `${seg}__${ctx}`;
      buckets[key] = {};
      peliculas.forEach(p => buckets[key][p] = RATING_INICIAL);
    }
  }

  return { buckets, votes: [] };
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  return JSON.parse(raw);
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// =====================
// 4) Lógica Elo
// =====================

function expectedScore(ra, rb){
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateElo(bucket, a, b, winner){
  const ra = bucket[a];
  const rb = bucket[b];

  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);

  const sa = (winner === "A") ? 1 : 0;
  const sb = (winner === "B") ? 1 : 0;

  bucket[a] = ra + K * (sa - ea);
  bucket[b] = rb + K * (sb - eb);
}

function randomPair(){
  const a = peliculas[Math.floor(Math.random() * peliculas.length)];
  let b = a;

  while (b === a){
    b = peliculas[Math.floor(Math.random() * peliculas.length)];
  }

  return [a, b];
}

function bucketKey(seg, ctx){
  return `${seg}__${ctx}`;
}

function topN(bucket, n=10){
  const arr = Object.entries(bucket).map(([p, rating]) => ({p, rating}));
  arr.sort((x,y) => y.rating - x.rating);
  return arr.slice(0, n);
}

// =====================
// 5) UI
// =====================

const segmentSelect = document.getElementById("segmentSelect");
const contextSelect = document.getElementById("contextSelect");
const questionEl = document.getElementById("question");
const labelA = document.getElementById("labelA");
const labelB = document.getElementById("labelB");
const topBox = document.getElementById("topBox");
const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");

let currentA = null;
let currentB = null;

function fillSelect(selectEl, obj){
  selectEl.innerHTML = "";
  for (const [k, v] of Object.entries(obj)){
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = v;
    selectEl.appendChild(opt);
  }
}

fillSelect(segmentSelect, audiencias);
fillSelect(contextSelect, criterios);

function newDuel(){
  [currentA, currentB] = randomPair();
  labelA.textContent = currentA;
  labelB.textContent = currentB;
  questionEl.textContent = criterios[contextSelect.value];
}

function renderTop(){
  const bucket = state.buckets[bucketKey(segmentSelect.value, contextSelect.value)];
  const rows = topN(bucket, 10);

  topBox.innerHTML = rows.map((r, idx) => `
    <div class="toprow">
      <div><b>${idx+1}.</b> ${r.p}</div>
      <div>${r.rating.toFixed(1)}</div>
    </div>
  `).join("");
}

function vote(winner){
  const key = bucketKey(segmentSelect.value, contextSelect.value);
  const bucket = state.buckets[key];

  updateElo(bucket, currentA, currentB, winner);

  state.votes.push({
    ts: new Date().toISOString(),
    audiencia: audiencias[segmentSelect.value],
    criterio: criterios[contextSelect.value],
    A: currentA,
    B: currentB,
    ganador: winner === "A" ? currentA : currentB
  });

  saveState();
  renderTop();
  newDuel();
}

document.getElementById("btnA").addEventListener("click", () => vote("A"));
document.getElementById("btnB").addEventListener("click", () => vote("B"));
document.getElementById("btnNewPair").addEventListener("click", newDuel);
document.getElementById("btnShowTop").addEventListener("click", renderTop);

btnReset.addEventListener("click", () => {
  if (!confirm("¿Seguro que deseas reiniciar el ranking?")) return;
  state = defaultState();
  saveState();
  renderTop();
  newDuel();
});

btnExport.addEventListener("click", () => {
  if (state.votes.length === 0){
    alert("Aún no hay votos.");
    return;
  }

  const headers = ["ts","audiencia","criterio","A","B","ganador"];
  const lines = [headers.join(",")];

  for (const v of state.votes){
    const row = headers.map(h => `"${v[h] ?? ""}"`).join(",");
    lines.push(row);
  }

  const blob = new Blob([lines.join("\n")], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "disneymash_votos.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

newDuel();
renderTop();
