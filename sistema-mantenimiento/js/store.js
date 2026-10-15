/**
 * Store.js - Capa de Estado y Datos para CMMS Industrial
 * Conecta con el servidor centralizado Node.js y mantiene caché local de respaldo.
 * Soporta Solicitudes, Preventivos, Catálogos y Costos de Contratistas.
 */

// Datos semilla para funcionamiento autónomo inmediato
const SEED_FALLBACK = {
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
      estado: 'Culminada',
      tipoEjecutor: 'Interno',
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
      estado: 'Vencido',
      responsableId: 'EMP-1',
      tipoEjecutor: 'Interno',
      contratistaPrevisto: null,
      costoEstimado: 0,
      tareas: ['Inspeccionar tensión de cadena principal', 'Lubricar con grasa sanitaria grado H1'],
      observaciones: 'Requiere bloqueo LOTO.'
    }
  ]
};

class CMMSStore {
  constructor() {
    this.storageKey = 'cmms_industrial_data_v2';
    this.roleKey = 'cmms_active_role';
    this.api = window.cmmsApi;
    this.isServerConnected = false;

    // Estado en memoria inicial
    this.data = JSON.parse(JSON.stringify(SEED_FALLBACK));

    // Rol activo por defecto: 'produccion'
    this.currentRole = localStorage.getItem(this.roleKey) || 'produccion';
  }

  // Inicialización del almacén
  async init() {
    // 1. Intentar cargar desde el servidor backend
    if (window.location.protocol.startsWith('http')) {
      try {
        const serverData = await this.api.getAllData();
        if (serverData && serverData.solicitudes) {
          this.data = serverData;
          this.isServerConnected = true;
          this.saveLocalCache();
          this.setupRealtimeListener();
          return;
        }
      } catch (err) {
        console.warn('⚠️ No se pudo conectar con el servidor, cargando caché local:', err.message);
      }
    }

    // 2. Fallback: cargar desde localStorage
    const cached = localStorage.getItem(this.storageKey);
    if (cached) {
      try {
        this.data = JSON.parse(cached);
      } catch (e) {
        console.error('Error parseando caché local:', e);
      }
    }

    // 3. Si sigue vacío o sin áreas, asegurar SEED_FALLBACK
    if (!this.data.areas || this.data.areas.length === 0) {
      this.data = JSON.parse(JSON.stringify(SEED_FALLBACK));
      this.saveLocalCache();
    }
  }

