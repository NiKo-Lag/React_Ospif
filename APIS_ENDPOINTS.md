# Documentación de la API y Endpoints

Este documento proporciona una descripción detallada de todos los endpoints de la API del proyecto, sus funcionalidades, métodos HTTP, roles requeridos y parámetros esperados.

---

## 1. Módulo de Gestión Interna (Administradores y Auditores)

Endpoints relacionados con las tareas de los usuarios del sistema de gestión interna.

### 1.1. Autorizaciones (Generales)

Ruta base: `/api/autorizaciones`

#### `GET /api/autorizaciones`
- **Método:** `GET`
- **Descripción:** Obtiene una lista completa de **todas** las autorizaciones existentes en el sistema.
- **Rol Requerido:** *Sin restricción de rol en el endpoint* (pero la página que lo consume requiere rol `admin` o `auditor`).
- **Respuesta:**
  ```json
  [
    {
      "id": 1752867653780,
      "date": "22/07/2025",
      "type": "Práctica Médica",
      "title": "Consulta Cardiológica",
      "beneficiary": "Juan Perez",
      "status": "En Auditoría",
      "isImportant": false,
      "details": { "... (objeto JSON con detalles) ..." },
      "provider_name": "Hospital Central",
      "auditor_name": "Dr. Smith"
    }
  ]
  ```

#### `GET /api/autorizaciones/internas`
- **Método:** `GET`
- **Descripción:** Obtiene una lista combinada de **autorizaciones de prácticas médicas** y de **internaciones en estado 'INICIADA'**. Está diseñado específicamente para alimentar el tablero Kanban de la gestión interna. Normaliza los datos de ambos recursos para que puedan ser consumidos de manera uniforme por el frontend.
- **Rol Requerido:** `admin`, `auditor`, `operador`.
- **Respuesta:**
  ```json
  [
    {
      "id": 1752867653780,
      "date": "22/07/2025",
      "type": "Práctica Médica",
      "title": "Consulta Cardiológica",
      "beneficiary": "Juan Perez",
      "status": "En Auditoría",
      "isImportant": false,
      "provider_name": "Hospital Central",
      "auditor_name": "Dr. Smith",
      "requestType": "practice"
    },
    {
      "id": "12345678901234567",
      "date": "23/07/2025",
      "type": "Internación",
      "title": "Denuncia de Internación",
      "beneficiary": "Maria Lopez",
      "status": "Nuevas Solicitudes",
      "isImportant": false,
      "provider_name": "Clínica del Sol",
      "auditor_name": null,
      "requestType": "internment"
    }
  ]
  ```

#### `POST /api/autorizaciones`
- **Método:** `POST`
- **Descripción:** Crea una nueva solicitud de autorización. Registra automáticamente el evento "Solicitud creada" en la trazabilidad.
- **Rol Requerido:** Requiere una sesión de usuario válida. Usado por roles administrativos.
- **Cuerpo (FormData):**
  - `details` (String JSON): Un objeto que contiene los detalles de la autorización (`practice`, `beneficiaryData`, `justification`, etc.).
  - `attachment` (File, opcional): Un archivo adjunto.
  - `internment_id` (Number, opcional): ID de la internación asociada.
- **Respuesta:** Objeto JSON con los datos de la nueva autorización creada.

#### `PATCH /api/autorizaciones/[id]`
- **Método:** `PATCH`
- **Descripción:** Modifica el estado de una autorización existente. Registra automáticamente un evento de "Cambio de estado" en la trazabilidad.
- **Rol Requerido:** `admin` o `auditor`.
- **Parámetros de URL:**
  - `id`: El ID de la autorización a modificar.
- **Cuerpo (JSON):**
  ```json
  {
    "status": "En Auditoría"
  }
  ```
- **Respuesta:** Objeto JSON con los datos de la autorización actualizada.

### 1.2. Auditoría

Ruta base: `/api/auditor`

#### `GET /api/auditor/authorizations`
- **Método:** `GET`
- **Descripción:** Obtiene la lista de autorizaciones que están pendientes de revisión por un auditor. Actualmente, filtra solo por el estado `'En Auditoría'`.
- **Rol Requerido:** `auditor`.
- **Respuesta:** Un array de objetos de autorización, similar a `GET /api/autorizaciones`.

