/**
 * CMMS Mantenimiento Industrial - Servidor Centralizado Multi-Dispositivo y Cloud
 * Servidor HTTP nativo Node.js con API RESTful, SSE en tiempo real y persistencia JSON.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

let MongoClient = null;
try {
  MongoClient = require('mongodb').MongoClient;
} catch (e) {
  // Manejado en initMongo
}

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_DEMO_FILE = path.join(DATA_DIR, 'database_demo.json');
const DB_REAL_FILE = path.join(DATA_DIR, 'database_real.json');
const ENV_CONFIG_FILE = path.join(DATA_DIR, 'env_config.json');

// Variables de estado MongoDB Atlas
let mongoClient = null;
let mongoDb = null;
let mongoCollection = null;
let mongoReady = false;

// Plantilla Limpia en Cero para Entorno Real
const BLANK_TEMPLATE = {
  version: '2.0.0',
  environment: 'real',
  config: {
    nombreEmpresa: 'Mi Planta Industrial',
    moneda: '$',
    horasTurnoDia: 8,
    diasLaboralesSemana: 6,
    pinMantenimiento: '1234',
    pinAdmin: '9999'
  },
  areas: [],
  equipos: [],
  empleados: [
    { id: 'EMP-1', nombre: 'Administrador Principal', especialidad: 'Jefatura de Mantenimiento', rol: 'Supervisor', telefono: '', activo: true }
  ],
  solicitudes: [],
  preventivos: []
};

// MIME types soportados
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// Datos Semilla Iniciales
const INITIAL_SEED = {
  version: '2.0.0',
  config: {
    nombreEmpresa: 'Planta Industrial Central',
    moneda: '$',
    horasTurnoDia: 8,
    diasLaboralesSemana: 6,
    pinMantenimiento: '1234',
    pinAdmin: '9999'
  },
  areas: [
    { id: 'AREA-1', codigo: 'ENV', nombre: 'Línea de Envasado', descripcion: 'Llenado, tapado y etiquetado de producto terminado', activa: true },
    { id: 'AREA-2', codigo: 'MEZ', nombre: 'Área de Mezclado y Reactores', descripcion: 'Preparación, reactores y homogenizado de materias primas', activa: true },
    { id: 'AREA-3', codigo: 'EMP', nombre: 'Línea de Empaque y Paletizado', descripcion: 'Encartonado secundario y paletizado robotizado', activa: true },
    { id: 'AREA-4', codigo: 'SRV', nombre: 'Servicios Industriales y Calderas', descripcion: 'Generación de vapor, aire comprimido y refrigeración', activa: true }
  ],
  equipos: [
    { id: 'EQ-1', codigo: 'ENV-01', nombre: 'Envasadora Rotativa Automática', areaId: 'AREA-1', ubicacion: 'Nave A - Puesto 1', estado: 'Operativo', criticidad: 'Alta' },
    { id: 'EQ-2', codigo: 'ENV-02', nombre: 'Tapadora y Etiquetadora Lineal', areaId: 'AREA-1', ubicacion: 'Nave A - Puesto 2', estado: 'Operativo', criticidad: 'Media' },
    { id: 'EQ-3', codigo: 'MEZ-01', nombre: 'Reactor Mezclador 2000L', areaId: 'AREA-2', ubicacion: 'Nave B - Nivel 2', estado: 'Operativo', criticidad: 'Crítica' },
    { id: 'EQ-4', codigo: 'MEZ-02', nombre: 'Bomba de Trasvase Positiva B-04', areaId: 'AREA-2', ubicacion: 'Nave B - Fosa 1', estado: 'Operativo', criticidad: 'Media' },
    { id: 'EQ-5', codigo: 'EMP-01', nombre: 'Encartonadora Automática E-50', areaId: 'AREA-3', ubicacion: 'Nave C - Cabecera', estado: 'Operativo', criticidad: 'Alta' },
    { id: 'EQ-6', codigo: 'EMP-02', nombre: 'Paletizador Robótico P-10', areaId: 'AREA-3', ubicacion: 'Nave C - Almacén Salida', estado: 'Operativo', criticidad: 'Media' },
    { id: 'EQ-7', codigo: 'SRV-01', nombre: 'Caldera Pirotubular 500 BHP', areaId: 'AREA-4', ubicacion: 'Sala de Calderas', estado: 'Operativo', criticidad: 'Crítica' },
    { id: 'EQ-8', codigo: 'SRV-02', nombre: 'Compresor de Tornillo Atlas Copco 75HP', areaId: 'AREA-4', ubicacion: 'Sala de Compresores', estado: 'Operativo', criticidad: 'Alta' }
  ],
  empleados: [
    { id: 'EMP-1', nombre: 'Juan Pérez', especialidad: 'Mecánica Industrial', rol: 'Técnico', telefono: '+58 412-1010101', activo: true },
    { id: 'EMP-2', nombre: 'Roberto Mendoza', especialidad: 'Electricidad y Automatización', rol: 'Técnico', telefono: '+58 414-2020202', activo: true },
    { id: 'EMP-3', nombre: 'Carlos Alarcón', especialidad: 'Sistemas Neumáticos y PLC', rol: 'Técnico', telefono: '+58 416-3030303', activo: true },
    { id: 'EMP-4', nombre: 'Miguel Torres', especialidad: 'Térmica, Vapor y Calderas', rol: 'Técnico', telefono: '+58 424-4040404', activo: true },
    { id: 'EMP-5', nombre: 'Marcos Rivas', especialidad: 'Producción / Operaciones', rol: 'Solicitante', telefono: '+58 412-5555555', activo: true },
    { id: 'EMP-6', nombre: 'Ing. David Sánchez', especialidad: 'Gerencia Mantenimiento', rol: 'Supervisor', telefono: '+58 414-7777777', activo: true }
  ],
  solicitudes: [
    {
      id: 'SOL-2026-001',
      folio: 1,
      fechaSolicitud: '2026-09-01T08:15',
      solicitante: 'Marcos Rivas (Supervisor Envasado)',
      turno: 'Mañana',
      areaId: 'AREA-1',
      equipoId: 'EQ-1',
      tipoFalla: 'Mecánica',
      criticidad: 'Alta',
      descripcion: 'Atascamiento recurrente en la estrella dosificadora con vibración inusual.',
      estado: 'Culminada', // Pendiente | Asignada | En Intervención | Culminada | Cancelada
      tipoEjecutor: 'Interno', // Interno | Contratista
      tecnicoId: 'EMP-1',
      contratista: null,
      fechaAsignacion: '2026-09-01T08:30',
      fechaInicio: '2026-09-01T08:45',
      fechaFin: '2026-09-01T11:15',
      horasParadaDecimal: 2.50,
      horasParadaTexto: '2h 30m',
      minutosParadaTotal: 150,
      diagnostico: 'Desgaste en rodamiento guía de la estrella de alimentación.',
      solucion: 'Sustitución de rodamiento 6205-2RS y alineación micrométrica de estrella.',
      repuestos: '1x Rodamiento SKF 6205-2RS, 1x Retén 25x47x7',
      observaciones: 'Línea de envasado entregada operativa con prueba en vacío de 15 minutos.'
    },
    {
      id: 'SOL-2026-002',
      folio: 2,
      fechaSolicitud: '2026-09-02T13:40',
      solicitante: 'Elena Contreras (Operadora Mezclado)',
      turno: 'Tarde',
      areaId: 'AREA-2',
      equipoId: 'EQ-3',
      tipoFalla: 'Eléctrica',
      criticidad: 'Crítica',
      descripcion: 'Disparo por sobrecarga térmica en variador de velocidad del agitador principal.',
      estado: 'Culminada',
      tipoEjecutor: 'Contratista',
      tecnicoId: null,
      contratista: {
        nombre: 'ElectroAutomatismos C.A.',
        ordenCompra: 'OC-2026-88',
        costo: 350.00
      },
      fechaAsignacion: '2026-09-02T13:50',
      fechaInicio: '2026-09-02T14:00',
      fechaFin: '2026-09-02T17:45',
      horasParadaDecimal: 3.75,
      horasParadaTexto: '3h 45m',
      minutosParadaTotal: 225,
      diagnostico: 'Ventilador interno del variador Danfoss obstruido por polvo y recalentamiento.',
      solucion: 'Limpieza con aire dieléctrico, cambio de extractor de aire del gabinete y rearmado.',
      repuestos: '1x Extractor 220V 120mm para gabinete',
      observaciones: 'Se normalizó la temperatura interna del gabinete bajo 38°C.'
    },
    {
      id: 'SOL-2026-003',
      folio: 3,
      fechaSolicitud: '2026-09-03T10:00',
      solicitante: 'Pedro Briceño (Líder Empaque)',
      turno: 'Mañana',
      areaId: 'AREA-3',
      equipoId: 'EQ-5',
      tipoFalla: 'Neumática',
      criticidad: 'Media',
      descripcion: 'Fuga de aire en cilindro empujador de cajas con retardo en carrera de retorno.',
      estado: 'Culminada',
      tipoEjecutor: 'Interno',
      tecnicoId: 'EMP-3',
      contratista: null,
      fechaAsignacion: '2026-09-03T10:20',
      fechaInicio: '2026-09-03T10:30',
      fechaFin: '2026-09-03T11:50',
      horasParadaDecimal: 1.33,
      horasParadaTexto: '1h 20m',
      minutosParadaTotal: 80,
      diagnostico: 'Fisura en manguera de poliuretano 8mm y sello del vástago desgastado.',
      solucion: 'Reemplazo de tramo de tubería neumática y lubricación de unidad FRL.',
      repuestos: '2m Manguera PU 8mm azul, racores rápidos 1/4" NPT',
      observaciones: 'Presión calibrada a 6.2 bar estables.'
    },
    {
      id: 'SOL-2026-004',
      folio: 4,
      fechaSolicitud: '2026-09-04T07:20',
      solicitante: 'Jorge Méndez (Operador Caldera)',
      turno: 'Mañana',
      areaId: 'AREA-4',
      equipoId: 'SRV-01',
      tipoFalla: 'Instrumentación',
      criticidad: 'Crítica',
      descripcion: 'Falla intermitente en fotocelda de detección de llama del quemador Weishaupt.',
      estado: 'Culminada',
      tipoEjecutor: 'Contratista',
      tecnicoId: null,
      contratista: {
        nombre: 'Térmica & Combustión Industrial',
        ordenCompra: 'OC-2026-92',
        costo: 520.00
      },
      fechaAsignacion: '2026-09-04T07:30',
      fechaInicio: '2026-09-04T07:40',
      fechaFin: '2026-09-04T09:25',
      horasParadaDecimal: 1.75,
      horasParadaTexto: '1h 45m',
      minutosParadaTotal: 105,
      diagnostico: 'Fotocelda de llama UV cubierta de hollín y terminal sulfatado.',
      solucion: 'Limpieza óptica profunda, ajuste de sensibilidad del programador y ajuste de combustión.',
      repuestos: 'Kit de limpieza óptica, conector cerámico',
      observaciones: 'Combustión verificada con analizador de gases: O2 al 3.5%, CO < 50 ppm.'
    },
    {
      id: 'SOL-2026-005',
      folio: 5,
      fechaSolicitud: '2026-09-05T15:10',
      solicitante: 'Marcos Rivas (Supervisor Envasado)',
      turno: 'Tarde',
      areaId: 'AREA-1',
      equipoId: 'EQ-2',
      tipoFalla: 'Mecánica',
      criticidad: 'Media',
      descripcion: 'Banda transportadora de tapado presenta desalineación y roce en guía lateral.',
      estado: 'En Intervención',
      tipoEjecutor: 'Interno',
      tecnicoId: 'EMP-1',
      contratista: null,
      fechaAsignacion: '2026-09-05T15:20',
      fechaInicio: '2026-09-05T15:30',
      fechaFin: null,
      horasParadaDecimal: 0,
      horasParadaTexto: 'En curso...',
      minutosParadaTotal: 0,
      diagnostico: '',
      solucion: '',
      repuestos: '',
      observaciones: 'Técnico desmontando cubierta de protección para tensar banda.'
    },
    {
      id: 'SOL-2026-006',
      folio: 6,
      fechaSolicitud: '2026-09-06T09:00',
      solicitante: 'Pedro Briceño (Líder Empaque)',
      turno: 'Mañana',
      areaId: 'AREA-3',
      equipoId: 'EQ-6',
      tipoFalla: 'Eléctrica',
      criticidad: 'Alta',
      descripcion: 'Sensor de presencia de paleta en transportador final no conmuta señal al PLC.',
      estado: 'Asignada',
      tipoEjecutor: 'Interno',
      tecnicoId: 'EMP-2',
      contratista: null,
      fechaAsignacion: '2026-09-06T09:15',
      fechaInicio: null,
      fechaFin: null,
      horasParadaDecimal: 0,
      horasParadaTexto: 'Pendiente inicio',
      minutosParadaTotal: 0,
      diagnostico: '',
      solucion: '',
      repuestos: '',
      observaciones: 'Técnico notificado con orden prioritaria.'
    },
    {
      id: 'SOL-2026-007',
      folio: 7,
      fechaSolicitud: '2026-09-07T11:30',
      solicitante: 'Carlos Gil (Operador Servicios)',
      turno: 'Mañana',
      areaId: 'AREA-4',
      equipoId: 'SRV-02',
      tipoFalla: 'Mecánica',
      criticidad: 'Alta',
      descripcion: 'Aumento anormal en la temperatura del cabezal compresor de tornillo (98°C).',
      estado: 'Pendiente',
      tipoEjecutor: null,
      tecnicoId: null,
      contratista: null,
      fechaAsignacion: null,
      fechaInicio: null,
      fechaFin: null,
      horasParadaDecimal: 0,
      horasParadaTexto: 'Por iniciar',
      minutosParadaTotal: 0,
      diagnostico: '',
      solucion: '',
      repuestos: '',
      observaciones: ''
    }
  ],
  preventivos: [
    {
      id: 'PREV-001',
      codigo: 'MP-ENV-SEM',
      titulo: 'Engrase y Revisión de Cadenas de Envasadora',
      equipoId: 'EQ-1',
      areaId: 'AREA-1',
      frecuencia: 'Semanal',
      diasFrecuencia: 7,
      ultimaEjecucion: '2026-08-31',
      proximaFecha: '2026-09-07',
      estado: 'Vencido', // Al Día | Próximo | Vencido
      responsableId: 'EMP-1',
      tipoEjecutor: 'Interno',
      contratistaPrevisto: null,
      costoEstimado: 0,
      tareas: [
        'Inspeccionar tensión de cadena principal',
        'Lubricar con grasa sanitaria grado H1',
        'Verificar holgura en piñones motrices',
        'Limpieza de sensores de paso'
      ],
      observaciones: 'Requiere bloqueo y etiquetado (LOTO) de seguridad.'
    },
    {
      id: 'PREV-002',
      codigo: 'MP-CAL-MEN',
      titulo: 'Purga de Fondo, Inspección de Quemador y Control de Agua',
      equipoId: 'EQ-7',
      areaId: 'AREA-4',
      frecuencia: 'Mensual',
      diasFrecuencia: 30,
      ultimaEjecucion: '2026-08-15',
      proximaFecha: '2026-09-15',
      estado: 'Próximo',
      responsableId: 'EMP-4',
      tipoEjecutor: 'Contratista',
      contratistaPrevisto: {
        nombre: 'Térmica & Combustión Industrial',
        costoEstimado: 450.00
      },
      costoEstimado: 450.00,
      tareas: [
        'Análisis de dureza y TDS en agua de caldera',
        'Prueba de disparo de válvula de seguridad',
        'Limpieza de electrodos de ignición del quemador',
        'Verificación de corte por bajo nivel de agua'
      ],
      observaciones: 'Coordinar con planta durante parada dominical programada.'
    },
    {
      id: 'PREV-003',
      codigo: 'MP-CMP-TRIM',
      titulo: 'Cambio de Filtros y Aceite Sintético de Compresor Atlas Copco',
      equipoId: 'EQ-8',
      areaId: 'AREA-4',
      frecuencia: 'Trimestral',
      diasFrecuencia: 90,
      ultimaEjecucion: '2026-07-01',
      proximaFecha: '2026-10-01',
      estado: 'Al Día',
      responsableId: 'EMP-1',
      tipoEjecutor: 'Interno',
      contratistaPrevisto: null,
      costoEstimado: 120.00,
      tareas: [
        'Drenaje y recambio de aceite Roto-Inject Fluid',
        'Sustitución de filtro de aire y filtro separador de aceite',
        'Soplado de radiador de enfriamiento',
        'Monitoreo de corriente del motor trifásico'
      ],
      observaciones: 'Mantener registro de horómetro.'
    },
    {
      id: 'PREV-004',
      codigo: 'MP-ROB-QUI',
      titulo: 'Calibración de Ejes y Ventosas de Succión de Paletizador',
      equipoId: 'EQ-6',
      areaId: 'AREA-3',
      frecuencia: 'Quincenal',
      diasFrecuencia: 15,
      ultimaEjecucion: '2026-08-25',
      proximaFecha: '2026-09-09',
      estado: 'Próximo',
      responsableId: 'EMP-3',
      tipoEjecutor: 'Interno',
      contratistaPrevisto: null,
      costoEstimado: 0,
      tareas: [
        'Inspección de ventosas de vacío por fisuras',
        'Verificación de presión de vacío (-0.8 bar)',
        'Limpieza de guías lineales y lubricación',
        'Prueba de ciclo en modo manual'
      ],
      observaciones: 'Verificar alineación de sensores de posición cero.'
    }
  ]
};

// ==========================================================================
// CAPA DE PERSISTENCIA HÍBRIDA: MONGODB ATLAS (NUBE) + ARCHIVOS JSON (LOCAL)
// ==========================================================================

async function initMongo() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.log('💾 [ALMACENAMIENTO]: Modo Local activo (data/database_*.json). Para persistencia permanente en la nube (Render), configure MONGODB_URI.');
    return false;
  }
  if (!MongoClient) {
    console.warn('⚠️ [ALMACENAMIENTO]: Paquete "mongodb" no encontrado en node_modules. Operando en Modo Local.');
    return false;
  }

  try {
    console.log('🔄 [ALMACENAMIENTO]: Conectando a MongoDB Atlas en la nube...');
    mongoClient = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    await mongoClient.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'cmms_industrial';
    mongoDb = mongoClient.db(dbName);
    mongoCollection = mongoDb.collection('app_state');
    mongoReady = true;

    // Verificar e inicializar documentos en MongoDB Atlas si la colección es nueva
    await ensureMongoSeeds();

    console.log(`✅ [ALMACENAMIENTO]: ¡Conectado con éxito a MongoDB Atlas! (Base de datos: ${dbName}, Colección: app_state)`);
    console.log('☁️ [ALMACENAMIENTO]: PERSISTENCIA PERMANENTE ACTIVA: Los datos se conservarán para siempre en la nube, incluso al reiniciar o dormirse Render.');
    return true;
  } catch (err) {
    console.error('❌ [ALMACENAMIENTO]: Error conectando a MongoDB Atlas:', err.message);
    console.log('⚠️ [ALMACENAMIENTO]: Reanudando en MODO LOCAL (Archivos JSON) como respaldo seguro.');
    mongoReady = false;
    return false;
  }
}

async function ensureMongoSeeds() {
  if (!mongoReady || !mongoCollection) return;
  try {
    const demoDoc = await mongoCollection.findOne({ _id: 'demo' });
    if (!demoDoc) {
      console.log('🌱 [MONGODB]: Inicializando datos de demostración en MongoDB Atlas...');
      await mongoCollection.insertOne({ ...INITIAL_SEED, _id: 'demo' });
    }
    const realDoc = await mongoCollection.findOne({ _id: 'real' });
    if (!realDoc) {
      console.log('🌱 [MONGODB]: Inicializando datos de entorno real (en blanco) en MongoDB Atlas...');
      await mongoCollection.insertOne({ ...BLANK_TEMPLATE, _id: 'real' });
    }
    const configDoc = await mongoCollection.findOne({ _id: 'config' });
    if (!configDoc) {
      await mongoCollection.insertOne({ _id: 'config', activeEnv: 'real' });
    }
  } catch (err) {
    console.error('⚠️ Error asegurando semillas en MongoDB:', err.message);
  }
}

// Funciones de control de entorno activo (real vs demo)
async function getActiveEnv() {
  if (mongoReady && mongoCollection) {
    try {
      const configDoc = await mongoCollection.findOne({ _id: 'config' });
      if (configDoc && (configDoc.activeEnv === 'real' || configDoc.activeEnv === 'demo')) {
        return configDoc.activeEnv;
      }
    } catch (e) {
      console.error('⚠️ Error leyendo activeEnv de MongoDB:', e.message);
    }
    return 'real';
  }

  try {
    if (fs.existsSync(ENV_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ENV_CONFIG_FILE, 'utf8'));
      if (parsed && (parsed.activeEnv === 'real' || parsed.activeEnv === 'demo')) {
        return parsed.activeEnv;
      }
    }
  } catch (e) {}
  return 'demo'; // Por defecto demo en local para explorar
}

async function setActiveEnv(env) {
  if (mongoReady && mongoCollection) {
    try {
      await mongoCollection.updateOne(
        { _id: 'config' },
        { $set: { activeEnv: env, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return true;
    } catch (e) {
      console.error('⚠️ Error guardando activeEnv en MongoDB:', e.message);
      return false;
    }
  }

  try {
    fs.writeFileSync(ENV_CONFIG_FILE, JSON.stringify({ activeEnv: env }, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function getActiveDBFile(env) {
  return env === 'real' ? DB_REAL_FILE : DB_DEMO_FILE;
}

// Asegurar directorio y bases de datos locales independientes
function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Migrar database.json anterior si existe y no hay demo
  const oldDb = path.join(DATA_DIR, 'database.json');
  if (fs.existsSync(oldDb) && !fs.existsSync(DB_DEMO_FILE)) {
    try { fs.copyFileSync(oldDb, DB_DEMO_FILE); } catch (e) {}
  }

  // 1. Base de datos de Demostración (datos de prueba preconfigurados)
  if (!fs.existsSync(DB_DEMO_FILE)) {
    fs.writeFileSync(DB_DEMO_FILE, JSON.stringify(INITIAL_SEED, null, 2), 'utf8');
  }

  // 2. Base de datos del Entorno Real (limpia en cero para la planta del usuario)
  if (!fs.existsSync(DB_REAL_FILE)) {
    fs.writeFileSync(DB_REAL_FILE, JSON.stringify(BLANK_TEMPLATE, null, 2), 'utf8');
  }

  // 3. Configuración de entorno
  if (!fs.existsSync(ENV_CONFIG_FILE)) {
    try { fs.writeFileSync(ENV_CONFIG_FILE, JSON.stringify({ activeEnv: 'demo' }, null, 2), 'utf8'); } catch (e) {}
  }
}

async function loadDatabase(targetEnv = null) {
  const env = targetEnv || await getActiveEnv();

  if (mongoReady && mongoCollection) {
    try {
      let doc = await mongoCollection.findOne({ _id: env });
      if (!doc) {
        const seed = env === 'real' ? BLANK_TEMPLATE : INITIAL_SEED;
        doc = { ...seed, _id: env };
        await mongoCollection.replaceOne({ _id: env }, doc, { upsert: true });
      }
      const clean = { ...doc };
      delete clean._id;
      clean.environment = env;
      clean.areas = Array.isArray(clean.areas) ? clean.areas : [];
      clean.equipos = Array.isArray(clean.equipos) ? clean.equipos : [];
      clean.empleados = Array.isArray(clean.empleados) ? clean.empleados : [];
      clean.solicitudes = Array.isArray(clean.solicitudes) ? clean.solicitudes : [];
      clean.preventivos = Array.isArray(clean.preventivos) ? clean.preventivos : [];
      clean.config = clean.config || (env === 'real' ? BLANK_TEMPLATE.config : INITIAL_SEED.config);
      if (clean.config) {
        if (!clean.config.diasLaboralesSemana) clean.config.diasLaboralesSemana = 6;
        if (clean.config.horasTurnoDia === 24 || !clean.config.horasTurnoDia) clean.config.horasTurnoDia = 8;
      }
      if (Array.isArray(clean.solicitudes)) {
        let mig = false;
        clean.solicitudes.forEach(s => {
          if ((s.tipoFalla === 'Mantenimiento Preventivo' || (s.descripcion && s.descripcion.startsWith('[PLAN PREVENTIVO'))) && s.tipoSolicitud !== 'Preventivo') {
            s.tipoSolicitud = 'Preventivo';
            mig = true;
          }
        });
        if (mig) {
          mongoCollection.replaceOne({ _id: env }, { ...clean, _id: env }).catch(e => console.warn(e));
        }
      }
      return clean;
    } catch (err) {
      console.error('⚠️ Error cargando base de datos desde MongoDB:', err.message);
    }
  }

  try {
    ensureDatabase();
    const filePath = getActiveDBFile(env);
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    parsed.environment = env;
    if (parsed.config) {
      if (!parsed.config.diasLaboralesSemana) parsed.config.diasLaboralesSemana = 6;
      if (parsed.config.horasTurnoDia === 24 || !parsed.config.horasTurnoDia) parsed.config.horasTurnoDia = 8;
    }
    if (Array.isArray(parsed.solicitudes)) {
      let migLocal = false;
      parsed.solicitudes.forEach(s => {
        if ((s.tipoFalla === 'Mantenimiento Preventivo' || (s.descripcion && s.descripcion.startsWith('[PLAN PREVENTIVO'))) && s.tipoSolicitud !== 'Preventivo') {
          s.tipoSolicitud = 'Preventivo';
          migLocal = true;
        }
      });
      if (migLocal) {
        try { fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), 'utf8'); } catch (e) { console.warn(e); }
      }
    }
    return parsed;
  } catch (err) {
    console.error('⚠️ Error leyendo base de datos local:', err);
    return env === 'real' ? JSON.parse(JSON.stringify(BLANK_TEMPLATE)) : JSON.parse(JSON.stringify(INITIAL_SEED));
  }
}

async function saveDatabase(data, targetEnv = null) {
  const env = targetEnv || await getActiveEnv();
  data.environment = env;

  let saved = false;

  if (mongoReady && mongoCollection) {
    try {
      const cleanDoc = JSON.parse(JSON.stringify(data));
      cleanDoc._id = env;
      cleanDoc.updatedAt = new Date().toISOString();
      await mongoCollection.replaceOne({ _id: env }, cleanDoc, { upsert: true });
      saved = true;
    } catch (err) {
      console.error('❌ Error guardando en MongoDB:', err.message);
    }
  }

  try {
    ensureDatabase();
    const filePath = getActiveDBFile(env);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    if (!saved) saved = true;
  } catch (err) {
    if (!saved) console.error('❌ Error guardando base de datos en archivo:', err.message);
  }

  notifyClients('update', { timestamp: new Date().toISOString(), environment: env });
  return saved;
}

async function resetRealEnvironment() {
  if (mongoReady && mongoCollection) {
    try {
      const clean = JSON.parse(JSON.stringify(BLANK_TEMPLATE));
      clean._id = 'real';
      clean.updatedAt = new Date().toISOString();
      await mongoCollection.replaceOne({ _id: 'real' }, clean, { upsert: true });
    } catch (e) {
      console.error('⚠️ Error al resetear entorno real en MongoDB:', e.message);
    }
  }
  try {
    ensureDatabase();
    fs.writeFileSync(DB_REAL_FILE, JSON.stringify(BLANK_TEMPLATE, null, 2), 'utf8');
  } catch (e) {}
}

async function cloneCatalogToReal() {
  const demoDb = await loadDatabase('demo');
  const realDb = await loadDatabase('real');
  realDb.areas = JSON.parse(JSON.stringify(demoDb.areas || []));
  realDb.equipos = JSON.parse(JSON.stringify(demoDb.equipos || []));
  realDb.empleados = JSON.parse(JSON.stringify(demoDb.empleados || []));
  await saveDatabase(realDb, 'real');
}

// Clientes SSE (Server-Sent Events) para actualizaciones en vivo
const sseClients = new Set();

function notifyClients(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Enviar heartbeat cada 25 segundos para mantener vivas las conexiones SSE
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': heartbeat\n\n');
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 25000);

// Helper para leer body JSON
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // Límite 5MB
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('JSON malformado'));
      }
    });
    req.on('error', reject);
  });
}

// Helper para responder JSON
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

// Obtener IPs locales de la máquina
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

// Crear Servidor HTTP
const server = http.createServer(async (req, res) => {
  // Manejo de CORS pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // ==========================================
  // RUTAS DE LA API RESTful
  // ==========================================

  // 1. SSE - Server Sent Events (Notificaciones en Vivo)
  if (pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('event: connected\ndata: {"status":"ok"}\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 2. Info del Sistema y Red
  if (pathname === '/api/info' && req.method === 'GET') {
    const activeEnv = await getActiveEnv();
    return sendJSON(res, 200, {
      version: '2.0.0',
      uptime: process.uptime(),
      localIPs: getLocalIPs(),
      port: PORT,
      timestamp: new Date().toISOString(),
      activeEnv: activeEnv,
      storageMode: mongoReady ? 'mongodb-atlas' : 'local-json',
      storageDescription: mongoReady 
        ? '☁️ MongoDB Atlas (Nube - Persistencia Permanente)' 
        : '💾 Archivos JSON Locales (data/)',
      mongoConnected: mongoReady
    });
  }

  // 3. Obtener Toda la Base de Datos
  if (pathname === '/api/data' && req.method === 'GET') {
    const db = await loadDatabase();
    return sendJSON(res, 200, db);
  }

  // 3.1. GESTIÓN DE ENTORNOS (REAL VS DEMO)
  if (pathname === '/api/environment') {
    if (req.method === 'GET') {
      const activeEnv = await getActiveEnv();
      return sendJSON(res, 200, {
        activeEnv: activeEnv,
        environments: [
          { id: 'real', nombre: 'Entorno Real (Mi Planta / En Blanco)', icon: '🏭', desc: 'Base de datos limpia para configurar desde cero tu planta' },
          { id: 'demo', nombre: 'Entorno de Prueba (Demostración)', icon: '🧪', desc: 'Datos simulados para practicar y probar funciones' }
        ]
      });
    }
  }

  if (pathname === '/api/environment/switch' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const targetEnv = body.env;
      if (targetEnv !== 'real' && targetEnv !== 'demo') {
        return sendJSON(res, 400, { error: 'Entorno inválido. Use "real" o "demo"' });
      }
      await setActiveEnv(targetEnv);
      const db = await loadDatabase();
      notifyClients('env-switched', { activeEnv: targetEnv, timestamp: new Date().toISOString() });
      return sendJSON(res, 200, { activeEnv: targetEnv, data: db });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/environment/reset-real' && req.method === 'POST') {
    try {
      await resetRealEnvironment();
      const currentEnv = await getActiveEnv();
      if (currentEnv === 'real') {
        notifyClients('update', { timestamp: new Date().toISOString(), env: 'real' });
      }
      return sendJSON(res, 200, { message: 'Entorno real restablecido a cero exitosamente' });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/environment/clone-catalog-to-real' && req.method === 'POST') {
    try {
      await cloneCatalogToReal();
      const currentEnv = await getActiveEnv();
      if (currentEnv === 'real') {
        notifyClients('update', { timestamp: new Date().toISOString(), env: 'real' });
      }
      return sendJSON(res, 200, { message: 'Catálogo de áreas, equipos y personal copiado al entorno real (sin solicitudes ni paradas).' });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  // 4. MÓDULO SOLICITUDES
  if (pathname === '/api/solicitudes') {
    const db = await loadDatabase();
    if (req.method === 'GET') {
      return sendJSON(res, 200, db.solicitudes || []);
    }
    if (req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const tipoSolicitud = body.tipoSolicitud === 'Preventivo'
          ? 'Preventivo'
          : (body.tipoSolicitud === 'Requerimiento' ? 'Requerimiento' : 'Averia');
        const isRequerimiento = tipoSolicitud === 'Requerimiento';
        const isPreventivo = tipoSolicitud === 'Preventivo';
        const equipoId = isRequerimiento ? null : (body.equipoId || null);

        if (!body.solicitante || !body.areaId || (!isRequerimiento && !body.equipoId) || !body.descripcion) {
          return sendJSON(res, 400, { error: 'Faltan campos obligatorios: solicitante, areaId, ' + (isRequerimiento ? '' : 'equipoId, ') + 'descripcion' });
        }

        const maxFolio = db.solicitudes.reduce((max, s) => Math.max(max, s.folio || 0), 0);
        const nextFolio = maxFolio + 1;
        const id = `SOL-2026-${String(nextFolio).padStart(3, '0')}`;

        const getLocalNow = () => {
          const d = new Date();
          const tzOffset = d.getTimezoneOffset() * 60000;
          return (new Date(d - tzOffset)).toISOString().slice(0, 16);
        };

        const newSolicitud = {
          id,
          folio: nextFolio,
          tipoSolicitud, // 'Averia' | 'Requerimiento' | 'Preventivo'
          fechaSolicitud: body.fechaSolicitud || getLocalNow(),
          solicitante: body.solicitante.trim(),
          turno: body.turno || 'Mañana',
          areaId: body.areaId,
          equipoId,
          tipoFalla: body.tipoFalla || (isRequerimiento ? 'Servicios Generales' : (isPreventivo ? 'Mantenimiento Preventivo' : 'Mecánica')),
          criticidad: body.criticidad || 'Media',
          descripcion: body.descripcion.trim(),
          estado: 'Pendiente',
          tipoEjecutor: null,
          tecnicoId: null,
          contratista: null,
          fechaAsignacion: null,
          fechaInicio: null,
          fechaFin: null,
          horasParadaDecimal: 0,
          horasParadaTexto: isRequerimiento ? 'No aplica (Operativo)' : (isPreventivo ? 'Mantenimiento Programado' : 'Por iniciar'),
          minutosParadaTotal: 0,
          horasAtencionDecimal: 0,
          horasAtencionTexto: 'Por iniciar',
          minutosAtencionTotal: 0,
          motivoDetenimiento: null,
          detalleDetenimiento: null,
          fechaDetenimiento: null,
          estadoPrevio: null,
          motivoCancelacion: null,
          detalleCancelacion: null,
          fechaCancelacion: null,
          diagnostico: '',
          solucion: '',
          repuestos: '',
          observaciones: body.observaciones ? body.observaciones.trim() : ''
        };

        db.solicitudes.unshift(newSolicitud);
        await saveDatabase(db);
        return sendJSON(res, 201, newSolicitud);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }
  }

  // Solicitud individual: PUT /api/solicitudes/:id, DELETE /api/solicitudes/:id
  const matchSolicitud = pathname.match(/^\/api\/solicitudes\/([^/]+)$/);
  if (matchSolicitud) {
    const solId = matchSolicitud[1];
    const db = await loadDatabase();
    const index = db.solicitudes.findIndex(s => s.id === solId);

    if (index === -1) {
      return sendJSON(res, 404, { error: 'Solicitud no encontrada' });
    }

    if (req.method === 'GET') {
      return sendJSON(res, 200, db.solicitudes[index]);
    }

    if (req.method === 'PUT') {
      try {
        const body = await parseRequestBody(req);
        // Actualizar campos manteniendo integridad
        db.solicitudes[index] = {
          ...db.solicitudes[index],
          ...body,
          id: solId // Proteger ID
        };
        await saveDatabase(db);
        return sendJSON(res, 200, db.solicitudes[index]);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (req.method === 'DELETE') {
      const deleted = db.solicitudes.splice(index, 1)[0];
      await saveDatabase(db);
      return sendJSON(res, 200, { message: 'Solicitud eliminada con éxito', deleted });
    }
  }

  // 5. MÓDULO MANTENIMIENTO PREVENTIVO
  if (pathname === '/api/preventivos') {
    const db = await loadDatabase();
    if (req.method === 'GET') {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const preventivos = (db.preventivos || []).map(p => {
        let estado = 'Al Día';
        if (p.proximaFecha) {
          const dateStr = p.proximaFecha.includes('T') ? p.proximaFecha : `${p.proximaFecha}T00:00:00`;
          const prox = new Date(dateStr);
          prox.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((prox - hoy) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) estado = 'Vencido';
          else if (diffDays <= 5) estado = 'Próximo';
        }
        return { ...p, estado };
      });
      return sendJSON(res, 200, preventivos);
    }
    if (req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const newId = `PREV-${String(Date.now()).slice(-5)}`;
        const newPrev = {
          id: newId,
          codigo: body.codigo || `MP-${newId}`,
          titulo: body.titulo.trim(),
          equipoId: body.equipoId,
          areaId: body.areaId,
          frecuencia: body.frecuencia || 'Mensual',
          diasFrecuencia: Number(body.diasFrecuencia) > 0 ? Number(body.diasFrecuencia) : ({ 'Semanal': 7, 'Quincenal': 15, 'Mensual': 30, 'Bimestral': 60, 'Trimestral': 90, 'Semestral': 180, 'Anual': 365 }[body.frecuencia] || 30),
          ultimaEjecucion: body.ultimaEjecucion || null,
          vecesEjecutado: Number(body.vecesEjecutado) || 0,
          proximaFecha: body.proximaFecha,
          estado: body.estado || 'Al Día',
          responsableId: body.responsableId || null,
          tipoEjecutor: body.tipoEjecutor || 'Interno',
          contratistaPrevisto: body.contratistaPrevisto || null,
          costoEstimado: Number(body.costoEstimado) || 0,
          tareas: Array.isArray(body.tareas) ? body.tareas : [],
          observaciones: body.observaciones || ''
        };
        db.preventivos = db.preventivos || [];
        db.preventivos.push(newPrev);
        await saveDatabase(db);
        return sendJSON(res, 201, newPrev);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }
  }

  const matchPreventivo = pathname.match(/^\/api\/preventivos\/([^/]+)$/);
  if (matchPreventivo) {
    const prevId = matchPreventivo[1];
    const db = await loadDatabase();
    db.preventivos = db.preventivos || [];
    const index = db.preventivos.findIndex(p => p.id === prevId);

    if (index === -1) {
      return sendJSON(res, 404, { error: 'Plan preventivo no encontrado' });
    }

    if (req.method === 'PUT') {
      try {
        const body = await parseRequestBody(req);
        db.preventivos[index] = {
          ...db.preventivos[index],
          ...body,
          id: prevId
        };
        await saveDatabase(db);
        return sendJSON(res, 200, db.preventivos[index]);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (req.method === 'DELETE') {
      const deleted = db.preventivos.splice(index, 1)[0];
      await saveDatabase(db);
      return sendJSON(res, 200, { message: 'Preventivo eliminado', deleted });
    }
  }

  // 6. CATÁLOGO: ÁREAS
  if (pathname === '/api/areas') {
    const db = await loadDatabase();
    if (req.method === 'GET') return sendJSON(res, 200, db.areas || []);
    if (req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const newArea = {
          id: `AREA-${Date.now()}`,
          codigo: body.codigo.trim().toUpperCase(),
          nombre: body.nombre.trim(),
          descripcion: body.descripcion ? body.descripcion.trim() : '',
          activa: true
        };
        db.areas.push(newArea);
        await saveDatabase(db);
        return sendJSON(res, 201, newArea);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }
  }

  const matchArea = pathname.match(/^\/api\/areas\/([^/]+)$/);
  if (matchArea) {
    const areaId = matchArea[1];
    const db = await loadDatabase();
    const index = db.areas.findIndex(a => a.id === areaId);
    if (index === -1) return sendJSON(res, 404, { error: 'Área no encontrada' });

    if (req.method === 'PUT') {
      try {
        const body = await parseRequestBody(req);
        db.areas[index] = { ...db.areas[index], ...body, id: areaId };
        await saveDatabase(db);
        return sendJSON(res, 200, db.areas[index]);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (req.method === 'DELETE') {
      // Validar si tiene equipos asociados
      const hasEquipos = (db.equipos || []).some(e => e.areaId === areaId);
      if (hasEquipos) {
        return sendJSON(res, 400, { error: 'No se puede eliminar el área porque tiene equipos asociados' });
      }
      const deleted = db.areas.splice(index, 1)[0];
      await saveDatabase(db);
      return sendJSON(res, 200, { message: 'Área eliminada', deleted });
    }
  }

  // 7. CATÁLOGO: EQUIPOS
  if (pathname === '/api/equipos') {
    const db = await loadDatabase();
    if (req.method === 'GET') return sendJSON(res, 200, db.equipos || []);
    if (req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const newEq = {
          id: `EQ-${Date.now()}`,
          codigo: body.codigo.trim().toUpperCase(),
          nombre: body.nombre.trim(),
          areaId: body.areaId,
          ubicacion: body.ubicacion ? body.ubicacion.trim() : 'Nave General',
          estado: body.estado || 'Operativo',
          criticidad: body.criticidad || 'Media'
        };
        db.equipos.push(newEq);
        await saveDatabase(db);
        return sendJSON(res, 201, newEq);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }
  }

  const matchEquipo = pathname.match(/^\/api\/equipos\/([^/]+)$/);
  if (matchEquipo) {
    const eqId = matchEquipo[1];
    const db = await loadDatabase();
    const index = db.equipos.findIndex(e => e.id === eqId);
    if (index === -1) return sendJSON(res, 404, { error: 'Equipo no encontrado' });

    if (req.method === 'PUT') {
      try {
        const body = await parseRequestBody(req);
        db.equipos[index] = { ...db.equipos[index], ...body, id: eqId };
        await saveDatabase(db);
        return sendJSON(res, 200, db.equipos[index]);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (req.method === 'DELETE') {
      const deleted = db.equipos.splice(index, 1)[0];
      await saveDatabase(db);
      return sendJSON(res, 200, { message: 'Equipo eliminado', deleted });
    }
  }

  // 8. CATÁLOGO: EMPLEADOS Y TÉCNICOS
  if (pathname === '/api/empleados') {
    const db = await loadDatabase();
    if (req.method === 'GET') return sendJSON(res, 200, db.empleados || []);
    if (req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        const newEmp = {
          id: `EMP-${Date.now()}`,
          nombre: body.nombre.trim(),
          especialidad: body.especialidad.trim(),
          rol: body.rol || 'Técnico', // Técnico | Solicitante | Supervisor
          telefono: body.telefono ? body.telefono.trim() : '',
          activo: true
        };
        db.empleados.push(newEmp);
        await saveDatabase(db);
        return sendJSON(res, 201, newEmp);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }
  }

  const matchEmpleado = pathname.match(/^\/api\/empleados\/([^/]+)$/);
  if (matchEmpleado) {
    const empId = matchEmpleado[1];
    const db = await loadDatabase();
    const index = db.empleados.findIndex(e => e.id === empId);
    if (index === -1) return sendJSON(res, 404, { error: 'Empleado no encontrado' });

    if (req.method === 'PUT') {
      try {
        const body = await parseRequestBody(req);
        db.empleados[index] = { ...db.empleados[index], ...body, id: empId };
        await saveDatabase(db);
        return sendJSON(res, 200, db.empleados[index]);
      } catch (err) {
        return sendJSON(res, 400, { error: err.message });
      }
    }

    if (req.method === 'DELETE') {
      const deleted = db.empleados.splice(index, 1)[0];
      await saveDatabase(db);
      return sendJSON(res, 200, { message: 'Empleado eliminado', deleted });
    }
  }

  // 9. CONFIGURACIÓN Y RESPALDOS
  if (pathname === '/api/config' && req.method === 'PUT') {
    try {
      const body = await parseRequestBody(req);
      const db = await loadDatabase();
      db.config = { ...db.config, ...body };
      await saveDatabase(db);
      return sendJSON(res, 200, db.config);
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  if (pathname === '/api/reset-demo' && req.method === 'POST') {
    await saveDatabase(INITIAL_SEED, 'demo');
    return sendJSON(res, 200, { message: 'Base de datos restaurada a valores de demostración iniciales' });
  }

  if (pathname === '/api/restore' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      if (!body.areas || !body.equipos || !body.solicitudes) {
        return sendJSON(res, 400, { error: 'Archivo de respaldo inválido o incompleto' });
      }
      await saveDatabase(body);
      return sendJSON(res, 200, { message: 'Base de datos restaurada exitosamente' });
    } catch (err) {
      return sendJSON(res, 400, { error: err.message });
    }
  }

  // ==========================================
  // SERVIDOR DE ARCHIVOS ESTÁTICOS (FRONTEND)
  // ==========================================
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = 'index.html';
  } else {
    safePath = safePath.replace(/^[/\\]/, '');
  }

  const filePath = path.join(__dirname, safePath);

  // Verificar existencia de archivo
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Si la ruta no existe y no empieza por /api, servir index.html (SPA Fallback)
      if (!pathname.startsWith('/api/')) {
        const indexPath = path.join(__dirname, 'index.html');
        return fs.readFile(indexPath, (err2, content) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 No Encontrado');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
          }
        });
      }
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Error de Lectura del Archivo');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
});

// Iniciar Servidor Asíncrono
async function startServer() {
  ensureDatabase();
  await initMongo();

  server.listen(PORT, '0.0.0.0', async () => {
    const ips = getLocalIPs();
    const currentEnv = await getActiveEnv();
    console.log('\n======================================================================');
    console.log('  🏭 CMMS MANTENIMIENTO INDUSTRIAL - SERVIDOR MULTIUSUARIO Y CLOUD');
    console.log('======================================================================');
    console.log(`  🟢 Servidor Activo:   http://localhost:${PORT}/`);
    ips.forEach(ip => {
      console.log(`  🌐 Acceso en Red LAN: http://${ip}:${PORT}/  (Para tablets y otras PCs)`);
    });
    console.log(`  📦 Entorno Inicial:   [${currentEnv.toUpperCase()}]`);
    console.log(`  💾 Modo Almacén:      ${mongoReady ? '☁️ MongoDB Atlas (Persistencia Permanente en la Nube)' : '📁 Archivos JSON Locales (data/)'}`);
    console.log('  📡 Tiempo Real SSE:   Activo en /api/events');
    console.log('======================================================================\n');
  });
}

startServer();
