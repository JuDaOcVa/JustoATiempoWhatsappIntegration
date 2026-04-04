# JustoATiempoWhatsappIntegration
JustoATiempoWhatsappIntegration API

API en Node.js con `whatsapp-web.js` para envío de mensajes WhatsApp desde backend Java Spring Boot, con soporte **multi-remitente** (múltiples líneas) y sesiones persistentes.

## Requisitos

- Node.js 20+
- Google Chrome o Chromium instalado
- Windows/Linux con permisos para ejecutar Puppeteer

## Instalación

```bash
npm install
```

## Ejecutar

```bash
npm run dev
```

Servidor por defecto: `http://localhost:3000`

## Configuración para multi-líneas (automática)

Define la conexión a PostgreSQL en `.env` y la consulta de remitentes activos:

```env
APP_TIMEZONE=America/Bogota
DATABASE_URL=postgres://postgres:tu_password@localhost:5432/deliveryhubdb
DB_SENDERS_QUERY=SELECT numero FROM linea WHERE fk_estado = 1
```

`APP_TIMEZONE` usa formato IANA (ej: `America/Bogota`) y controla cómo se formatean timestamps como `initializedAt` y `qrUpdatedAt`.

`DB_SENDERS_QUERY` debe devolver una columna con el número remitente (por ejemplo: `numero`).

Al levantar la API:

1. Se inicializa automáticamente una sesión por cada remitente configurado.
2. Si una línea no tiene sesión guardada, se genera QR.
3. Escaneas **solo una vez por línea**.
4. En reinicios siguientes, la sesión se reutiliza (sin nuevo escaneo, salvo cierre de sesión en WhatsApp).

Para obtener el QR de cada línea:

- `GET /api/sessions/:remitente/qr`

Para obtener en una sola llamada el estado/QR de todas las líneas:

- `GET /api/sessions/qrs`

Cuando tu backend cree una línea nueva, puede forzar recarga de remitentes con:

- `GET /api/senders/refresh`
- `GET /senders/refresh`

## Endpoints

### 1) Inicializar sesión de remitente

Inicia el cliente para un número remitente y prepara generación de QR.

`POST /api/sessions/init`

Body:

```json
{
	"remitente": "573137784186"
}
```

Respuesta ejemplo:

```json
{
	"ok": true,
	"message": "Inicialización de sesión iniciada",
	"data": {
		"remitente": "573137784186",
		"status": "initializing"
	}
}
```

### 2) Obtener QR de un remitente

`GET /api/sessions/:remitente/qr`

Si la sesión aún no está autenticada, devuelve QR (base64 Data URL) para escanear con el WhatsApp del remitente.

Respuesta ejemplo:

```json
{
	"ok": true,
	"message": "QR disponible",
	"data": {
		"remitente": "573137784186",
		"qr": "data:image/png;base64,iVBORw0KGgo...",
		"status": "qr_ready"
	}
}
```

### 2.1) Obtener QR de todos los remitentes

`GET /api/sessions/qrs`

Filtro opcional para ver solo pendientes (no autenticados):

`GET /api/sessions/qrs?onlyPending=true`

Respuesta ejemplo:

```json
{
	"ok": true,
	"message": "Estados y QR de sesiones obtenidos",
	"data": [
		{
			"remitente": "573137784186",
			"status": "qr_ready",
			"qr": "data:image/png;base64,iVBORw0KGgo...",
			"qrUpdatedAt": "2026-03-18T16:40:10.123Z",
			"lastError": null
		},
		{
			"remitente": "573100000001",
			"status": "ready",
			"qr": null,
			"qrUpdatedAt": null,
			"lastError": null
		}
	]
}
```

### 3) Enviar mensaje

`POST /api/messages/send`

Body (compatible con tu ejemplo):

```json
{
	"remitente": "573137784186",
	"receptor": "573163671699",
	"Mensaje": "Mensaje de prueba, puede incluir caracteres especiales y emojis"
}
```

### 4) Refrescar remitentes configurados

`GET /api/senders/refresh` o `GET /senders/refresh`

Este endpoint vuelve a consultar `DB_SENDERS_QUERY` y recarga los remitentes configurados desde base de datos.

Respuesta ejemplo:

```json
{
	"ok": true,
	"message": "Remitentes recargados desde base de datos",
	"data": {
		"configuredSenders": ["573137784186", "573100000001"],
		"totalConfigured": 2
	}
}
```

También acepta `mensaje` en minúscula.

El remitente del request debe estar en el resultado de `DB_SENDERS_QUERY`.

Respuesta exitosa:

```json
{
	"ok": true,
	"message": "Mensaje enviado correctamente",
	"data": {
		"remitente": "573137784186",
		"receptor": "573163671699",
		"messageId": "true_573137784186@c.us_...",
		"status": "sent"
	}
}
```

Respuesta cuando falta escanear QR:

```json
{
	"ok": false,
	"message": "La sesión del remitente aún no está lista",
	"error": {
		"code": "SESSION_NOT_READY",
		"status": "qr_ready",
		"details": "Escanea el QR para autenticar la línea"
	}
}
```

## Recomendación para mantener sesiones (multi-líneas)

### Opción recomendada (simple y estable)

Usar `LocalAuth` con `clientId` por remitente (como está implementado), por ejemplo:

- `clientId = rem-573137784186`
- `clientId = rem-5731...`

Esto guarda credenciales por línea en `.wwebjs_auth` y evita reescanear QR en cada reinicio.

### Buenas prácticas para producción

1. Ejecutar una sola instancia de la API por almacenamiento de sesión (evitar dos procesos usando la misma carpeta de sesión).
2. Respaldar `.wwebjs_auth` y `.wwebjs_cache`.
3. Si vas a escalar horizontalmente (varios pods/servidores), migrar a estrategia centralizada de sesiones:
	 - `RemoteAuth` + store (MongoDB/Redis/S3, según arquitectura).
4. Monitorear estados (`ready`, `authenticated`, `disconnected`) y reintentar inicialización automáticamente.

## Scripts

- `npm run dev` → desarrollo con recarga (`nodemon`)
- `npm start` → producción

## Notas

- Esta API usa formato destino WhatsApp: `receptor@c.us`.
- El número debe incluir código de país sin `+`.
