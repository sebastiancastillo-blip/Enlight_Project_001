import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PLANT_NE = process.env.PLANT_NE || '36297896';
const MOCK_MODE = String(process.env.MOCK_MODE || 'true').toLowerCase() === 'true';

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'"],
      "style-src": ["'self'"],
      "connect-src": ["'self'"]
    }
  }
}));
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Normaliza la respuesta del proveedor a un formato estable para el frontend.
 * Ajusta los campos según la documentación real de tu API.
 */
function normalizeProviderResponse(raw, ne) {
  const now = new Date().toISOString();

  // Posibles nombres de campos comunes en APIs FV.
  const activePowerKw =
    raw?.activePowerKw ??
    raw?.active_power_kw ??
    raw?.pac_kw ??
    raw?.realTimePower ??
    raw?.data?.activePowerKw ??
    null;

  const todayEnergyKwh =
    raw?.todayEnergyKwh ??
    raw?.today_energy_kwh ??
    raw?.dailyEnergy ??
    raw?.eday_kwh ??
    raw?.data?.todayEnergyKwh ??
    null;

  return {
    plant: {
      ne,
      name: 'FAURECIA 0425'
    },
    timestamp: raw?.timestamp || raw?.time || raw?.data?.timestamp || now,
    measurements: [
      {
        key: 'activePowerKw',
        label: 'Potencia activa actual',
        value: activePowerKw,
        unit: 'kW'
      },
      {
        key: 'todayEnergyKwh',
        label: 'Energía generada hoy',
        value: todayEnergyKwh,
        unit: 'kWh'
      }
    ],
    source: MOCK_MODE ? 'mock' : 'provider-api'
  };
}

function buildMockData(ne) {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const daylightFactor = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  const activePowerKw = Number((430 * daylightFactor + Math.random() * 8).toFixed(2));
  const todayEnergyKwh = Number((activePowerKw * Math.max(0.2, hour - 6) * 0.72).toFixed(2));

  return normalizeProviderResponse({
    timestamp: now.toISOString(),
    activePowerKw,
    todayEnergyKwh
  }, ne);
}

/**
 * Endpoint interno para el frontend.
 * El navegador llama este endpoint, no la API externa directamente.
 */
app.get('/api/realtime', async (req, res) => {
  const requestedNe = String(req.query.ne || PLANT_NE).trim();

  if (requestedNe !== PLANT_NE) {
    return res.status(403).json({
      error: 'NE no autorizado para este prototipo.',
      allowedNE: PLANT_NE
    });
  }

  if (MOCK_MODE) {
    return res.json(buildMockData(requestedNe));
  }

  const baseUrl = process.env.PROVIDER_API_BASE_URL;
  const apiKey = process.env.PROVIDER_API_KEY;

  if (!baseUrl || !apiKey) {
    return res.status(500).json({
      error: 'Falta configurar PROVIDER_API_BASE_URL o PROVIDER_API_KEY en .env.'
    });
  }

  try {
    /**
     * Protocolo REST/HTTPS propuesto:
     * GET {PROVIDER_API_BASE_URL}/plants/{NE}/realtime
     * Header: Authorization: Bearer {PROVIDER_API_KEY}
     * Header: Accept: application/json
     *
     * Cambia esta ruta según el proveedor real de monitoreo.
     */
    const providerUrl = `${baseUrl.replace(/\/$/, '')}/plants/${encodeURIComponent(requestedNe)}/realtime`;

    const response = await fetch(providerUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: 'Error consultando API externa.',
        status: response.status,
        detail: text.slice(0, 500)
      });
    }

    const raw = await response.json();
    return res.json(normalizeProviderResponse(raw, requestedNe));
  } catch (error) {
    return res.status(502).json({
      error: 'No fue posible conectar con la API externa.',
      detail: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`ENLIGHT Dashboard activo en http://localhost:${PORT}`);
  console.log(`Planta configurada: FAURECIA 0425 | NE=${PLANT_NE}`);
  console.log(`MOCK_MODE=${MOCK_MODE}`);
});