#### `PATCH /api/auditor/authorizations/[id]`
- **Método:** `PATCH`
- **Descripción:** Permite a un auditor procesar una autorización (aprobar, rechazar, devolver). Actualiza el estado, registra la fecha de auditoría, añade un comentario y un evento a la trazabilidad, y envía una notificación al prestador.
- **Rol Requerido:** `auditor`.
- **Parámetros de URL:**
  - `id`: El ID de la autorización a procesar.
- **Cuerpo (JSON):**
  ```json
  {
    "action": "Aprobar", // O "Rechazar", "Devolver"
    "comment": "El comentario del auditor es opcional."
  }
  ```
- **Respuesta:** Mensaje de éxito.

### 1.3. Gestión de Internaciones (Interna)

Ruta base: `/api/internments`

#### `POST /api/internments/[id]/send-to-audit`
- **Método:** `POST`
- **Descripción:** Inicia formalmente el proceso de auditoría para una internación. Esta acción crea una nueva `autorización` asociada a la internación (con estado `'En Auditoría'`) y actualiza el estado de la internación a `'EN AUDITORIA'`. Es una operación atómica.
- **Rol Requerido:** `admin` o `operador`.
- **Parámetros de URL:**
  - `id`: El ID de la internación que se enviará a auditoría.
- **Cuerpo:** No requiere cuerpo (body).
- **Respuesta:**
  ```json
  {
    "message": "La internación ha sido enviada a auditoría correctamente.",
    "authorizationId": 1753154462085
  }
  ```

#### `GET /api/internments/[id]`
- **Método:** `GET`
- **Descripción:** Obtiene los detalles completos de una internación específica. **Este endpoint es para uso exclusivo de la gestión interna** (`admin`, `auditor`, `operador`).
- **Rol Requerido:** `admin`, `auditor`, `operador`.
- **Parámetros de URL:**
  - `id`: El ID de la internación a consultar.
- **Respuesta:** Objeto JSON con la información completa de la internación, similar a la respuesta de `GET /api/portal/internments/[id]`.

### 1.4. Auditorías de Terreno

Ruta base: `/api/internments` y `/api/field-audits`

#### `POST /api/internments/[id]/field-audits`
- **Método:** `POST`
- **Descripción:** Permite a un usuario interno (operador/admin) solicitar una nueva auditoría de terreno para una internación específica y asignarla a un médico auditor. **NUEVO:** Incluye sistema de notificaciones de urgencia con indicadores visuales, notificaciones en plataforma y envío automático de correos electrónicos.
- **Rol Requerido:** `admin` o `operador`.
- **Parámetros de URL:**
  - `id`: El ID de la internación para la cual se solicita la auditoría.
- **Cuerpo (FormData):**
  ```json
  {
    "assignedAuditorId": 2,
    "requestReason": "Verificar cumplimiento de protocolo para paciente de alto riesgo.",
    "additionalComments": "Comentarios adicionales opcionales",
    "notifyProviderAfterHours": 48,
    "scheduledVisitDate": "2024-01-15",
    "isUrgent": true,
    "attachments": [File1, File2, ...]
  }
  ```
- **Funcionalidades de Urgencia:**
  - **Indicador Visual:** Si `isUrgent` es `true`, la auditoría se mostrará con un ícono de exclamación rojo y fondo rojizo en la interfaz.
  - **Notificación en Plataforma:** Se crea automáticamente un registro en la tabla `notifications` para el auditor asignado.
  - **Correo Electrónico:** Se envía un email urgente al auditor con formato HTML profesional.
- **Respuesta:**
  ```json
  {
    "message": "Solicitud de auditoría de terreno creada con éxito.",
    "auditId": 123456789
  }
  ```
- **Variables de Entorno Requeridas para Email:**
  - `EMAIL_SERVER_HOST`
  - `EMAIL_SERVER_PORT`
  - `EMAIL_SERVER_USER`
  - `EMAIL_SERVER_PASSWORD`
  - `EMAIL_FROM`

#### `PUT /api/field-audits/[audit_id]`
- **Método:** `PUT`
- **Descripción:** Permite al auditor asignado completar el informe de una auditoría de terreno que se encuentra en estado 'Pendiente'.
- **Rol Requerido:** `auditor` (debe ser el auditor asignado a esa auditoría específica).
- **Parámetros de URL:**
  - `audit_id`: El ID de la auditoría de terreno a completar.
- **Cuerpo (JSON):**
  ```json
  {
    "visitDate": "2025-10-26T10:00:00Z",
    "observations": "El paciente se encuentra estable. Se constata el correcto seguimiento de los protocolos de medicación.",
    "checklistData": { "notes": "Higiene de la habitación adecuada. Personal atento." }
  }
  ```
