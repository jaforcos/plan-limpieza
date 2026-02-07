import {
  doc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

(async () => {
  "use strict";

  // -----------------------------
  // 0) Utilidades base / defensas
  // -----------------------------
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  };

  const safeJsonParse = (raw, fallback) => {
    try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  };

  // Asegura que exista data
  const data = window.PLAN_DATA;
  if (!data) {
    document.body.innerHTML = `
      <div style="padding:16px;font-family:system-ui">
        <h2>⚠️ Error: No se encontró PLAN_DATA</h2>
        <p>Revisa que <code>data.js</code> cargue antes que <code>app.js</code> y que defina <code>window.PLAN_DATA</code>.</p>
      </div>`;
    console.error("PLAN_DATA no está definido. ¿Se carga data.js?");
    return;
  }

  // -----------------------------
  // 1) Config de estado y fechas
  // -----------------------------
