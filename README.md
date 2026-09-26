# Copart GT - Plataforma de Subastas de Vehículos en Tiempo Real

**Sitio publicado:** [PEGAR AQUÍ EL LINK DESPUÉS DE DESPLEGAR]

## Usuarios de prueba (para pujas cruzadas entre navegadores)

| Correo | Contraseña |
|---|---|
| prueba1@copart.com | Prueba123 |
| prueba2@copart.com | Prueba123 |
| prueba3@copart.com | Prueba123 |

(Creados manualmente en Firebase Console > Authentication > Users > Add user.
También hay que crearles su documento en la colección `usuarios` con nombre/apellido/correo/teléfono,
o simplemente registrarlos usando el formulario de "Registrarme" del sitio.)

## Stack

- Frontend: SPA en JavaScript puro (sin framework/bundler) con ruteo por hash
- Backend/Datos: Firebase (Auth + Firestore + Storage)
- Tiempo real: listeners de Firestore (`onSnapshot`), sin WebSockets manuales
- Validación de pujas: reforzada en `firestore.rules` (servidor), además de validación en cliente

## Cómo desplegar (una sola vez)

1. Entrá a https://console.firebase.google.com y creá un proyecto nuevo.
2. Habilitá **Authentication > Sign-in method > Correo/contraseña**.
3. Creá una base de datos **Firestore** (modo producción).
4. Habilitá **Storage**.
5. En **Configuración del proyecto > General > Tus apps**, agregá una app Web y copiá el objeto `firebaseConfig`.
6. Pegá esa configuración en `public/js/firebase-config.js`.
7. En tu máquina, con Node instalado:
   ```
   npm install -g firebase-tools
   firebase login
   ```
8. Editá `.firebaserc` y poné el Project ID real (lo ves en la consola de Firebase).
9. Desde la carpeta del proyecto:
   ```
   firebase deploy
   ```
10. Firebase te da la URL pública (tipo `https://tu-proyecto.web.app`). Pegala arriba en este README.
11. Creá los 3 usuarios de prueba (registro normal desde el sitio, o desde la consola de Firebase).
