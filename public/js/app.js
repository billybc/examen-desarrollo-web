/* ============================================================
   app.js - router + vistas del SPA
   ============================================================ */

const app = document.getElementById("app");
const navLinks = document.getElementById("navLinks");
let usuarioActual = null; // { uid, ...perfil }

/* ---------------- Autenticación / Nav ---------------- */
auth.onAuthStateChanged(async (user) => {
  if (user) {
    const perfil = await obtenerPerfilUsuario(user.uid);
    usuarioActual = { uid: user.uid, ...perfil };
  } else {
    usuarioActual = null;
  }
  renderNav();
  router();
});

function renderNav() {
  if (usuarioActual) {
    navLinks.innerHTML = `
      <a href="#/publicar">+ Publicar vehículo</a>
      <a href="#/mis-publicaciones">Mis publicaciones</a>
      <span style="color:#64748b;font-size:.85rem;">${usuarioActual.nombre || ""}</span>
      <button id="btnLogout" class="btn-primary">Salir</button>
    `;
    document.getElementById("btnLogout").addEventListener("click", () => auth.signOut());
  } else {
    navLinks.innerHTML = `
      <a href="#/login">Iniciar sesión</a>
      <a href="#/registro" class="btn-primary">Registrarme</a>
    `;
  }
}

function requiereSesion() {
  if (!usuarioActual) {
    alert("Necesitás iniciar sesión para hacer esto.");
    location.hash = "#/login";
    return false;
  }
  return true;
}

/* ---------------- Router ---------------- */
window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);

