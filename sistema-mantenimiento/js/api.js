/**
 * api.js - Capa de Comunicación con el Servidor Centralizado y Tiempo Real SSE
 * Maneja llamadas RESTful a la API de Node.js y escucha eventos de sincronización multiusuario.
 */

class CMMSApiClient {
  constructor() {
    this.baseUrl = window.location.origin;
    this.isOnline = true;
    this.eventSource = null;
    this.listeners = [];
  }

  // Suscribirse a cambios en tiempo real
  onSync(callback) {
    this.listeners.push(callback);
  }

  emitSync(eventType, data) {
    this.listeners.forEach(cb => {
      try { cb(eventType, data); } catch (e) { console.error('Error en listener de sincronización:', e); }
    });
  }

  // Iniciar conexión SSE para recibir cambios de otros equipos
  initRealtime() {
    if (typeof EventSource === 'undefined') return;

    // Solo conectar si no estamos abriendo como file://
    if (window.location.protocol.startsWith('http')) {
      try {
        if (this.eventSource) this.eventSource.close();
        this.eventSource = new EventSource('/api/events');

        this.eventSource.addEventListener('connected', () => {
          this.isOnline = true;
          this.updateConnectionStatus(true);
        });

        this.eventSource.addEventListener('update', (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emitSync('remote-update', data);
          } catch (e) {
            console.error('Error parseando SSE:', e);
          }
        });

        this.eventSource.onerror = () => {
          this.isOnline = false;
          this.updateConnectionStatus(false);
        };
      } catch (err) {
        console.warn('No se pudo establecer SSE con el servidor:', err);
      }
    }
  }

  updateConnectionStatus(online) {
    const dot = document.querySelector('.status-indicator-dot');
    const label = document.getElementById('headerLiveStatus');
    if (dot && label) {
      if (online) {
        dot.style.background = '#10b981'; // verde
        dot.style.boxShadow = '0 0 8px #10b981';
        label.textContent = 'En Línea (Sincronizado)';
      } else {
        dot.style.background = '#f59e0b'; // ambar
        dot.style.boxShadow = '0 0 8px #f59e0b';
        label.textContent = 'Modo Local / Reconectando...';
      }
    }
  }

  async fetchJSON(endpoint, options = {}) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn(`[API] Fallo en ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Obtener toda la información inicial
  async getAllData() {
    return await this.fetchJSON('/api/data');
  }

  // Solicitudes
  async getSolicitudes() {
    return await this.fetchJSON('/api/solicitudes');
  }

  async createSolicitud(solicitud) {
    return await this.fetchJSON('/api/solicitudes', {
      method: 'POST',
      body: JSON.stringify(solicitud)
    });
  }

  async updateSolicitud(id, patch) {
    return await this.fetchJSON(`/api/solicitudes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch)
    });
  }

  async deleteSolicitud(id) {
    return await this.fetchJSON(`/api/solicitudes/${id}`, {
      method: 'DELETE'
    });
  }

  // Preventivos
  async getPreventivos() {
    return await this.fetchJSON('/api/preventivos');
  }

  async createPreventivo(preventivo) {
    return await this.fetchJSON('/api/preventivos', {
      method: 'POST',
      body: JSON.stringify(preventivo)
    });
  }

  async updatePreventivo(id, patch) {
    return await this.fetchJSON(`/api/preventivos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch)
    });
  }

  async deletePreventivo(id) {
    return await this.fetchJSON(`/api/preventivos/${id}`, {
      method: 'DELETE'
    });
  }

  // Catálogo: Áreas
  async createArea(area) {
    return await this.fetchJSON('/api/areas', {
      method: 'POST',
      body: JSON.stringify(area)
    });
  }

  async updateArea(id, area) {
    return await this.fetchJSON(`/api/areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(area)
    });
  }

  async deleteArea(id) {
    return await this.fetchJSON(`/api/areas/${id}`, {
      method: 'DELETE'
    });
  }

  // Catálogo: Equipos
  async createEquipo(equipo) {
    return await this.fetchJSON('/api/equipos', {
      method: 'POST',
      body: JSON.stringify(equipo)
    });
  }

  async updateEquipo(id, equipo) {
    return await this.fetchJSON(`/api/equipos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(equipo)
    });
  }

  async deleteEquipo(id) {
    return await this.fetchJSON(`/api/equipos/${id}`, {
      method: 'DELETE'
    });
  }

  // Catálogo: Empleados
  async createEmpleado(empleado) {
    return await this.fetchJSON('/api/empleados', {
      method: 'POST',
      body: JSON.stringify(empleado)
    });
  }

  async updateEmpleado(id, empleado) {
    return await this.fetchJSON(`/api/empleados/${id}`, {
      method: 'PUT',
      body: JSON.stringify(empleado)
    });
  }

  async deleteEmpleado(id) {
    return await this.fetchJSON(`/api/empleados/${id}`, {
      method: 'DELETE'
    });
  }

  // Config y Utilidades
  async updateConfig(config) {
    return await this.fetchJSON('/api/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  }

  async resetDemo() {
    return await this.fetchJSON('/api/reset-demo', {
      method: 'POST'
    });
  }

  // Gestión de Entornos (Real vs Prueba)
  async getEnvironment() {
    return await this.fetchJSON('/api/environment');
  }

  async switchEnvironment(env) {
    return await this.fetchJSON('/api/environment/switch', {
      method: 'POST',
      body: JSON.stringify({ env })
    });
  }

  async resetRealEnvironment() {
    return await this.fetchJSON('/api/environment/reset-real', {
      method: 'POST'
    });
  }

  async cloneCatalogToReal() {
    return await this.fetchJSON('/api/environment/clone-catalog-to-real', {
      method: 'POST'
    });
  }
}

// Instancia global
window.cmmsApi = new CMMSApiClient();