  saveLocalCache() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn('No se pudo guardar caché local:', e);
    }
  }

  setupRealtimeListener() {
    this.api.onSync(async (type, payload) => {
      try {
        const fresh = await this.api.getAllData();
        if (fresh && fresh.solicitudes) {
          this.data = fresh;
          this.saveLocalCache();
          window.dispatchEvent(new CustomEvent('cmms:data-updated'));
        }
      } catch (e) {
        console.error('Error actualizando por evento en tiempo real:', e);
      }
    });
    this.api.initRealtime();
  }

  // GESTIÓN DE ENTORNOS (REAL VS DEMO)
  getEnvironment() {
    return this.data.environment || 'demo';
  }

  async switchEnvironment(targetEnv) {
    if (this.isServerConnected) {
      try {
        const res = await this.api.switchEnvironment(targetEnv);
        if (res && res.data) {
          this.data = res.data;
          this.saveLocalCache();
          window.dispatchEvent(new CustomEvent('cmms:env-changed', { detail: { env: targetEnv } }));
          window.dispatchEvent(new CustomEvent('cmms:data-updated'));
          return res;
        }
      } catch (e) {
        console.error('Error cambiando de entorno en servidor:', e);
      }
    }
    // Fallback local
    this.data.environment = targetEnv;
    this.saveLocalCache();
    window.dispatchEvent(new CustomEvent('cmms:env-changed', { detail: { env: targetEnv } }));
    window.dispatchEvent(new CustomEvent('cmms:data-updated'));
    return { activeEnv: targetEnv, data: this.data };
  }

  async resetRealEnvironment() {
    if (this.isServerConnected) {
      await this.api.resetRealEnvironment();
      const fresh = await this.api.getAllData();
      this.data = fresh;
      this.saveLocalCache();
      window.dispatchEvent(new CustomEvent('cmms:data-updated'));
      return;
    }
    this.data.areas = [];
    this.data.equipos = [];
    this.data.solicitudes = [];
    this.data.preventivos = [];
    this.saveLocalCache();
    window.dispatchEvent(new CustomEvent('cmms:data-updated'));
  }

  async cloneCatalogToReal() {
    if (this.isServerConnected) {
      await this.api.cloneCatalogToReal();
      const fresh = await this.api.getAllData();
      this.data = fresh;
      this.saveLocalCache();
      window.dispatchEvent(new CustomEvent('cmms:data-updated'));
    }
  }

  // GESTIÓN DE ROLES
  getRole() {
    return this.currentRole; // 'produccion' | 'mantenimiento' | 'admin'
  }

  setRole(role) {
    this.currentRole = role;
    localStorage.setItem(this.roleKey, role);
    window.dispatchEvent(new CustomEvent('cmms:role-changed', { detail: { role } }));
  }

  verifyPin(role, inputPin) {
    const cfg = this.data.config || {};
    if (role === 'mantenimiento') {
      return String(inputPin) === String(cfg.pinMantenimiento || '1234');
    }
    if (role === 'admin') {
      return String(inputPin) === String(cfg.pinAdmin || '9999');
    }
    return true;
  }

  // CONFIG
  getConfig() {
    const cfg = this.data.config || {};
    return {
      nombreEmpresa: cfg.nombreEmpresa || 'Planta Industrial Central',
      moneda: cfg.moneda || '$',
      horasTurnoDia: Number(cfg.horasTurnoDia) > 0 && Number(cfg.horasTurnoDia) !== 24 ? Number(cfg.horasTurnoDia) : 8,
      diasLaboralesSemana: Number(cfg.diasLaboralesSemana) > 0 ? Number(cfg.diasLaboralesSemana) : 6,
      pinMantenimiento: cfg.pinMantenimiento || '1234',
      pinAdmin: cfg.pinAdmin || '9999'
    };
  }

  async updateConfig(newConfig) {
    this.data.config = { ...this.data.config, ...newConfig };
    this.saveLocalCache();
    if (this.isServerConnected) {
      try { await this.api.updateConfig(this.data.config); } catch (e) {}
    }
    return this.data.config;
  }

  // SOLICITUDES
  getSolicitudes() {
    return this.data.solicitudes || [];
  }

  getSolicitudById(id) {
    return (this.data.solicitudes || []).find(s => s.id === id);
  }

  async createSolicitud(nueva) {
    const maxFolio = (this.data.solicitudes || []).reduce((max, s) => Math.max(max, s.folio || 0), 0);
    const nextFolio = maxFolio + 1;
    const id = `SOL-2026-${String(nextFolio).padStart(3, '0')}`;
    const tipoSolicitud = nueva.tipoSolicitud === 'Requerimiento' ? 'Requerimiento' : 'Averia';
    const isReq = tipoSolicitud === 'Requerimiento';
    const equipoId = isReq ? null : (nueva.equipoId || null);

    const getLocalNow = () => {
      const d = new Date();
      const tzOffset = d.getTimezoneOffset() * 60000;
      return (new Date(d - tzOffset)).toISOString().slice(0, 16);
    };

    const solicitudObj = {
      id,
      folio: nextFolio,
      tipoSolicitud, // 'Averia' | 'Requerimiento'
      fechaSolicitud: nueva.fechaSolicitud || getLocalNow(),
      solicitante: nueva.solicitante.trim(),
      turno: nueva.turno || 'Mañana',
      areaId: nueva.areaId,
      equipoId,
      tipoFalla: nueva.tipoFalla || (isReq ? 'Servicios Generales' : 'Mecánica'),
      criticidad: nueva.criticidad || 'Media',
      descripcion: nueva.descripcion.trim(),
      estado: 'Pendiente',
      tipoEjecutor: null,
      tecnicoId: null,
      contratista: null,
      fechaAsignacion: null,
      fechaInicio: null,
      fechaFin: null,
      horasParadaDecimal: 0,
      horasParadaTexto: isReq ? 'No aplica (Operativo)' : 'Por iniciar',
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
      observaciones: nueva.observaciones ? nueva.observaciones.trim() : ''
    };

    // Actualizar local
    this.data.solicitudes.unshift(solicitudObj);
    this.saveLocalCache();

    // Enviar a servidor
    if (this.isServerConnected) {
      try {
        const res = await this.api.createSolicitud(solicitudObj);
        if (res && res.id) {
          solicitudObj.id = res.id;
          solicitudObj.folio = res.folio;
        }
      } catch (err) {
        console.warn('Guardado en caché local, error al sincronizar con backend:', err);
      }
    }

    return solicitudObj;
  }

  async updateSolicitud(id, patch) {
    const index = (this.data.solicitudes || []).findIndex(s => s.id === id);
    if (index === -1) return null;

    const actual = this.data.solicitudes[index];
    const updated = { ...actual, ...patch, id };
    const isReq = (updated.tipoSolicitud === 'Requerimiento' || !updated.equipoId);

    const getLocalNow = () => {
      const d = new Date();
      const tzOffset = d.getTimezoneOffset() * 60000;
      return (new Date(d - tzOffset)).toISOString().slice(0, 16);
    };

    // Si la orden fue cancelada / desestimada
    if (updated.estado === 'Cancelada') {
      updated.horasParadaDecimal = 0;
      updated.horasParadaTexto = 'Anulada';
      updated.minutosParadaTotal = 0;
      updated.horasAtencionDecimal = 0;
      updated.horasAtencionTexto = 'Anulada';
      updated.minutosAtencionTotal = 0;
    }
    // Si se culmina la intervención / requerimiento
    else if (updated.estado === 'Culminada' || (updated.fechaInicio && updated.fechaFin)) {
      const inicio = updated.fechaInicio || (isReq ? (updated.fechaAsignacion || updated.fechaSolicitud) : updated.fechaSolicitud);
      const fin = updated.fechaFin || getLocalNow();
      updated.fechaInicio = inicio;
      updated.fechaFin = fin;

      const calculo = this.calcularHorasParada(inicio, fin);
      if (isReq) {
        // En requerimientos no hay parada de equipo (línea operativa)
        updated.horasParadaDecimal = 0;
        updated.horasParadaTexto = 'No aplica (Operativo)';
        updated.minutosParadaTotal = 0;
        // Se registra tiempo de atención técnica
        updated.horasAtencionDecimal = (patch.horasAtencionDecimal !== undefined && patch.horasAtencionDecimal > 0)
          ? patch.horasAtencionDecimal
          : calculo.decimal;
        updated.horasAtencionTexto = (patch.horasAtencionTexto && patch.horasAtencionTexto !== '0h 00m')
          ? patch.horasAtencionTexto
          : calculo.texto;
        updated.minutosAtencionTotal = (patch.minutosAtencionTotal !== undefined && patch.minutosAtencionTotal > 0)
          ? patch.minutosAtencionTotal
          : calculo.minutos;
      } else {
        // En avería de equipo se registran horas de parada
        updated.horasParadaDecimal = (patch.horasParadaDecimal !== undefined && patch.horasParadaDecimal > 0)
          ? patch.horasParadaDecimal
          : calculo.decimal;
        updated.horasParadaTexto = (patch.horasParadaTexto && patch.horasParadaTexto !== '0h 00m')
          ? patch.horasParadaTexto
          : calculo.texto;
        updated.minutosParadaTotal = (patch.minutosParadaTotal !== undefined && patch.minutosParadaTotal > 0)
          ? patch.minutosParadaTotal
          : calculo.minutos;
        updated.horasAtencionDecimal = updated.horasParadaDecimal;
        updated.horasAtencionTexto = updated.horasParadaTexto;
        updated.minutosAtencionTotal = updated.minutosParadaTotal;
      }
    } else if (updated.fechaInicio && !updated.fechaFin) {
      if (isReq) {
        updated.horasParadaTexto = 'No aplica (Operativo)';
        updated.horasParadaDecimal = 0;
        updated.minutosParadaTotal = 0;
        updated.horasAtencionTexto = 'En curso...';
      } else {
        updated.horasParadaTexto = 'En curso...';
        updated.horasParadaDecimal = 0;
        updated.minutosParadaTotal = 0;
        updated.horasAtencionTexto = 'En curso...';
      }
    }

    this.data.solicitudes[index] = updated;
    this.saveLocalCache();

    if (this.isServerConnected) {
      try {
        await this.api.updateSolicitud(id, updated);
      } catch (e) {
        console.warn('Error sincronizando actualización en servidor:', e);
      }
    }

    return updated;
  }

  async deleteSolicitud(id) {
    const index = (this.data.solicitudes || []).findIndex(s => s.id === id);
    if (index === -1) return false;

    this.data.solicitudes.splice(index, 1);
    this.saveLocalCache();

    if (this.isServerConnected) {
      try { await this.api.deleteSolicitud(id); } catch (e) {}
    }
    return true;
  }

  // PREVENTIVOS
  getPreventivos() {
    return this.data.preventivos || [];
  }

  getPreventivoById(id) {
    return (this.data.preventivos || []).find(p => p.id === id);
  }

  async createPreventivo(nuevo) {
    const id = `PREV-${String(Date.now()).slice(-5)}`;
    const mapDias = { 'Semanal': 7, 'Quincenal': 15, 'Mensual': 30, 'Bimestral': 60, 'Trimestral': 90, 'Semestral': 180, 'Anual': 365 };
    const diasFrecuenciaCalculado = Number(nuevo.diasFrecuencia) > 0 
      ? Number(nuevo.diasFrecuencia) 
      : (mapDias[nuevo.frecuencia] || 30);

    const prevObj = {
      id,
      codigo: nuevo.codigo || `MP-${id}`,
      titulo: nuevo.titulo.trim(),
      equipoId: nuevo.equipoId,
      areaId: nuevo.areaId,
      frecuencia: nuevo.frecuencia || 'Mensual',
      diasFrecuencia: diasFrecuenciaCalculado,
      ultimaEjecucion: nuevo.ultimaEjecucion || null,
      vecesEjecutado: Number(nuevo.vecesEjecutado) || 0,
      proximaFecha: nuevo.proximaFecha,
      estado: this.evaluarEstadoPreventivo(nuevo.proximaFecha),
      responsableId: nuevo.responsableId || null,
      tipoEjecutor: nuevo.tipoEjecutor || 'Interno',
      contratistaPrevisto: nuevo.contratistaPrevisto || null,
      costoEstimado: Number(nuevo.costoEstimado) || 0,
      tareas: Array.isArray(nuevo.tareas) ? nuevo.tareas : [],
      observaciones: nuevo.observaciones ? nuevo.observaciones.trim() : ''
    };

    this.data.preventivos = this.data.preventivos || [];
    this.data.preventivos.push(prevObj);
    this.saveLocalCache();

    if (this.isServerConnected) {
      try {
        const res = await this.api.createPreventivo(prevObj);
        if (res && res.id) prevObj.id = res.id;
      } catch (e) {}
    }

    return prevObj;
  }

  async updatePreventivo(id, patch) {
    const index = (this.data.preventivos || []).findIndex(p => p.id === id);
    if (index === -1) return null;

    const actual = this.data.preventivos[index];
    const updated = { ...actual, ...patch, id };

    if (updated.proximaFecha) {
      updated.estado = this.evaluarEstadoPreventivo(updated.proximaFecha);
    }

    this.data.preventivos[index] = updated;
    this.saveLocalCache();

    if (this.isServerConnected) {
      try { await this.api.updatePreventivo(id, updated); } catch (e) {}
    }
    return updated;
  }

  async deletePreventivo(id) {
    const index = (this.data.preventivos || []).findIndex(p => p.id === id);
    if (index === -1) return false;

    this.data.preventivos.splice(index, 1);
    this.saveLocalCache();

    if (this.isServerConnected) {
      try { await this.api.deletePreventivo(id); } catch (e) {}
    }
    return true;
  }

  evaluarEstadoPreventivo(proximaFechaStr) {
    if (!proximaFechaStr) return 'Al Día';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const proxima = new Date(proximaFechaStr);
    proxima.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((proxima - hoy) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Vencido';
    if (diffDays <= 5) return 'Próximo';
    return 'Al Día';
  }

  // Convertir Preventivo a Orden de Trabajo Real
  async generarOTDesdePreventivo(prevId) {
    const prev = this.getPreventivoById(prevId);
    if (!prev) return null;

    const eq = this.getEquipoById(prev.equipoId);
    const tareasTexto = (prev.tareas || []).map((t, idx) => `${idx + 1}. ${t}`).join('\n');

    const nuevaSol = {
      solicitante: 'Planificador de Preventivo (Sistema)',
      turno: 'Programado',
      areaId: prev.areaId,
      equipoId: prev.equipoId,
      tipoFalla: 'Mantenimiento Preventivo',
      criticidad: 'Media',
      descripcion: `[PLAN PREVENTIVO ${prev.codigo}] - ${prev.titulo}\nChecklist:\n${tareasTexto}`,
      observaciones: prev.observaciones || ''
    };

    const sol = await this.createSolicitud(nuevaSol);

    // Asignar responsable o contratista según el plan
    const patch = {
      tipoEjecutor: prev.tipoEjecutor,
      estado: 'Asignada',
      fechaAsignacion: new Date().toISOString().slice(0, 16)
    };

    if (prev.tipoEjecutor === 'Interno') {
      patch.tecnicoId = prev.responsableId;
    } else {
      patch.contratista = {
        nombre: prev.contratistaPrevisto ? prev.contratistaPrevisto.nombre : 'Contratista Externo',
        ordenCompra: `OC-PREV-${Date.now().toString().slice(-4)}`,
        costo: prev.costoEstimado || 0
      };
    }

    await this.updateSolicitud(sol.id, patch);

    // Reprogramar fecha del preventivo
    const prox = new Date();
    prox.setDate(prox.getDate() + (prev.diasFrecuencia || 30));
    await this.updatePreventivo(prev.id, {
      ultimaEjecucion: new Date().toISOString().slice(0, 10),
      proximaFecha: prox.toISOString().slice(0, 10),
      vecesEjecutado: (Number(prev.vecesEjecutado) || 0) + 1,
      ultimaOTId: sol.id
    });

    return sol;
  }

  // ÁREAS
  getAreas() {
    return this.data.areas || [];
  }

  getAreaById(id) {
    return (this.data.areas || []).find(a => a.id === id);
  }

  async createArea(area) {
    const newArea = {
      id: `AREA-${Date.now()}`,
      codigo: area.codigo.trim().toUpperCase(),
      nombre: area.nombre.trim(),
      descripcion: area.descripcion ? area.descripcion.trim() : '',
      activa: true
    };
    this.data.areas = this.data.areas || [];
    this.data.areas.push(newArea);
    this.saveLocalCache();

    if (this.isServerConnected) {
      try { await this.api.createArea(newArea); } catch (e) {}
    }
    return newArea;
  }

  async updateArea(id, patch) {
    const index = (this.data.areas || []).findIndex(a => a.id === id);
    if (index === -1) return null;
    this.data.areas[index] = { ...this.data.areas[index], ...patch, id };
    this.saveLocalCache();
    if (this.isServerConnected) {
      try { await this.api.updateArea(id, this.data.areas[index]); } catch (e) {}
    }
    return this.data.areas[index];
  }

  async deleteArea(id) {
    const hasEquipos = (this.data.equipos || []).some(e => e.areaId === id);
    if (hasEquipos) {
      throw new Error('No se puede eliminar el área porque tiene equipos asociados.');
    }
    const index = (this.data.areas || []).findIndex(a => a.id === id);
    if (index === -1) return false;
    this.data.areas.splice(index, 1);
    this.saveLocalCache();
    if (this.isServerConnected) {
      try { await this.api.deleteArea(id); } catch (e) {}
    }
    return true;
  }

  // EQUIPOS
  getEquipos() {
    return this.data.equipos || [];
  }

  getEquipoById(id) {
    return (this.data.equipos || []).find(e => e.id === id);
  }

  getEquiposByArea(areaId) {
    if (!areaId || areaId === 'Todas') return this.getEquipos();
    return (this.data.equipos || []).filter(e => e.areaId === areaId);
  }

  async createEquipo(eq) {
    const newEq = {
      id: `EQ-${Date.now()}`,
      codigo: eq.codigo.trim().toUpperCase(),
      nombre: eq.nombre.trim(),
      areaId: eq.areaId,
      ubicacion: eq.ubicacion ? eq.ubicacion.trim() : 'Nave Principal',
      estado: eq.estado || 'Operativo',
      criticidad: eq.criticidad || 'Media'
    };
    this.data.equipos = this.data.equipos || [];
    this.data.equipos.push(newEq);
    this.saveLocalCache();
    if (this.isServerConnected) {
      try { await this.api.createEquipo(newEq); } catch (e) {}
    }
    return newEq;
  }

  async updateEquipo(id, patch) {
    const index = (this.data.equipos || []).findIndex(e => e.id === id);
    if (index === -1) return null;
    this.data.equipos[index] = { ...this.data.equipos[index], ...patch, id };
    this.saveLocalCache();
    if (this.isServerConnected) {
      try { await this.api.updateEquipo(id, this.data.equipos[index]); } catch (e) {}
    }
    return this.data.equipos[index];
  }

  async deleteEquipo(id) {
    const hasSolicitudes = (this.data.solicitudes || []).some(s => s.equipoId === id);
    if (hasSolicitudes) {
      throw new Error('No se puede eliminar el equipo porque tiene historial de solicitudes registradas.');
    }
    const index = (this.data.equipos || []).findIndex(e => e.id === id);
    if (index === -1) return false;
    this.data.equipos.splice(index, 1);
    this.saveLocalCache();
    if (this.isServerConnected) {
      try { await this.api.deleteEquipo(id); } catch (e) {}
    }
    return true;
  }

  // EMPLEADOS Y TÉCNICOS
  getEmpleados() {
    return this.data.empleados || [];
  }

  getTecnicos() {
    // Retorna solo empleados con rol Técnico o Supervisor que pueden atender OTs
    return (this.data.empleados || []).filter(e => e.activo && (e.rol === 'Técnico' || e.rol === 'Supervisor'));
  }

  getEmpleadoById(id) {
    return (this.data.empleados || []).find(e => e.id === id);
  }

  async createEmpleado(emp) {
    const newEmp = {
      id: `EMP-${Date.now()}`,
      nombre: emp.nombre.trim(),
      especialidad: emp.especialidad.trim(),
      rol: emp.rol || 'Técnico',
      telefono: emp.telefono ? emp.telefono.trim() : '',
      activo: true
    };
    this.data.empleados = this.data.empleados || [];
    this.data.empleados.push(newEmp);
    this.saveLocalCache();
    if (this.isServerConnected) {
      try { await this.api.createEmpleado(newEmp); } catch (e) {}
    }
    return newEmp;
  }

  async updateEmpleado(id, patch) {
    const index = (this.data.empleados || []).findIndex(e => e.id === id);
    if (index === -1) return null;
    this.data.empleados[index] = { ...this.data.empleados[index], ...patch, id };
    this.saveLocalCache();
    if (this.isServerConnected) {
      try { await this.api.updateEmpleado(id, this.data.empleados[index]); } catch (e) {}
    }
    return this.data.empleados[index];
  }

  async deleteEmpleado(id) {
    const index = (this.data.empleados || []).findIndex(e => e.id === id);
    if (index === -1) return false;
    this.data.empleados.splice(index, 1);
    this.saveLocalCache();
    if (this.isServerConnected) {
      try { await this.api.deleteEmpleado(id); } catch (e) {}
    }
    return true;
  }

  // UTILIDADES DE CÁLCULO DE PARADA
  calcularHorasParada(fechaInicioStr, fechaFinStr) {
    if (!fechaInicioStr || !fechaFinStr) {
      return { decimal: 0, minutos: 0, texto: '0h 00m' };
    }

    const inicio = new Date(fechaInicioStr);
    const fin = new Date(fechaFinStr);
    const diffMs = fin.getTime() - inicio.getTime();

    if (diffMs <= 0 || isNaN(diffMs)) {
      return { decimal: 0, minutos: 0, texto: '0h 00m' };
    }

    let totalMinutos = Math.round(diffMs / (1000 * 60));
    if (totalMinutos === 0 && diffMs > 0) {
      totalMinutos = 1;
    }
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    const decimal = Number((totalMinutos / 60).toFixed(2));

    return {
      decimal,
      minutos: totalMinutos,
      texto: `${horas}h ${minutos.toString().padStart(2, '0')}m`
    };
  }

  // RESET DEMO
  async resetToSeed() {
    if (this.isServerConnected) {
      try {
        await this.api.resetDemo();
        const fresh = await this.api.getAllData();
        this.data = fresh;
        this.saveLocalCache();
        return;
      } catch (e) {}
    }
    // Si no hay server, cargar valores base directamente
    this.data = JSON.parse(JSON.stringify(SEED_FALLBACK));
    this.saveLocalCache();
  }
}

// Instancia global
window.cmmsStore = new CMMSStore();
window.dataStore = window.cmmsStore;