- **Respuesta:** Mensaje de éxito.

### 1.5. Gestión de Usuarios

#### `GET /api/users`
- **Método:** `GET`
- **Descripción:** Obtiene una lista de usuarios. **Actualmente, los datos están hardcodeados en el archivo y no provienen de la base de datos.**
- **Rol Requerido:** Ninguno (endpoint abierto).
- **Parámetros de Query:**
  - `role` (String, opcional): Filtra la lista de usuarios por el rol especificado (ej. `?role=auditor`).
- **Respuesta:**
  ```json
  [
    {
      "id": 1,
      "name": "Dr. Anibal Lecter",
      "role": "auditor"
    }
  ]
  ```

### 1.6. Gestión de Prestadores

#### `GET /api/prestadores/all`
- **Método:** `GET`
- **Descripción:** Obtiene una lista simplificada (`id`, `razonsocial`) de todos los prestadores cuyo estado es `'activo'`.
- **Rol Requerido:** Ninguno (endpoint abierto).
- **Respuesta:**
  ```json
  [
    {
      "id": 1,
      "razonsocial": "Hospital Central"
    },
    {
      "id": 2,
      "razonsocial": "Clínica del Sol"
    }
  ]
  ```

---

## 2. Portal de Prestadores

Endpoints utilizados por la interfaz del portal de prestadores.

Ruta base: `/api/portal`

### 2.1. Gestión de Internaciones

#### `GET /api/portal/internments-panel`
- **Método:** `GET`
- **Descripción:** Obtiene la lista de todas las internaciones asociadas al prestador autenticado. Usado para alimentar el panel principal del prestador.
- **Rol Requerido:** `provider`.
- **Respuesta:** Un array de objetos de internación simplificados.

#### `POST /api/portal/internments`
- **Método:** `POST`
- **Descripción:** Crea una nueva denuncia de internación, incluyendo la subida de archivos iniciales.
- **Rol Requerido:** Cualquier usuario autenticado (la lógica interna asigna la internación al prestador correcto).
- **Cuerpo (FormData):**
  - `details` (String JSON): Objeto con los datos de la internación.
  - `files` (Array de Files): Documentación inicial.
- **Respuesta:** Mensaje de éxito con el ID de la nueva internación.

#### `GET /api/portal/internments/[id]`
- **Método:** `GET`
- **Descripción:** Obtiene los detalles completos de una internación específica, incluyendo su historial de prácticas asociadas y las auditorías de terreno cuyo período de embargo haya finalizado.
- **Rol Requerido:** `provider`.
- **Parámetros de URL:**
  - `id`: El ID de la internación.
- **Respuesta:** Un objeto JSON con todos los datos de la internación.

#### `PATCH /api/portal/internments/[id]/finalize`
- **Método:** `PATCH`
- **Descripción:** Finaliza una internación que se encuentra en estado `'ACTIVA'`.
- **Rol Requerido:** `provider` (debe ser el prestador asociado a la internación).
- **Cuerpo (JSON):**
  ```json
  {
    "egreso_date": "2025-12-31T23:59:59Z",
    "egreso_reason": "Alta médica"
  }
  ```
- **Respuesta:** Mensaje de éxito.

#### `POST /api/portal/internments/[id]/request-budget`
- **Método:** `POST`
- **Descripción:** Permite a un prestador solicitar un presupuesto para una internación, adjuntando documentación.
- **Rol Requerido:** `provider`.
- **Cuerpo (FormData):**
  - `budgetData` (String JSON): Objeto con los detalles del presupuesto.
  - `files` (Array de Files): Documentos del presupuesto.
- **Respuesta:** Mensaje de éxito.

#### `PATCH /api/portal/internments/[id]/request-extension`
- **Método:** `PATCH`
- **Descripción:** Permite a un prestador solicitar una prórroga para una internación. Si la internación estaba `'INICIADA'`, la cambia a `'ACTIVA'`.
- **Rol Requerido:** `provider`.
- **Cuerpo (JSON):**
  ```json
  {
    "requestedDays": 5,
    "reason": "Motivo de la prórroga",
    "requestingDoctor": "Dr. Ejemplo",
    "observations": "Observaciones adicionales"
  }
  ```
- **Respuesta:** Mensaje de éxito.

