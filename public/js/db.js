/* ============================================================
   db.js - capa de acceso a datos (Firestore sin Storage)
   ============================================================ */

/* ---------- Compresión y Conversión de Fotos a Base64 ---------- */
function convertirArchivoABase64Comprimido(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        // Genera imagen JPEG ligera al 50% de calidad
        const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

async function procesarFotosBase64(archivos) {
  const promesas = Array.from(archivos).map((file) => convertirArchivoABase64Comprimido(file));
  return Promise.all(promesas);
}

/* ---------- Usuarios ---------- */
function crearPerfilUsuario(uid, { nombre, apellido, correo, telefono }) {
  return db.collection("usuarios").doc(uid).set({
    nombre,
    apellido,
    correo,
    telefono,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function obtenerPerfilUsuario(uid) {
  const snap = await db.collection("usuarios").doc(uid).get();
  return snap.exists ? snap.data() : null;
}

/* ---------- Vehículos ---------- */
async function crearVehiculo(datos, archivosFotos) {
  const uid = auth.currentUser.uid;
  const ref = db.collection("vehiculos").doc();

  // Convertir fotografías a Base64 sin usar Firebase Storage
  const fotos = await procesarFotosBase64(archivosFotos);

  await ref.set({
    ...datos,
    publicadorUid: uid,
    fotos,
    ofertaActual: 0,
    ofertaActualUid: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  return ref.id;
}

async function actualizarVehiculo(id, datos, archivosFotosNuevas) {
  const uid = auth.currentUser.uid;
  const cambios = { ...datos };
  if (archivosFotosNuevas && archivosFotosNuevas.length > 0) {
    const nuevas = await procesarFotosBase64(archivosFotosNuevas);
    cambios.fotos = firebase.firestore.FieldValue.arrayUnion(...nuevas);
  }
  return db.collection("vehiculos").doc(id).update(cambios);
}

async function listarVehiculos() {
  const snap = await db.collection("vehiculos").orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function listarMisVehiculos(uid) {
  const snap = await db.collection("vehiculos").where("publicadorUid", "==", uid).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function obtenerVehiculoRealtime(id, callback) {
  return db.collection("vehiculos").doc(id).onSnapshot((snap) => {
    if (snap.exists) callback({ id: snap.id, ...snap.data() });
  });
}

/* ---------- Motor de Subasta ---------- */
async function pujar(vehiculoId, monto) {
  const ref = db.collection("vehiculos").doc(vehiculoId);
  const uid = auth.currentUser.uid;

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const ahora = Date.now();

    if (ahora >= data.fechaCierre.toMillis()) {
      throw new Error("La subasta ya cerró.");
    }
    if (monto < data.precioBase) {
      throw new Error(`La oferta no puede ser menor al precio base (Q. ${data.precioBase}).`);
    }
    if (data.ofertaActual > 0 && monto < data.ofertaActual * 1.1) {
      throw new Error(
        `La oferta debe superar la actual por al menos 10% (mínimo Q. ${(data.ofertaActual * 1.1).toFixed(2)}).`
      );
    }

    tx.update(ref, {
      ofertaActual: monto,
      ofertaActualUid: uid,
      ultimaPujaAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  });
}

function estadoDeSubasta(v) {
  const ahora = Date.now();
  const cierre = v.fechaCierre.toMillis ? v.fechaCierre.toMillis() : v.fechaCierre;
  if (ahora < cierre) return "activa";
  return v.ofertaActual >= v.precioBase ? "vendido" : "desierta";
}