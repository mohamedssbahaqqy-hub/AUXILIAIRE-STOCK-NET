const KEY = "aux_stock_v1";

let db = JSON.parse(localStorage.getItem(KEY) || "null") || {
  items: AUX_DATA.map((x, i) => ({
    id: i,
    code: x[0],
    cat: x[1],
    name: x[2],
    stock: x[3],
    unit: x[4]
  })),
  moves: [],
  user: ""
};

function persist() {
  localStorage.setItem(KEY, JSON.stringify(db));
  renderAll();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function fmt(n) {
  return Number(n || 0).toLocaleString("fr-FR", {
    maximumFractionDigits: 3
  });
}

function dateNow() {
  let d = new Date();
  return new Date(
    d.getTime() - d.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 16);
}

function monthNow() {
  return new Date().toISOString().slice(0, 7);
}

function setDefaults() {
  document.getElementById("histMonth").value = monthNow();
  document.getElementById("reportMonth").value = monthNow();
  document.getElementById("mUser").value = db.user || "";
}

// STATISTIQUES

function renderStats() {
  document.getElementById("sRefs").textContent =
    db.items.length;

  document.getElementById("sQty").textContent =
    fmt(db.items.reduce((a, x) => a + Number(x.stock), 0));

  document.getElementById("sZero").textContent =
    db.items.filter(x => Number(x.stock) <= 0).length;
}

// FAMILLES

function renderCategories() {
  let s = document.getElementById("category");
  let v = s.value;

  let cats = [...new Set(db.items.map(x => x.cat))].sort();

  s.innerHTML =
    '<option value="">Toutes les familles</option>' +
    cats.map(c => `<option>${esc(c)}</option>`).join("");

  s.value = v;
}

// AFFICHAGE STOCK

function renderStock() {
  let q = document.getElementById("search").value.toLowerCase();
  let cat = document.getElementById("category").value;

  let a = db.items.filter(x =>
    (!cat || x.cat === cat) &&
    (!q || (x.code + " " + x.name + " " + x.cat)
      .toLowerCase().includes(q))
  );

  document.getElementById("stockCount").textContent =
    a.length + " référence(s)";

  document.getElementById("stockBody").innerHTML =
    a.map(x => `
      <tr>
        <td class="code">${esc(x.code)}</td>
        <td>${esc(x.cat)}</td>
        <td>${esc(x.name)}</td>
        <td class="qty ${x.stock <= 0 ? "low" : ""}">
          ${fmt(x.stock)}
        </td>
        <td>${esc(x.unit)}</td>
        <td>
          <button class="btn small"
            onclick="quickMove(${x.id})">
            Mouvement
          </button>
        </td>
      </tr>
    `).join("") ||
    '<tr><td colspan="6" class="empty">Aucun produit</td></tr>';
}

// LISTE DES PRODUITS

function renderProductSelect() {
  let s = document.getElementById("mProduct");
  let v = s.value;

  s.innerHTML = db.items.map(x => `
    <option value="${x.id}">
      ${esc(x.code)} — ${esc(x.name)}
      (Stock: ${fmt(x.stock)} ${esc(x.unit)})
    </option>
  `).join("");

  if ([...s.options].some(o => o.value === v)) {
    s.value = v;
  }
}

// HISTORIQUE

function renderHistory() {
  let m = document.getElementById("histMonth").value;
  let t = document.getElementById("histType").value;

  let a = db.moves.filter(x =>
    (!m || x.date.slice(0, 7) === m) &&
    (!t || x.type === t)
  ).sort((a, b) => b.date.localeCompare(a.date));

  document.getElementById("historyBody").innerHTML =
    a.map(x => {
      let p = db.items.find(i => i.id === x.pid) || {};

      return `
        <tr>
          <td>${esc(x.date.replace("T", " "))}</td>
          <td>
            ${x.type === "OUT" ? "Sortie" :
              x.type === "IN" ? "Entrée" : "Correction"}
          </td>
          <td>
            ${esc(p.code || "Produit supprimé")}
            <br>
            <span class="muted">${esc(p.name || "")}</span>
          </td>
          <td>${fmt(x.qty)}</td>
          <td>${esc(x.user)}</td>
          <td>${esc(x.project)}</td>
          <td>${esc(x.note)}</td>
        </tr>
      `;
    }).join("") ||
    '<tr><td colspan="7" class="empty">Aucun mouvement</td></tr>';
}

// INVENTAIRE

function monthData() {
  let m = document.getElementById("reportMonth").value;

  return db.moves.filter(x =>
    !m || x.date.slice(0, 7) === m
  );
}

function renderReport() {
  let a = monthData();

  let sum = t => a
    .filter(x => x.type === t)
    .reduce((s, x) => s + Number(x.qty), 0);

  document.getElementById("rIn").textContent = fmt(sum("IN"));
  document.getElementById("rOut").textContent = fmt(sum("OUT"));
  document.getElementById("rAdj").textContent = fmt(sum("ADJ"));

  document.getElementById("reportBody").innerHTML =
    db.items.map(p => `
      <tr>
        <td>${esc(p.code)}</td>
        <td>${esc(p.name)}</td>
        <td><b>${fmt(p.stock)}</b></td>
        <td>${fmt(a.filter(x =>
          x.pid === p.id && x.type === "IN"
        ).reduce((s, x) => s + x.qty, 0))}</td>
        <td>${fmt(a.filter(x =>
          x.pid === p.id && x.type === "OUT"
        ).reduce((s, x) => s + x.qty, 0))}</td>
        <td>${esc(p.unit)}</td>
      </tr>
    `).join("");
}

// ACTUALISATION

function renderAll() {
  renderStats();
  renderCategories();
  renderStock();
  renderProductSelect();
  renderHistory();
  renderReport();
}

// ACCES DIRECT AU MOUVEMENT

function quickMove(id) {
  document.querySelector('[data-tab="move"]').click();
  document.getElementById("mProduct").value = id;
}

// NAVIGATION

document.querySelectorAll(".tab").forEach(b => {
  b.addEventListener("click", () => {

    document.querySelectorAll(".tab").forEach(x => {
      x.classList.toggle("active", x === b);
    });

    document.querySelectorAll(".page").forEach(x => {
      x.classList.toggle("hide", x.id !== b.dataset.tab);
    });

    renderAll();
  });
});

// RECHERCHE

document.getElementById("search")
  .addEventListener("input", renderStock);

document.getElementById("category")
  .addEventListener("change", renderStock);

// FILTRES

document.getElementById("histMonth")
  .addEventListener("change", renderHistory);

document.getElementById("histType")
  .addEventListener("change", renderHistory);

document.getElementById("reportMonth")
  .addEventListener("change", renderReport);

// ENREGISTRER MOUVEMENT

document.getElementById("saveMove").addEventListener("click", () => {

  let pid = Number(document.getElementById("mProduct").value);

  let p = db.items.find(x => x.id === pid);

  let type = document.getElementById("mType").value;

  let qty = Number(document.getElementById("mQty").value);

  let user = document.getElementById("mUser").value.trim()
    || "Non renseigné";

  if (!p || !Number.isFinite(qty) || qty <= 0) {
    alert("Choisissez un produit et une quantité valide.");
    return;
  }

  let actual = qty;

  // CORRECTION STOCK PHYSIQUE

  if (type === "ADJ") {

    if (qty === Number(p.stock)) {
      alert("Le stock est déjà égal à cette quantité.");
      return;
    }

    actual = Math.abs(qty - p.stock);
    p.stock = qty;

  }

  // SORTIE

  else if (type === "OUT") {

    if (qty > p.stock) {
      alert("Stock insuffisant. Disponible : " + fmt(p.stock));
      return;
    }

    p.stock -= qty;

  }

  // ENTREE

  else {
    p.stock += qty;
  }

  // HISTORIQUE

  db.moves.push({
    id: Date.now(),
    date: dateNow(),
    pid: pid,
    type: type,
    qty: actual,
    user: user,
    project: document.getElementById("mProject").value.trim(),
    note: type === "ADJ"
      ? "Stock physique fixé à " + fmt(qty)
      : document.getElementById("mNote").value.trim()
  });

  db.user = user;

  document.getElementById("mQty").value = "";
  document.getElementById("mNote").value = "";

  persist();

  alert("Mouvement enregistré avec succès.");
});

// EXPORT CSV

function csv(rows, name) {

  let content = "\ufeff" + rows.map(r =>
    r.map(v =>
      '"' + String(v ?? "").replace(/"/g, '""') + '"'
    ).join(";")
  ).join("\r\n");

  let blob = new Blob([content], {
    type: "text/csv;charset=utf-8;"
  });

  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();

  URL.revokeObjectURL(url);
}

// EXPORT HISTORIQUE

document.getElementById("exportHistory").onclick = () => {

  let m = document.getElementById("histMonth").value;

  let a = db.moves.filter(x =>
    !m || x.date.slice(0, 7) === m
  );

  csv([
    ["Date", "Type", "Code", "Désignation",
     "Quantité", "Unité", "Opérateur", "Projet", "Note"],

    ...a.map(x => {
      let p = db.items.find(i => i.id === x.pid) || {};

      return [
        x.date, x.type, p.code, p.name,
        x.qty, p.unit, x.user, x.project, x.note
      ];
    })

  ], "historique_auxiliaire.csv");
};

// EXPORT INVENTAIRE

document.getElementById("exportReport").onclick = () => {

  let m = document.getElementById("reportMonth").value;
  let a = monthData();

  csv([
    ["Code", "Famille", "Désignation",
     "Stock actuel", "Entrées", "Sorties", "Unité"],

    ...db.items.map(p => [
      p.code,
      p.cat,
      p.name,
      p.stock,

      a.filter(x => x.pid === p.id && x.type === "IN")
        .reduce((s, x) => s + x.qty, 0),

      a.filter(x => x.pid === p.id && x.type === "OUT")
        .reduce((s, x) => s + x.qty, 0),

      p.unit
    ])

  ], "inventaire_auxiliaire_" + (m || "tout") + ".csv");
};

// PARAMETRES

document.getElementById("saveSettings").onclick = () => {

  db.user = document.getElementById("defaultUser").value.trim();

  persist();

  alert("Paramètres enregistrés.");
};

// SAUVEGARDE JSON

document.getElementById("backup").onclick = () => {

  let blob = new Blob(
    [JSON.stringify(db, null, 2)],
    { type: "application/json" }
  );

  let url = URL.createObjectURL(blob);

  let a = document.createElement("a");
  a.href = url;
  a.download = "sauvegarde_auxiliaire.json";
  a.click();

  URL.revokeObjectURL(url);
};

// RESTAURATION

document.getElementById("restoreFile").onchange = e => {

  let f = e.target.files[0];

  if (!f) return;

  let r = new FileReader();

  r.onload = () => {

    try {

      let d = JSON.parse(r.result);

      if (!Array.isArray(d.items) || !Array.isArray(d.moves)) {
        throw new Error("Fichier invalide");
      }

      if (confirm("Remplacer les données actuelles ?")) {
        db = d;
        persist();
        alert("Sauvegarde restaurée.");
      }

    } catch (err) {
      alert("Fichier de sauvegarde invalide.");
    }
  };

  r.readAsText(f);
};

// REINITIALISATION

document.getElementById("reset").onclick = () => {

  if (confirm("Attention ! Supprimer tous les mouvements ?")) {
    localStorage.removeItem(KEY);
    location.reload();
  }
};

// DEMARRAGE

setDefaults();

document.getElementById("defaultUser").value = db.user || "";

renderAll();