#### `PATCH /api/portal/internments/[id]/upload`
- **Método:** `PATCH`
- **Descripción:** Sube archivos adicionales a una internación existente.
- **Rol Requerido:** Cualquier usuario autenticado.
- **Cuerpo (FormData):**
  - `files` (Array de Files): Los archivos a subir.
- **Respuesta:** Mensaje de éxito y la lista actualizada de la documentación.

#### `POST /api/portal/internments/[id]/add-observation`
- **Método:** `POST`
- **Descripción:** Añade un nuevo mensaje al chat de observaciones de una internación.
- **Rol Requerido:** Cualquier usuario autenticado.
- **Cuerpo (JSON):**
  ```json
  {
    "message": "Este es un mensaje de prueba.",
    "replyTo": "obs_1753154462085" // ID del mensaje al que se responde (opcional)
  }
  ```
- **Respuesta:** El array completo y actualizado de observaciones.

### 2.2. Autorizaciones del Prestador

#### `GET /api/portal/my-authorizations`
- **Método:** `GET`
- **Descripción:** Obtiene la lista de autorizaciones **aprobadas** (`'Autorizadas'`) para el prestador autenticado.
- **Rol Requerido:** `provider`.
- **Respuesta:** Un array de objetos de autorización simplificados.

### 2.3. Notificaciones del Prestador

#### `GET /api/portal/notifications`
- **Método:** `GET`
- **Descripción:** Obtiene todas las notificaciones para el prestador autenticado.
- **Rol Requerido:** `provider`.
- **Respuesta:** Un array de objetos de notificación.

---

## 3. Endpoints Generales y de Utilidad

### 3.1. Dashboard

#### `GET /api/dashboard`
- **Método:** `GET`
- **Descripción:** Obtiene los datos agregados para el dashboard principal. La información devuelta depende del rol del usuario.
- **Rol Requerido:** Cualquier usuario autenticado.
- **Respuesta:** Un objeto JSON con varias listas de datos (ej. `pendingActions`, `authorizations`, etc.).

### 3.2. Gestión de Archivos

#### `GET /api/files/[filename]`
- **Método:** `GET`
- **Descripción:** Sirve un archivo almacenado en el directorio `storage/` del servidor.
- **Rol Requerido:** Cualquier usuario autenticado.
- **Parámetros de URL:**
  - `filename`: El nombre del archivo a obtener.
- **Respuesta:** El contenido del archivo. 

### 3.3. Compartir Recursos

Endpoints diseñados para generar enlaces públicos y de solo lectura a recursos específicos.

#### `POST /api/share`
- **Método:** `POST`
- **Descripción:** Genera (o recupera si ya existe) un token único y seguro para compartir un recurso específico. Es escalable para cualquier tipo de recurso.
- **Rol Requerido:** `admin`, `auditor`, `operador`.
- **Cuerpo (JSON):**
  ```json
  {
    "resourceType": "internment",
    "resourceId": "1753154462085"
  }
  ```
- **Respuesta:**
  ```json
  {
    "token": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
  }
  ```

#### `GET /api/public/share/[token]`
- **Método:** `GET`
- **Descripción:** Endpoint público y no autenticado que devuelve los datos de solo lectura de un recurso compartido a partir de su token.
- **Rol Requerido:** Ninguno (Público).
- **Parámetros de URL:**
  - `token`: El token único generado por el endpoint `POST /api/share`.
- **Respuesta:**
  ```json
  {
    "resourceType": "internment",
    "data": {
      "id": "1753154462085",
      "beneficiary_name": "Juan Perez",
      "... (resto de los datos de la internación) ..."
    }
  }
  ```

---

## 3.4. Sistema de Correos Electrónicos

### Módulo de Email (`src/lib/email.js`)

#### Función `sendMail(options)`
- **Descripción:** Función reutilizable para el envío de correos electrónicos a través del servidor SMTP de Donweb.
- **Parámetros:**
  ```javascript
  {
    to: "destinatario@email.com",
    subject: "Asunto del correo",
    text: "Versión en texto plano",
    html: "<h1>Versión HTML</h1>"
  }
  ```
- **Configuración SMTP:**
  - **Servidor:** `c2851035.ferozo.com`
  - **Puerto:** `465` (SSL)
  - **Cuenta:** `contacto@synapsys.site`
  - **Seguridad:** Conexión SSL/TLS
