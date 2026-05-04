# ENLIGHT · FAURECIA 0425 API Dashboard

Prototipo base para consultar datos en tiempo real de una instalación fotovoltaica usando un frontend separado en HTML/CSS/JS y un backend proxy para proteger la API key.

## Estructura

```text
enlight-faurecia-0425-api-dashboard/
├── package.json
├── server.js
├── .env.example
└── public/
    ├── index.html
    ├── styles.css
    └── script.js
```

## Variables iniciales mostradas

1. Potencia activa actual `activePowerKw` en kW.
2. Energía generada hoy `todayEnergyKwh` en kWh.

## Instalación

```bash
npm install
cp .env.example .env
npm start
```

Abrir:

```text
http://localhost:3000
```

## Modo de prueba

El archivo `.env.example` viene con:

```env
MOCK_MODE=true
```

Esto permite probar la tabla sin API real. Para conectar el proveedor real:

```env
MOCK_MODE=false
PROVIDER_API_BASE_URL=https://api.proveedor.com/v1
PROVIDER_API_KEY=tu_api_key_real
PLANT_NE=36297896
```

## Protocolo de comunicación propuesto

1. Frontend llama: `GET /api/realtime?ne=36297896`.
2. Backend valida que el NE esté autorizado.
3. Backend consulta la API externa mediante HTTPS.
4. Backend usa la API key desde `.env`, nunca desde el navegador.
5. Backend normaliza la respuesta.
6. Frontend actualiza la tabla automáticamente.

## Ajuste necesario para la API real

En `server.js`, modifica esta ruta si tu proveedor usa otro formato:

```js
const providerUrl = `${baseUrl.replace(/\/$/, '')}/plants/${encodeURIComponent(requestedNe)}/realtime`;
```

También ajusta `normalizeProviderResponse()` si los campos reales tienen nombres diferentes.