function router() {
  const hash = location.hash || "#/";
  let m;

  if (hash === "#/" || hash === "") return vistaHome();
  if (hash === "#/login") return vistaLogin();
  if (hash === "#/registro") return vistaRegistro();
  if (hash === "#/publicar") return vistaPublicar();
  if (hash === "#/mis-publicaciones") return vistaMisPublicaciones();
  if ((m = hash.match(/^#\/editar\/(.+)$/))) return vistaPublicar(m[1]);
  if ((m = hash.match(/^#\/vehiculo\/(.+)$/))) return vistaDetalle(m[1]);

  app.innerHTML = "<p>Página no encontrada.</p>";
}

/* ---------------- Vista: Login ---------------- */
function vistaLogin() {
  app.innerHTML = `
    <div class="card-form">
      <h2>Iniciar sesión</h2>
      <div id="loginAlert"></div>
      <form id="formLogin">
        <div class="field"><label>Correo</label><input type="email" id="loginCorreo" required></div>
        <div class="field"><label>Contraseña</label><input type="password" id="loginPass" required></div>
        <button class="btn" type="submit">Ingresar</button>
      </form>
      <p style="margin-top:14px;font-size:.9rem;">¿No tenés cuenta? <a href="#/registro" style="color:#1d4ed8;">Registrate</a></p>
    </div>
  `;
  document.getElementById("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const correo = document.getElementById("loginCorreo").value.trim();
    const pass = document.getElementById("loginPass").value;
    try {
      await auth.signInWithEmailAndPassword(correo, pass);
      location.hash = "#/";
    } catch (err) {
      document.getElementById("loginAlert").innerHTML = `<div class="alert error">${err.message}</div>`;
    }
  });
}

/* ---------------- Vista: Registro ---------------- */
function vistaRegistro() {
  app.innerHTML = `
    <div class="card-form">
      <h2>Crear cuenta</h2>
      <div id="regAlert"></div>
      <form id="formRegistro">
        <div class="grid-2">
          <div class="field"><label>Nombre</label><input type="text" id="regNombre" required></div>
          <div class="field"><label>Apellido</label><input type="text" id="regApellido" required></div>
        </div>
        <div class="field"><label>Correo electrónico</label><input type="email" id="regCorreo" required></div>
        <div class="field"><label>Teléfono</label><input type="tel" id="regTelefono" required></div>
        <div class="field"><label>Contraseña</label><input type="password" id="regPass" minlength="6" required></div>
        <button class="btn" type="submit">Registrarme</button>
      </form>
    </div>
  `;
  document.getElementById("formRegistro").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("regNombre").value.trim();
    const apellido = document.getElementById("regApellido").value.trim();
    const correo = document.getElementById("regCorreo").value.trim();
    const telefono = document.getElementById("regTelefono").value.trim();
    const pass = document.getElementById("regPass").value;
    try {
      const cred = await auth.createUserWithEmailAndPassword(correo, pass);
      await crearPerfilUsuario(cred.user.uid, { nombre, apellido, correo, telefono });
      location.hash = "#/";
    } catch (err) {
      document.getElementById("regAlert").innerHTML = `<div class="alert error">${err.message}</div>`;
    }
  });
}

/* ---------------- Vista: Home / Catálogo con filtros ---------------- */
async function vistaHome() {
  app.innerHTML = `<p>Cargando inventario...</p>`;
  const vehiculos = await listarVehiculos();

  const marcas = [...new Set(vehiculos.map((v) => v.marca))].sort();
  const anios = [...new Set(vehiculos.map((v) => v.anio))].sort((a, b) => b - a);
  const combustibles = [...new Set(vehiculos.map((v) => v.combustible))].sort();

  app.innerHTML = `
    <div class="filtros">
      <input type="text" id="fBuscar" placeholder="Buscar por marca o modelo...">
      <select id="fAnio"><option value="">Año (todos)</option>${anios.map((a) => `<option value="${a}">${a}</option>`).join("")}</select>
      <select id="fMarca"><option value="">Marca (todas)</option>${marcas.map((m) => `<option value="${m}">${m}</option>`).join("")}</select>
      <select id="fCombustible"><option value="">Combustible (todos)</option>${combustibles.map((c) => `<option value="${c}">${c}</option>`).join("")}</select>
      <select id="fDanio">
        <option value="">Daño (todos)</option>
        <option value="verde">🟢 Verde</option>
        <option value="amarillo">🟡 Amarillo</option>
        <option value="rojo">🔴 Rojo</option>
      </select>
    </div>
    <div class="grid-vehiculos" id="gridVehiculos"></div>
  `;

  function pintar() {
    const texto = document.getElementById("fBuscar").value.trim().toLowerCase();
    const anio = document.getElementById("fAnio").value;
    const marca = document.getElementById("fMarca").value;
    const combustible = document.getElementById("fCombustible").value;
    const danio = document.getElementById("fDanio").value;

    const filtrados = vehiculos.filter((v) =>
      (!texto || `${v.marca} ${v.modelo}`.toLowerCase().includes(texto)) &&
      (!anio || String(v.anio) === anio) &&
      (!marca || v.marca === marca) &&
      (!combustible || v.combustible === combustible) &&
      (!danio || v.danio === danio)
    );

    const grid = document.getElementById("gridVehiculos");
    if (filtrados.length === 0) {
      grid.innerHTML = `<p>No hay vehículos con esos filtros.</p>`;
      return;
    }

    grid.innerHTML = filtrados.map((v) => {
      const estado = estadoDeSubasta(v);
      return `
        <a href="#/vehiculo/${v.id}" class="vcard">
          <img src="${v.fotos[0]}" alt="${v.marca} ${v.modelo}">
          <div class="body">
            <span class="badge-danio ${v.danio}">${v.danio.toUpperCase()}</span>
            <h3>${v.anio} ${v.marca} ${v.modelo}</h3>
            <div class="meta">${v.combustible} · ${v.transmision} · ${v.trenManejo}</div>
            <div class="precio">${estado === "activa" ? `Oferta actual: Q. ${(v.ofertaActual || v.precioBase).toLocaleString()}` : estado === "vendido" ? `Vendido: Q. ${v.ofertaActual.toLocaleString()}` : "Subasta desierta"}</div>
          </div>
        </a>`;
    }).join("");
  }

  ["fBuscar", "fAnio", "fMarca", "fCombustible", "fDanio"].forEach((id) =>
    document.getElementById(id).addEventListener("input", pintar)
  );
  pintar();
}

/* ---------------- Vista: Mis publicaciones ---------------- */
async function vistaMisPublicaciones() {
  if (!requiereSesion()) return;
  app.innerHTML = `<p>Cargando tus publicaciones...</p>`;
  const vehiculos = await listarMisVehiculos(usuarioActual.uid);

  app.innerHTML = `
    <h2>Mis publicaciones</h2>
    <div class="grid-vehiculos">
      ${vehiculos.map((v) => `
        <div class="vcard">
          <img src="${v.fotos[0]}" alt="">
          <div class="body">
            <h3>${v.anio} ${v.marca} ${v.modelo}</h3>
            <div class="meta">Oferta actual: Q. ${(v.ofertaActual || v.precioBase).toLocaleString()}</div>
            <a href="#/editar/${v.id}" class="btn secondary" style="display:inline-block;margin-top:8px;">Editar</a>
          </div>
        </div>
      `).join("") || "<p>Todavía no publicaste ningún vehículo.</p>"}
    </div>
  `;
}

/* ---------------- Vista: Publicar / Editar vehículo ---------------- */
async function vistaPublicar(idEdicion) {
  if (!requiereSesion()) return;

  let vehiculo = null;
  if (idEdicion) {
    const todos = await listarMisVehiculos(usuarioActual.uid);
    vehiculo = todos.find((v) => v.id === idEdicion);
    if (!vehiculo) { app.innerHTML = "<p>No encontrado o no te pertenece.</p>"; return; }
  }

  const v = vehiculo || {};
  app.innerHTML = `
    <div class="card-form wide">
      <h2>${idEdicion ? "Editar" : "Publicar"} vehículo</h2>
      <div id="pubAlert"></div>
      <form id="formPublicar">
        <div class="grid-3">
          <div class="field"><label>Año</label><input type="number" id="vAnio" value="${v.anio || ""}" required></div>
          <div class="field"><label>Tipo de artículo</label><input type="text" id="vTipo" value="${v.tipoArticulo || ""}" required></div>
          <div class="field"><label>Marca</label><input type="text" id="vMarca" value="${v.marca || ""}" required></div>
        </div>
        <div class="grid-3">
          <div class="field"><label>Modelo</label><input type="text" id="vModelo" value="${v.modelo || ""}" required></div>
          <div class="field"><label>Motor</label><input type="text" id="vMotor" value="${v.motor || ""}" required></div>
          <div class="field"><label>Cilindros</label><input type="number" id="vCilindros" value="${v.cilindros || ""}" required></div>
        </div>
        <div class="grid-3">
          <div class="field"><label>Transmisión</label>
            <select id="vTransmision" required>
              <option ${v.transmision === "Manual" ? "selected" : ""}>Manual</option>
              <option ${v.transmision === "Automática" ? "selected" : ""}>Automática</option>
            </select>
          </div>
          <div class="field"><label>Combustible</label>
            <select id="vCombustible" required>
              <option ${v.combustible === "Gasolina" ? "selected" : ""}>Gasolina</option>
              <option ${v.combustible === "Diésel" ? "selected" : ""}>Diésel</option>
              <option ${v.combustible === "Híbrido" ? "selected" : ""}>Híbrido</option>
              <option ${v.combustible === "Eléctrico" ? "selected" : ""}>Eléctrico</option>
            </select>
          </div>
          <div class="field"><label>Tren de manejo</label>
            <select id="vTren" required>
              ${["AWD", "FWD", "RWD", "4WD"].map((t) => `<option ${v.trenManejo === t ? "selected" : ""}>${t}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field"><label>Nivel de daño</label>
          <select id="vDanio" required>
            <option value="verde" ${v.danio === "verde" ? "selected" : ""}>🟢 Verde - Daño menor / Limpio</option>
            <option value="amarillo" ${v.danio === "amarillo" ? "selected" : ""}>🟡 Amarillo - Daño medio / Reparable</option>
            <option value="rojo" ${v.danio === "rojo" ? "selected" : ""}>🔴 Rojo - Daño severo / Salvamento</option>
          </select>
        </div>
        <div class="grid-3">
          <div class="field"><label>Precio base (Q.)</label><input type="number" id="vPrecioBase" value="${v.precioBase || ""}" min="1" required></div>
          <div class="field"><label>Fecha/hora inicio</label><input type="datetime-local" id="vInicio" required></div>
          <div class="field"><label>Fecha/hora cierre</label><input type="datetime-local" id="vCierre" required></div>
        </div>
        <div class="field">
          <label>Fotografías ${idEdicion ? "(opcional agregar más)" : "(mínimo 5)"}</label>
          <input type="file" id="vFotos" accept="image/*" multiple ${idEdicion ? "" : "required"}>
          ${v.fotos ? `<div class="foto-preview">${v.fotos.map((f) => `<img src="${f}">`).join("")}</div>` : ""}
        </div>
        <button class="btn" type="submit">${idEdicion ? "Guardar cambios" : "Publicar vehículo"}</button>
      </form>
    </div>
  `;

  document.getElementById("formPublicar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById("pubAlert");
    const archivos = Array.from(document.getElementById("vFotos").files);

    if (!idEdicion && archivos.length < 5) {
      alertBox.innerHTML = `<div class="alert error">Necesitás subir mínimo 5 fotografías.</div>`;
      return;
    }

    const datos = {
      anio: Number(document.getElementById("vAnio").value),
      tipoArticulo: document.getElementById("vTipo").value.trim(),
      marca: document.getElementById("vMarca").value.trim(),
      modelo: document.getElementById("vModelo").value.trim(),
      motor: document.getElementById("vMotor").value.trim(),
      cilindros: Number(document.getElementById("vCilindros").value),
      transmision: document.getElementById("vTransmision").value,
      combustible: document.getElementById("vCombustible").value,
      trenManejo: document.getElementById("vTren").value,
      danio: document.getElementById("vDanio").value,
      precioBase: Number(document.getElementById("vPrecioBase").value),
      fechaInicio: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById("vInicio").value)),
      fechaCierre: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById("vCierre").value)),
    };

    try {
      if (idEdicion) {
        await actualizarVehiculo(idEdicion, datos, archivos);
      } else {
        await crearVehiculo(datos, archivos);
      }
      location.hash = "#/mis-publicaciones";
    } catch (err) {
      alertBox.innerHTML = `<div class="alert error">${err.message}</div>`;
    }
  });
}

/* ---------------- Vista: Detalle + Subasta en tiempo real ---------------- */
let unsubscribeDetalle = null;
let indiceFoto = 0;

function vistaDetalle(id) {
  if (unsubscribeDetalle) unsubscribeDetalle();
  app.innerHTML = `<p>Cargando...</p>`;
  indiceFoto = 0;

  unsubscribeDetalle = obtenerVehiculoRealtime(id, (v) => pintarDetalle(v));
}

function pintarDetalle(v) {
  const estado = estadoDeSubasta(v);
  const soyGanador = usuarioActual && v.ofertaActualUid === usuarioActual.uid;

  let badgeEstado = "";
  if (estado === "activa") {
    if (v.ofertaActual === 0) {
      badgeEstado = `<span class="badge-estado">Sé el primero en ofertar</span>`;
    } else if (soyGanador) {
      badgeEstado = `<span class="badge-estado ganando">¡Vas ganando esta subasta!</span>`;
    } else {
      badgeEstado = `<span class="badge-estado superado">Tu oferta ha sido superada. ¡Ofertá antes de que termine el tiempo!</span>`;
    }
  } else if (estado === "vendido") {
    badgeEstado = `<span class="badge-estado cerrada">Subasta cerrada - Vendido en Q. ${v.ofertaActual.toLocaleString()}</span>`;
  } else {
    badgeEstado = `<span class="badge-estado cerrada">Subasta desierta - no se alcanzó el precio base</span>`;
  }

  app.innerHTML = `
    <div class="detalle-wrap">
      <div>
        <div class="carrusel">
          <img id="fotoActual" src="${v.fotos[indiceFoto]}">
          <button class="nav-btn prev" id="btnPrevFoto">‹</button>
          <button class="nav-btn next" id="btnNextFoto">›</button>
          <span class="contador">${indiceFoto + 1} / ${v.fotos.length}</span>
        </div>
        <div class="ficha-tecnica">
          <h3>Ficha técnica</h3>
          <table>
            <tr><td>Año</td><td>${v.anio}</td></tr>
            <tr><td>Tipo</td><td>${v.tipoArticulo}</td></tr>
            <tr><td>Marca / Modelo</td><td>${v.marca} ${v.modelo}</td></tr>
            <tr><td>Motor</td><td>${v.motor}</td></tr>
            <tr><td>Transmisión</td><td>${v.transmision}</td></tr>
            <tr><td>Combustible</td><td>${v.combustible}</td></tr>
            <tr><td>Tren de manejo</td><td>${v.trenManejo}</td></tr>
            <tr><td>Cilindros</td><td>${v.cilindros}</td></tr>
            <tr><td>Nivel de daño</td><td><span class="badge-danio ${v.danio}">${v.danio.toUpperCase()}</span></td></tr>
          </table>
        </div>
      </div>

      <div class="panel-subasta">
        <h2>${v.anio} ${v.marca} ${v.modelo}</h2>
        ${badgeEstado}
        <div class="timer" id="timer"></div>
        <div style="font-size:.85rem;color:#64748b;">Oferta actual</div>
        <div class="oferta-actual">Q. ${(v.ofertaActual || v.precioBase).toLocaleString()}</div>
        <div style="font-size:.85rem;color:#64748b;">Precio base: Q. ${v.precioBase.toLocaleString()}</div>

        ${estado === "activa" ? `
          <div id="ofertaAlert"></div>
          <form id="formPujar" style="margin-top:14px;">
            <div class="field">
              <label>Tu oferta (mínimo Q. ${(v.ofertaActual > 0 ? v.ofertaActual * 1.10 : v.precioBase).toLocaleString()})</label>
              <input type="number" id="montoOferta" min="${v.ofertaActual > 0 ? Math.ceil(v.ofertaActual * 1.10) : v.precioBase}" step="1" required>
            </div>
            <button class="btn" type="submit">Ofertar</button>
          </form>
        ` : ""}
      </div>
    </div>
  `;

  document.getElementById("btnPrevFoto").addEventListener("click", () => {
    indiceFoto = (indiceFoto - 1 + v.fotos.length) % v.fotos.length;
    pintarDetalle(v);
  });
  document.getElementById("btnNextFoto").addEventListener("click", () => {
    indiceFoto = (indiceFoto + 1) % v.fotos.length;
    pintarDetalle(v);
  });

  iniciarTimer(v.fechaCierre.toMillis());

  const formPujar = document.getElementById("formPujar");
  if (formPujar) {
    formPujar.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!requiereSesion()) return;
      const monto = Number(document.getElementById("montoOferta").value);
      try {
        await pujar(v.id, monto);
        // el onSnapshot repinta solo con el nuevo valor
      } catch (err) {
        document.getElementById("ofertaAlert").innerHTML = `<div class="alert error">${err.message}</div>`;
      }
    });
  }
}

let intervaloTimer = null;
function iniciarTimer(cierreMs) {
  if (intervaloTimer) clearInterval(intervaloTimer);
  const el = document.getElementById("timer");
  function tick() {
    if (!el) return;
    const restante = cierreMs - Date.now();
    if (restante <= 0) {
      el.textContent = "Subasta cerrada";
      clearInterval(intervaloTimer);
      return;
    }
    const h = Math.floor(restante / 3600000);
    const m = Math.floor((restante % 3600000) / 60000);
    const s = Math.floor((restante % 60000) / 1000);
    el.textContent = `⏱ Cierra en: ${h}h ${m}m ${s}s`;
  }
  tick();
  intervaloTimer = setInterval(tick, 1000);
}