- **Manejo de Errores:** La función no interrumpe el flujo principal si el envío falla, solo registra el error en consola.
- **Uso Interno:** Utilizada por el endpoint de auditorías urgentes para enviar notificaciones automáticas.

---

## 4. Tareas Automatizadas (Cron Jobs)

Estos endpoints están diseñados para ser llamados por un servicio externo de cron (como Vercel Cron o EasyCron) de forma programada. Requieren un token de autorización `Bearer` para ser ejecutados.

Ruta base: `/api/cron`

### 4.1. Inactivación de Internaciones

#### `GET /api/cron/inactivate-internments`
- **Método:** `GET`
- **Descripción:** Busca todas las internaciones con estado `'INICIADA'`. Si han pasado más de 48 horas hábiles desde su creación, cambia su estado a `'INACTIVA'` y añade una nota del sistema.
- **Autorización:** Requiere `Authorization: Bearer [CRON_SECRET]`.
- **Respuesta:**
  ```json
  {
    "message": "Cron job de inactivación ejecutado.",
    "inactivated": 1 // Número de internaciones inactivadas
  }
  ```

### 4.2. Finalización de Internaciones

#### `GET /api/cron/finalize-internments`
- **Método:** `GET`
- **Descripción:** Busca internaciones `'Activa'`s que no tengan solicitudes de prórroga. Si han pasado más de 48 horas hábiles desde su creación, las cambia a `'Finalizada'`. Si han pasado más de 24 horas, envía una notificación de advertencia al prestador.
- **Autorización:** Requiere `Authorization: Bearer [CRON_SECRET]`.
- **Respuesta:**
  ```json
  {
    "message": "Cron job ejecutado.",
    "finalized": 0, // Número de internaciones finalizadas
    "notified": 1   // Número de notificaciones enviadas
  }
  ``` 

---

## 5. Integraciones Externas

Endpoints que actúan como intermediarios (proxies) para comunicarse con servicios de terceros.

### 5.1. Padrón de Beneficiarios (SAAS)

#### `GET /api/beneficiary/[cuil]`
- **Método:** `GET`
- **Descripción:** Consulta un servicio externo (SAAS) para obtener los datos de un beneficiario a partir de su CUIL. Antes de la consulta, se autentica contra el servicio SAAS para obtener un token temporal. Realiza una normalización de datos para corregir inconsistencias (ej. nombres faltantes).
- **Rol Requerido:** Cualquier usuario autenticado.
- **Parámetros de URL:**
  - `cuil`: El CUIL de 11 dígitos del beneficiario a consultar.
- **Respuesta:**
  ```json
  {
    "cuil": "20123456789",
    "nombre": "PEREZ, JUAN CARLOS",
    "activo": true,
    // ... otros datos del beneficiario
  }
  ```
- **Variables de Entorno Requeridas:**
  - `SAAS_API_URL`
  - `SAAS_API_AUTH_HEADER`
  - `SAAS_USERNAME`
  - `SAAS_PASSWORD` 

---

## 6. Autenticación

Endpoints y lógica relacionados con la autenticación y gestión de sesiones de usuarios, manejados por NextAuth.js.

### 6.1. Endpoint de NextAuth

#### `GET /api/auth/[...nextauth]`
#### `POST /api/auth/[...nextauth]`

- **Descripción:** Este es un endpoint "catch-all" gestionado por la librería `NextAuth.js`. Maneja todas las operaciones de autenticación, como el inicio de sesión (`/api/auth/signin`), cierre de sesión (`/api/auth/signout`), obtención de la sesión del cliente (`/api/auth/session`), etc.
- **Lógica de `authorize`:**
  1.  Recibe `email` y `password`.
  2.  Busca primero al usuario en la tabla `prestadores`.
  3.  Si no lo encuentra, busca en la tabla `users` (para roles internos como `admin` y `auditor`).
  4.  Compara la contraseña recibida con el hash almacenado en la base de datos usando `bcrypt`.
  5.  Si la autenticación es exitosa, devuelve un objeto de usuario con `id`, `email`, `name` y `role`.
- **Callbacks de Sesión:**
  - `jwt`: Inyecta el `id` y `role` del usuario en el token JWT después del login.
  - `session`: Expone el `id` y `role` desde el token a la sesión del cliente, haciéndolos accesibles en toda la aplicación.
- **Página de Login:**
  - Redirige a los usuarios no autenticados a la página unificada `/login`. 

### 6.2. Cierre de Sesión (Endpoint Manual)

#### `POST /api/logout`
- **Método:** `