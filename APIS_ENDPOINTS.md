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
- **Descripción:** Obtiene una lista combinada de **autorizaciones de prácticas médicas**, **internaciones en estado 'INICIADA'** y **órdenes de medicación**. Está diseñado específicamente para alimentar el tablero Kanban de la gestión interna. Normaliza los datos de todos los recursos para que puedan ser consumidos de manera uniforme por el frontend.
- **Rol Requerido:** `admin`, `auditor`, `operador`.
- **Parámetros de Query (Opcionales):**
  - `dateFrom` (String): Fecha desde en formato `YYYY-MM-DD`
  - `dateTo` (String): Fecha hasta en formato `YYYY-MM-DD`
  - `status` (String): Estado de la solicitud (solo aplica a autorizaciones)
  - `cuil` (String): CUIL del beneficiario para búsqueda parcial
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
    },
    {
      "id": "98765432109876543",
      "date": "24/07/2025",
      "type": "Medicación",
      "title": "Orden de Medicación",
      "beneficiary": "Carlos Rodriguez",
      "status": "Creada",
      "isImportant": false,
      "provider_name": null,
      "auditor_name": null,
      "requestType": "medication",
      "items_count": 1,
      "total_quotations_count": 0,
      "completed_quotations_count": 0
    }
  ]
  ```
- **Filtros Implementados:**
  - **Fecha desde/hasta:** Aplica a todas las consultas
  - **Estado:** Solo aplica a autorizaciones de prácticas médicas
  - **CUIL:** Búsqueda parcial en todas las consultas usando `ILIKE`
- **Logs de Debugging:** Incluye logs detallados para trazabilidad
- **Campos Adicionales para Medicación:**
  - `high_cost` (BOOLEAN): Indica si es medicación de alto coste
  - `quotation_status` (VARCHAR): Estado del proceso de cotización
  - `audit_required` (BOOLEAN): Si requiere auditoría médica

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

## 3.5. Sistema de Gestión de Medicación

Endpoints para el manejo completo del flujo de trabajo de solicitudes de medicación, incluyendo órdenes, cotizaciones y autorizaciones.

### 3.5.1. Gestión de Órdenes de Medicación

#### `POST /api/medication-orders`
- **Método:** `POST`
- **Descripción:** Crea una nueva orden de medicación con múltiples items de medicamentos. **CORREGIDO:** Ahora crea una solicitud separada por cada item de medicación en la tabla `medication_requests`.
- **Rol Requerido:** `admin`, `operador`.
- **Cuerpo (JSON):**
  ```json
  {
    "beneficiaryName": "Juan Pérez",
    "beneficiaryCuil": "20-12345678-9",
    "diagnosis": "Diabetes tipo 2",
    "requestingDoctor": "Dr. García",
    "urgencyLevel": "Normal",
    "specialObservations": "Observaciones especiales",
    "highCost": false,
    "quotationDeadlineHours": 48,
    "items": [
      {
        "medicationName": "Metformina",
        "dosage": "500mg",
        "quantity": 30,
        "unit": "comprimidos",
        "specialInstructions": "Tomar con las comidas",
        "priority": 1
      }
    ],
    "attachments": []
  }
  ```
- **Respuesta:**
  ```json
  {
    "message": "Orden de medicación creada con éxito.",
    "orders": [
      {
        "id": "123",
        "medication_name": "Metformina",
        "dosage": "500mg",
        "quantity": 30,
        "unit": "comprimidos",
        "beneficiary_name": "Juan Pérez",
        "status": "Creada",
        "isHighCost": false,
        "requiresQuotation": false,
        "requiresAudit": false
      }
    ]
  }
  ```
- **Notas Importantes:**
  - **Estructura Corregida:** Cada item de medicación se crea como una solicitud separada
  - **Alto Coste:** Campo `highCost` determina el flujo de trabajo
  - **Estados Iniciales:** "En Cotización" (alto coste) o "Pendiente de Revisión" (normal)
  - **Detección Automática:** Sistema detecta automáticamente medicamentos de alto coste
  - **Estados Permitidos:** Solo los estados definidos en la restricción `check_request_status` son válidos

#### `GET /api/medication-orders`
- **Método:** `GET`
- **Descripción:** Lista todas las órdenes de medicación con filtros y paginación.
- **Rol Requerido:** `admin`, `auditor`, `operador`.
- **Parámetros de Query:**
  - `status` (String, opcional): Filtra por estado de la orden
  - `page` (Number, opcional): Número de página (default: 1)
  - `limit` (Number, opcional): Resultados por página (default: 20)
- **Respuesta:**
  ```json
  {
    "orders": [
      {
        "id": "123",
        "beneficiaryName": "Juan Pérez",
        "diagnosis": "Diabetes tipo 2",
        "status": "En Cotización",
        "items_count": 2,
        "total_quotations_count": 6,
        "completed_quotations_count": 4
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
  ```

### 3.5.2. Envío a Cotización

#### `POST /api/medication-orders/[id]/send-to-quotation`
- **Método:** `POST`
- **Descripción:** Envía una orden de medicación a múltiples droguerías para cotización, generando tokens únicos y enviando notificaciones por email.
- **Rol Requerido:** `admin`, `operador`.
- **Parámetros de URL:**
  - `id`: ID de la orden de medicación
- **Cuerpo (JSON):**
  ```json
  {
    "pharmacyIds": [1, 2, 3]
  }
  ```
- **Funcionalidades:**
  - Crea registros de cotización para cada item y droguería
  - Genera tokens únicos para acceso público
  - Envía emails automáticos a las droguerías
  - Actualiza estado de la orden a 'En Cotización'
- **Respuesta:**
  ```json
  {
    "message": "Orden enviada a cotización exitosamente.",
    "quotationsCreated": 6,
    "pharmaciesNotified": 3
  }
  ```

### 3.5.3. Cotizaciones Públicas (Droguerías)

#### `GET /api/public/medication-quotation/[token]`
- **Método:** `GET`
- **Descripción:** Endpoint público para que las droguerías vean los detalles de una cotización pendiente.
- **Rol Requerido:** Ninguno (Público).
- **Parámetros de URL:**
  - `token`: Token único de la cotización
- **Respuesta:**
  ```json
  {
    "message": "Cotización pendiente de completar.",
    "quotation": {
      "id": "789",
      "status": "Pendiente",
      "tokenExpiresAt": "2024-01-22T10:00:00Z"
    },
    "item": {
      "medicationName": "Metformina",
      "dosage": "500mg",
      "quantity": 30,
      "unit": "comprimidos"
    },
    "order": {
      "beneficiaryName": "Juan Pérez",
      "diagnosis": "Diabetes tipo 2",
      "requestingDoctor": "Dr. García"
    },
    "pharmacy": {
      "name": "Farmacia Central",
      "contactPerson": "María López"
    }
  }
  ```

#### `POST /api/public/medication-quotation/[token]`
- **Método:** `POST`
- **Descripción:** Permite a las droguerías enviar su cotización con precios y condiciones.
- **Rol Requerido:** Ninguno (Público).
- **Parámetros de URL:**
  - `token`: Token único de la cotización
- **Cuerpo (JSON):**
  ```json
  {
    "unitPrice": 15.50,
    "totalPrice": 465.00,
    "availability": "24hs",
    "deliveryTime": "Entrega en sucursal",
    "commercialConditions": "Pago a 30 días",
    "observations": "Medicamento disponible en stock"
  }
  ```
- **Funcionalidades:**
  - Valida que la cotización esté pendiente y no haya expirado
  - Actualiza el estado a 'Cotizada'
  - Envía notificación automática al operador
- **Respuesta:**
  ```json
  {
    "message": "Cotización enviada exitosamente.",
    "quotation": {
      "id": "789",
      "status": "Cotizada",
      "totalPrice": 465.00
    }
  }
  ```

### 3.5.4. Gestión de Cotizaciones

#### `GET /api/medication-orders/[id]/quotations`
- **Método:** `GET`
- **Descripción:** Obtiene todas las cotizaciones de una orden específica con estadísticas detalladas.
- **Rol Requerido:** `admin`, `auditor`, `operador` (solo creador o auditores).
- **Parámetros de URL:**
  - `id`: ID de la orden de medicación
- **Respuesta:**
  ```json
  {
    "order": {
      "id": "123",
      "beneficiaryName": "Juan Pérez",
      "status": "En Cotización"
    },
    "items": [
      {
        "id": "456",
        "medicationName": "Metformina",
        "quotations_count": 3,
        "completed_quotations_count": 2
      }
    ],
    "quotations": [
      {
        "id": "789",
        "unitPrice": 15.50,
        "totalPrice": 465.00,
        "status": "Cotizada",
        "pharmacy": {
          "name": "Farmacia Central",
          "contactPerson": "María López"
        }
      }
    ],
    "quotationsByItem": {
      "456": [...]
    },
    "statistics": {
      "totalQuotations": 6,
      "completedQuotations": 4,
      "completionRate": 66.67,
      "priceRanges": {
        "456": {
          "min": 450.00,
          "max": 520.00,
          "average": 485.00
        }
      }
    }
  }
  ```

### 3.5.5. Autorización de Cotizaciones

#### `POST /api/medication-orders/[id]/authorize`
- **Método:** `POST`
- **Descripción:** Permite a los auditores médicos autorizar una cotización específica, completando el flujo de trabajo.
- **Rol Requerido:** `admin`, `auditor`.
- **Parámetros de URL:**
  - `id`: ID de la orden de medicación
- **Cuerpo (JSON):**
  ```json
  {
    "authorizedQuotationId": "789",
    "authorizationNotes": "Mejor precio y disponibilidad inmediata",
    "authorizationType": "full"
  }
  ```
- **Funcionalidades:**
  - Verifica que todas las cotizaciones estén completadas
  - Marca la cotización seleccionada como 'Autorizada'
  - Marca las demás como 'Rechazada'
  - Actualiza el estado de la orden a 'Autorizada'
  - Envía notificaciones automáticas al operador y droguería
- **Respuesta:**
  ```json
  {
    "message": "Orden autorizada exitosamente.",
    "order": {
      "id": "123",
      "status": "Autorizada",
      "authorizedQuotation": {
        "id": "789",
        "pharmacy": {
          "name": "Farmacia Central"
        },
        "totalPrice": 465.00
      }
    }
  }
  ```

### 3.5.6. Gestión de Droguerías

#### `GET /api/pharmacies`
- **Método:** `GET`
- **Descripción:** Lista todas las droguerías con filtros, paginación y estadísticas de rendimiento.
- **Rol Requerido:** `admin`, `auditor`, `operador`.
- **Parámetros de Query:**
  - `isActive` (Boolean, opcional): Filtra por estado activo
  - `search` (String, opcional): Búsqueda en nombre, contacto y email
  - `page` (Number, opcional): Número de página
  - `limit` (Number, opcional): Resultados por página
- **Respuesta:**
  ```json
  {
    "pharmacies": [
      {
        "id": "1",
        "name": "Farmacia Central",
        "email": "ventas@farmaciacentral.com",
        "contactPerson": "María López",
        "isActive": true,
        "total_quotations": 15,
        "authorized_quotations": 8,
        "success_rate": 53
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2
    }
  }
  ```

#### `POST /api/pharmacies`
- **Método:** `POST`
- **Descripción:** Crea una nueva droguería en el sistema.
- **Rol Requerido:** `admin`, `operador`.
- **Cuerpo (JSON):**
  ```json
  {
    "name": "Farmacia Central",
    "email": "ventas@farmaciacentral.com",
    "phone": "+54 11 1234-5678",
    "address": "Av. Corrientes 1234, CABA",
    "contactPerson": "María López",
    "isActive": true
  }
  ```
- **Respuesta:**
  ```json
  {
    "message": "Droguería creada exitosamente.",
    "pharmacy": {
      "id": "1",
      "name": "Farmacia Central",
      "email": "ventas@farmaciacentral.com"
    }
  }
  ```

#### `GET /api/pharmacies/[id]`
- **Método:** `GET`
- **Descripción:** Obtiene información detallada de una droguería específica con historial de cotizaciones.
- **Rol Requerido:** `admin`, `auditor`, `operador`.
- **Parámetros de URL:**
  - `id`: ID de la droguería
- **Respuesta:**
  ```json
  {
    "pharmacy": {
      "id": "1",
      "name": "Farmacia Central",
      "total_quotations": 15,
      "authorized_quotations": 8,
      "pending_quotations": 3,
      "rejected_quotations": 4,
      "success_rate": 53
    },
    "recentQuotations": [
      {
        "id": "789",
        "status": "Autorizada",
        "totalPrice": 465.00,
        "medicationName": "Metformina"
      }
    ],
    "statistics": {
      "totalQuotations": 15,
      "authorizedQuotations": 8,
      "successRate": 53
    }
  }
  ```

#### `PUT /api/pharmacies/[id]`
- **Método:** `PUT`
- **Descripción:** Actualiza los datos de una droguería existente.
- **Rol Requerido:** `admin`, `operador`.
- **Parámetros de URL:**
  - `id`: ID de la droguería
- **Cuerpo (JSON):** Mismos campos que POST
- **Respuesta:**
  ```json
  {
    "message": "Droguería actualizada exitosamente.",
    "pharmacy": {
      "id": "1",
      "name": "Farmacia Central Actualizada"
    }
  }
  ```

#### `DELETE /api/pharmacies/[id]`
- **Método:** `DELETE`
- **Descripción:** Desactiva una droguería (soft delete) si no tiene cotizaciones activas.
- **Rol Requerido:** `admin`.
- **Parámetros de URL:**
  - `id`: ID de la droguería
- **Validaciones:**
  - Verifica que no tenga cotizaciones pendientes o cotizadas
  - Realiza soft delete (marca como inactiva)
- **Respuesta:**
  ```json
  {
    "message": "Droguería desactivada exitosamente.",
    "pharmacy": {
      "id": "1",
      "isActive": false
    }
  }
  ```

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

---

## 7. Sistema de Filtros

### 7.1. Filtros en Autorizaciones Internas

#### Implementación de Filtros en `/api/autorizaciones/internas`
- **Descripción:** Sistema de filtros avanzado para la página de autorizaciones internas
- **Parámetros Soportados:**
  - `dateFrom`: Fecha desde en formato `YYYY-MM-DD`
  - `dateTo`: Fecha hasta en formato `YYYY-MM-DD` (se agrega `23:59:59`)
  - `status`: Estado de la solicitud (solo aplica a autorizaciones)
  - `cuil`: CUIL del beneficiario para búsqueda parcial

#### Lógica de Filtrado por Tipo de Consulta
- **Autorizaciones (`authorizations`):**
  - ✅ Filtro por fecha: `a.created_at >= dateFrom` y `a.created_at <= dateTo`
  - ✅ Filtro por estado: `a.status = status`
  - ✅ Filtro por CUIL: `a.beneficiary_cuil ILIKE %cuil%`

- **Internaciones (`internments`):**
  - ✅ Filtro por fecha: `i.created_at >= dateFrom` y `i.created_at <= dateTo`
  - ❌ Filtro por estado: No aplica (siempre `i.status = 'INICIADA'`)
  - ✅ Filtro por CUIL: `i.beneficiary_cuil ILIKE %cuil%`

- **Medicación (`medication_requests`):**
  - ✅ Filtro por fecha: `mr.created_at >= dateFrom` y `mr.created_at <= dateTo`
  - ❌ Filtro por estado: No aplica (estados específicos: Creada, En Cotización, etc.)
  - ✅ Filtro por CUIL: `mr.beneficiary_cuil ILIKE %cuil%`

#### Características Técnicas
- **Parámetros Preparados:** Uso de `$1`, `$2`, etc. para prevenir SQL injection
- **Búsqueda Parcial:** Uso de `ILIKE` con `%` para búsquedas flexibles
- **Logs Detallados:** Trazabilidad completa de filtros aplicados
- **Función Helper:** `buildWhereConditions()` para construcción dinámica de SQL

#### Base de Datos
- **Columna Agregada:** `beneficiary_cuil VARCHAR(20)` en tabla `authorizations`
- **Propósito:** Permitir filtrado por CUIL en autorizaciones
- **Compatibilidad:** Formato CUIL argentino (XX-XXXXXXXX-X)

### 6.2. Cierre de Sesión (Endpoint Manual)

#### `POST /api/logout`
- **Método:** `POST`
- **Descripción:** Endpoint manual para cerrar sesión, complementario a NextAuth.js
- **Rol Requerido:** Cualquier usuario autenticado
- **Respuesta:** Redirección a página de login

---

## 7. Sistema de Medicación de Alto Coste

### 7.1. Creación de Órdenes de Medicación

#### `POST /api/medication-orders`
- **Método:** `POST`
- **Descripción:** Crea órdenes de medicación con soporte para alto coste
- **Rol Requerido:** `admin`, `operador`
- **Nuevos Campos:**
  - `highCost` (BOOLEAN): Indica si es medicación de alto coste
  - Detección automática basada en lista de medicamentos de alto coste
- **Estados Iniciales:**
  - **Alto Coste:** "Pendiente de Cotización"
  - **Normal:** "Enviada a Auditoría"
- **Respuesta:**
  ```json
  {
    "message": "Orden de medicación creada con éxito.",
    "order": {
      "id": "123",
      "status": "Pendiente de Cotización",
      "isHighCost": true,
      "requiresQuotation": true,
      "requiresAudit": true,
      "items": [...]
    }
  }
  ```

### 7.2. Envío a Cotización

#### `POST /api/medication-orders/[id]/send-to-quotation`
- **Método:** `POST`
- **Descripción:** Envía orden de alto coste a cotización con múltiples farmacias
- **Rol Requerido:** `admin`, `operador`
- **Parámetros:**
  - `pharmacyIds` (ARRAY): Lista de IDs de farmacias (mínimo 3)
- **Características:**
  - Control de tiempo de 48 horas
  - Generación de tokens únicos por cotización
  - Mínimo 3 farmacias requeridas
  - Estado: "En Cotización"
- **Respuesta:**
  ```json
  {
    "message": "Orden enviada a cotización exitosamente.",
    "orderId": "123",
    "pharmaciesCount": 3,
    "deadline": "2024-12-21T10:00:00Z",
    "status": "En Cotización"
  }
  ```

### 7.3. Verificación de Estado de Cotizaciones

#### `GET /api/medication-orders/[id]/send-to-quotation`
- **Método:** `GET`
- **Descripción:** Verifica estado de cotizaciones de una orden
- **Rol Requerido:** `admin`, `operador`, `auditor`
- **Respuesta:**
  ```json
  {
    "order": {
      "id": "123",
      "high_cost": true,
      "quotation_status": "sent",
      "quotation_deadline": "2024-12-21T10:00:00Z",
      "isExpired": false,
      "timeRemaining": 3600000,
      "total_quotations": 9,
      "responded_quotations": 2,
      "pending_quotations": 7
    }
  }
  ```

### 7.4. Campos de Base de Datos

**Tabla `medication_requests` - Nuevos Campos:**
- `high_cost` (BOOLEAN): Determina si es medicación de alto coste
- `quotation_deadline` (TIMESTAMP): Fecha límite de 48 horas para cotizaciones
- `minimum_quotations` (INTEGER): Mínimo de cotizaciones requeridas (default: 3)
- `sent_quotations_count` (INTEGER): Contador de cotizaciones enviadas
- `responded_quotations_count` (INTEGER): Contador de cotizaciones respondidas
- `quotation_status` (VARCHAR(20)): Estado del proceso de cotización
- `audit_required` (BOOLEAN): Si requiere auditoría médica

**Estados de `quotation_status`:**
- `pending`: Pendiente de envío a cotización
- `sent`: Enviada a cotización
- `partial_response`: Respuesta parcial recibida
- `complete_response`: Todas las cotizaciones respondidas
- `expired`: Tiempo expirado
- `not_required`: No requiere cotización (medicación normal)

## 8. Módulo de Medicaciones de Alto Coste

### 8.1. Dashboard de Alto Coste

#### `GET /api/medication-orders/high-cost`
- **Método:** `GET`
- **Descripción:** Obtiene todas las medicaciones de alto coste con estadísticas para el dashboard
- **Rol Requerido:** `admin`, `operador`, `auditor`
- **Respuesta:**
  ```json
  {
    "orders": [
      {
        "id": "123",
        "beneficiary_name": "Juan Pérez",
        "beneficiary_cuil": "20123456789",
        "diagnosis": "Diabetes tipo 2",
        "requesting_doctor": "Dr. García",
        "urgency_level": "Normal",
        "status": "En Cotización",
        "created_at": "2024-12-19T10:00:00Z",
        "quotation_deadline": "2024-12-21T10:00:00Z",
        "sent_quotations_count": 3,
        "responded_quotations_count": 1,
        "quotation_status": "sent",
        "high_cost": true,
        "created_by_name": "Operador 1"
      }
    ],
    "stats": {
      "total": 15,
      "pending": 3,
      "inQuotation": 8,
      "completed": 3,
      "expired": 1
    }
  }
  ```

### 8.2. Sistema de Alertas

#### `GET /api/medication-orders/high-cost/alerts`
- **Método:** `GET`
- **Descripción:** Obtiene alertas automáticas para medicaciones de alto coste que requieren atención
- **Rol Requerido:** `admin`, `operador`, `auditor`
- **Criterios de Alerta:**
  - **Expiradas:** `quotation_deadline < now`
  - **Próximas a expirar:** `quotation_deadline - now <= 4 horas`
  - **Sin respuesta:** `responded_quotations_count = 0 AND created_at > 24h`
- **Respuesta:**
  ```json
  {
    "alerts": [
      {
        "id": "expired_123",
        "type": "expired",
        "orderId": "123",
        "beneficiaryName": "Juan Pérez",
        "respondedCount": 0,
        "totalCount": 3,
        "timeRemaining": "Expirado",
        "priority": "high"
      },
      {
        "id": "expiring_456",
        "type": "expiring_soon",
        "orderId": "456",
        "beneficiaryName": "María López",
        "respondedCount": 2,
        "totalCount": 3,
        "timeRemaining": "2h",
        "priority": "medium"
      }
    ]
  }
  ```

### 8.3. Características del Sistema de Alertas

**Tipos de Alerta:**
- `expired`: Cotización expirada (prioridad alta, color rojo)
- `expiring_soon`: Próxima a expirar (prioridad media, color amarillo)
- `no_response`: Sin respuesta (prioridad baja, color azul)

**Priorización:**
1. Órdenes expiradas
2. Órdenes próximas a expirar (≤ 4 horas)
3. Órdenes sin respuesta (> 24 horas)

**Límites:**
- Máximo 10 alertas más importantes
- Actualización automática cada 5 minutos
- Alertas descartables individualmente

### 8.4. Página de Alto Coste

**Ruta:** `/high-cost-medications`

**Características:**
- Dashboard con 5 métricas en tiempo real
- Tabla detallada con información de órdenes
- Control de tiempo visual (formato: "23h 45m")
- Estados diferenciados por color
- Información de cotizaciones respondidas vs total

**Métricas del Dashboard:**
- **Total:** Todas las medicaciones de alto coste
- **Pendientes:** Estado "Pendiente de Cotización"
- **En Cotización:** Estado "En Cotización"
- **Completadas:** Estados "Autorizada" o "Rechazada"
- **Expiradas:** Cotizaciones con deadline vencido

### 8.5. Integración en Navegación

**Nuevo Enlace en Sidebar:**
- **Rol:** `auditor`, `operador`
- **Icono:** `ExclamationTriangleIcon`
- **Texto:** "Medicaciones de Alto Coste"
- **Ruta:** `/high-cost-medications`

**Alertas en Página Principal:**
- Componente `HighCostAlerts` integrado en `/autorizaciones`
- Actualización automática cada 5 minutos
- Interfaz no intrusiva y descartable