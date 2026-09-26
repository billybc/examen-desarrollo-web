# Copart GT - Plataforma de Subastas de Vehículos en Tiempo Real

**Sitio publicado:** https://copart-billy.web.app

## Usuarios de prueba (para pujas cruzadas entre navegadores)

| Correo | Contraseña |
|---|---|
| bcardonal1@miumg.edu.gt | Prueba123 |
| tezo1@miumg.edu.gt | Prueba123 |
| beduardol1@miumg.edu.gt | Prueba123 |

*(Creados mediante el formulario de registro de la plataforma o en Firebase Console > Authentication).*

## Stack

- Frontend: SPA en JavaScript puro (sin framework/bundler) con ruteo por hash[cite: 4, 11]
- Backend/Datos: Firebase (Auth + Firestore)[cite: 3, 4, 11]
- Tiempo real: Listeners de Firestore (`onSnapshot`), sin WebSockets manuales[cite: 4, 11]
- Validación de pujas: Reforzada en `firestore.rules` (servidor) y validación en cliente[cite: 4, 11]
