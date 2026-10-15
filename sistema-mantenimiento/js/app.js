/**
 * App.js - Controlador Principal del Sistema CMMS de Mantenimiento Industrial
 * Conecta UI con Store y Analytics, gestiona roles, sincronización en tiempo real,
 * módulos de Producción, Gerencia, Preventivo, Métricas y Administración.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const store = window.cmmsStore;
  const analytics = window.cmmsAnalytics;

  // Estado de la Interfaz
  let currentView = 'produccion';
  let currentAdminPanel = 'panelAdminAreas';
  let dateRangeMetricas = 'all';

  // Helper para datetime-local
  const getLocalDateTimeString = (dateObj = new Date()) => {
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    return (new Date(dateObj - tzOffset)).toISOString().slice(0, 16);
  };

  // Notificaciones Toast
  const showToast = (message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  };

  // Manejo de Modales
  const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  };

  const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  };

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const backdrop = e.target.closest('.modal-backdrop');
      if (backdrop) backdrop.classList.remove('active');
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('active');
    });
  });

  // ==========================================================================
  // GESTIÓN DE ROLES Y CONTROL DE ACCESO
  // ==========================================================================
  const applyRolePermissions = () => {
    const role = store.getRole(); // 'produccion' | 'mantenimiento' | 'admin'
    const headerRoleName = document.getElementById('headerRoleName');
    const headerRoleIcon = document.getElementById('headerRoleIcon');

    const tabProd = document.getElementById('tabBtnProduccion');
    const tabGerencia = document.getElementById('tabBtnGerencia');
    const tabPrev = document.getElementById('tabBtnPreventivo');
    const tabMetricas = document.getElementById('tabBtnMetricas');
    const tabAdmin = document.getElementById('tabBtnAdmin');

    if (role === 'produccion') {
      if (headerRoleName) headerRoleName.textContent = 'Producción';
      if (headerRoleIcon) headerRoleIcon.textContent = '📋';

      // En rol Producción, SOLO se muestra la pestaña de solicitudes
      if (tabProd) tabProd.style.display = 'inline-flex';
      if (tabGerencia) tabGerencia.style.display = 'none';
      if (tabPrev) tabPrev.style.display = 'none';
      if (tabMetricas) tabMetricas.style.display = 'none';
      if (tabAdmin) tabAdmin.style.display = 'none';

      switchView('produccion');
    } else if (role === 'mantenimiento') {
      if (headerRoleName) headerRoleName.textContent = 'Mantenimiento';
      if (headerRoleIcon) headerRoleIcon.textContent = '🛠️';

      if (tabProd) tabProd.style.display = 'inline-flex';
      if (tabGerencia) tabGerencia.style.display = 'inline-flex';
      if (tabPrev) tabPrev.style.display = 'inline-flex';
      if (tabMetricas) tabMetricas.style.display = 'inline-flex';
      if (tabAdmin) tabAdmin.style.display = 'none';

      if (currentView === 'admin') switchView('gerencia');
    } else if (role === 'admin') {
      if (headerRoleName) headerRoleName.textContent = 'Administrador';
      if (headerRoleIcon) headerRoleIcon.textContent = '⚙️';

      if (tabProd) tabProd.style.display = 'inline-flex';
      if (tabGerencia) tabGerencia.style.display = 'inline-flex';
      if (tabPrev) tabPrev.style.display = 'inline-flex';
      if (tabMetricas) tabMetricas.style.display = 'inline-flex';
      if (tabAdmin) tabAdmin.style.display = 'inline-flex';
    }
  };

  // Abrir modal de cambio de perfil
  const btnOpenRole = document.getElementById('btnOpenModalRole');
  if (btnOpenRole) {
    btnOpenRole.addEventListener('click', () => {
      const activeRole = store.getRole();
      const radio = document.querySelector(`input[name="authRoleOption"][value="${activeRole}"]`);
      if (radio) radio.checked = true;

      const pinGroup = document.getElementById('pinInputGroup');
      const pinInput = document.getElementById('authPinValue');
      if (pinInput) pinInput.value = '';

      if (pinGroup) {
        pinGroup.style.display = (activeRole === 'produccion') ? 'none' : 'block';
      }
      openModal('modalAuthPin');
    });
  }

  // Radios en el modal de rol
  document.querySelectorAll('input[name="authRoleOption"]').forEach(r => {
    r.addEventListener('change', (e) => {
      const pinGroup = document.getElementById('pinInputGroup');
      const hint = document.getElementById('pinHintText');
      if (!pinGroup) return;

      if (e.target.value === 'produccion') {
        pinGroup.style.display = 'none';
      } else {
        pinGroup.style.display = 'block';
        if (hint) {
          hint.textContent = e.target.value === 'mantenimiento' ? 'PIN por defecto: 1234' : 'PIN por defecto: 9999';
        }
      }
    });
  });

  // Procesar cambio de rol
  const formAuthPin = document.getElementById('formAuthPin');
  if (formAuthPin) {
    formAuthPin.addEventListener('submit', (e) => {
      e.preventDefault();
      const selected = document.querySelector('input[name="authRoleOption"]:checked');
      if (!selected) return;

      const targetRole = selected.value;
      const pinVal = (document.getElementById('authPinValue')?.value || '').trim();

      if (targetRole !== 'produccion') {
        if (!store.verifyPin(targetRole, pinVal)) {
          showToast('PIN de seguridad incorrecto.', 'error');
          return;
        }
      }

      store.setRole(targetRole);
      applyRolePermissions();
      closeModal('modalAuthPin');
      showToast(`Perfil cambiado exitosamente a: ${targetRole.toUpperCase()}`, 'success');
    });
  }

  // ==========================================================================
  // GESTIÓN DE ENTORNO (REAL EN BLANCO VS DEMOSTRACIÓN)
  // ==========================================================================
  const updateEnvironmentUI = () => {
    const env = store.getEnvironment(); // 'real' | 'demo'
    const btn = document.getElementById('btnOpenModalEnv');
    const icon = document.getElementById('headerEnvIcon');
    const name = document.getElementById('headerEnvName');
    const action = document.getElementById('headerEnvAction');

    if (!btn) return;

    if (env === 'real') {
      btn.className = 'env-badge-button env-real';
      if (icon) icon.textContent = '🏭';
      if (name) name.textContent = 'Entorno Real (Mi Planta)';
      if (action) action.textContent = 'Cambiar a Demo 🔄';
    } else {
      btn.className = 'env-badge-button env-demo';
      if (icon) icon.textContent = '🧪';
      if (name) name.textContent = 'Modo Demostración';
      if (action) action.textContent = 'Cambiar a Real 🔄';
    }
  };

  // Abrir modal de entorno
  document.getElementById('btnOpenModalEnv')?.addEventListener('click', () => {
    const env = store.getEnvironment();
    const radio = document.querySelector(`input[name="targetEnvOption"][value="${env}"]`);
    if (radio) radio.checked = true;
    openModal('modalSwitchEnv');
  });

  document.getElementById('formSwitchEnv')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selected = document.querySelector('input[name="targetEnvOption"]:checked')?.value || 'real';
    await store.switchEnvironment(selected);
    updateEnvironmentUI();
    closeModal('modalSwitchEnv');
    const msg = selected === 'real'
      ? 'Conectado al Entorno Real de Planta (base de datos limpia).'
      : 'Conectado al Entorno de Prueba (Demostración).';
    showToast(msg, 'success');
  });

  // Botones de entorno en panel Admin
  document.getElementById('btnAdminSwitchEnv')?.addEventListener('click', () => {
    const env = store.getEnvironment();
    const radio = document.querySelector(`input[name="targetEnvOption"][value="${env}"]`);
    if (radio) radio.checked = true;
    openModal('modalSwitchEnv');
  });

  document.getElementById('btnAdminCloneCatalog')?.addEventListener('click', async () => {
    if (confirm('¿Desea copiar el catálogo de áreas, equipos y personal de prueba al Entorno Real? (Las solicitudes no se copiarán para mantenerlo limpio).')) {
      await store.cloneCatalogToReal();
      showToast('Catálogo de muestra copiado al Entorno Real.', 'success');
    }
  });

  document.getElementById('btnAdminResetReal')?.addEventListener('click', async () => {
    if (confirm('⚠️ ¿Está completamente seguro de VACIAR el Entorno Real a CERO? Se eliminarán todas las áreas, equipos, empleados y solicitudes registradas en producción real.')) {
      await store.resetRealEnvironment();
      showToast('Entorno Real vaciado a cero (completamente en blanco).', 'success');
    }
  });

  // ==========================================================================
  // NAVEGACIÓN DE PESTAÑAS / VISTAS
  // ==========================================================================
  const navTabs = document.querySelectorAll('.nav-tab-btn');
  const viewSections = document.querySelectorAll('.view-section');

  const switchView = (viewName) => {
    // Proteger según rol
    const role = store.getRole();
    if (role === 'produccion' && viewName !== 'produccion') {
      viewName = 'produccion';
    }
    if (role === 'mantenimiento' && viewName === 'admin') {
      viewName = 'gerencia';
    }

    currentView = viewName;
    navTabs.forEach(tab => {
      if (tab.dataset.view === viewName) tab.classList.add('active');
      else tab.classList.remove('active');
    });

    viewSections.forEach(sec => sec.classList.remove('active'));

    const targetSection = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    if (targetSection) targetSection.classList.add('active');

    // Renderizar datos de la vista
    if (viewName === 'produccion') renderProduccion();
    else if (viewName === 'gerencia') renderGerencia();
    else if (viewName === 'preventivo') renderPreventivo();
    else if (viewName === 'metricas') renderMetricas();
    else if (viewName === 'admin') renderAdmin();

    updateHeaderBadges();
  };

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  // Subnavegación de Administrador
  const adminSubnavBtns = document.querySelectorAll('.admin-subnav-btn');
  const adminPanels = document.querySelectorAll('.admin-panel');

  adminSubnavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const panelId = btn.dataset.adminPanel;
      currentAdminPanel = panelId;

      adminSubnavBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      adminPanels.forEach(p => {
        if (p.id === panelId) p.classList.add('active');
        else p.classList.remove('active');
      });

      renderAdminPanel(panelId);
    });
  });

  const updateHeaderBadges = () => {
    const solicitudes = store.getSolicitudes();
    const pendientes = solicitudes.filter(s => s.estado === 'Pendiente').length;
    const abiertas = solicitudes.filter(s => s.estado !== 'Culminada' && s.estado !== 'Cancelada').length;

    const badgeProd = document.getElementById('badgeCountProd');
    const badgeGer = document.getElementById('badgeCountGerencia');
    if (badgeProd) badgeProd.textContent = pendientes;
    if (badgeGer) badgeGer.textContent = abiertas;

    const preventivos = store.getPreventivos();
    const prevVencidos = preventivos.filter(p => store.evaluarEstadoPreventivo(p.proximaFecha) === 'Vencido').length;
    const badgePrev = document.getElementById('badgeCountPreventivo');
    if (badgePrev) badgePrev.textContent = prevVencidos;
  };

  // ==========================================================================
  // HELPERS DE SELECTORES DINÁMICOS
  // ==========================================================================
  const populateAreaSelects = () => {
    const areas = store.getAreas().filter(a => a.activa);
    const selects = [
      document.getElementById('filterAreaProd'),
      document.getElementById('filterAreaGerencia'),
      document.getElementById('filterAreaPreventivo'),
      document.getElementById('solAreaId'),
      document.getElementById('equipoAreaId'),
      document.getElementById('prevAreaId')
    ];

    selects.forEach(sel => {
      if (!sel) return;
      const currentVal = sel.value;
      const isFilter = sel.id.startsWith('filter');

      sel.innerHTML = isFilter
        ? '<option value="Todas">Todas las Áreas</option>'
        : '<option value="">Seleccione el Área...</option>';

      areas.forEach(a => {
        sel.innerHTML += `<option value="${a.id}">${a.codigo} - ${a.nombre}</option>`;
      });

      if (currentVal) sel.value = currentVal;
    });
  };

  const populateTecnicoSelects = () => {
    const tecnicos = store.getTecnicos();
    const selects = [
      document.getElementById('asigTecnicoId'),
      document.getElementById('prevResponsableId')
    ];

    selects.forEach(sel => {
      if (!sel) return;
      const currentVal = sel.value;
      sel.innerHTML = '<option value="">Seleccione el técnico especialista...</option>';

      tecnicos.forEach(t => {
        sel.innerHTML += `<option value="${t.id}">👷 ${t.nombre} (${t.especialidad})</option>`;
      });

      if (currentVal) sel.value = currentVal;
    });
  };

  // Selector dinámico de equipos según área
  const handleAreaChangeForEquipos = (areaSelectId, equipoSelectId) => {
    const areaSel = document.getElementById(areaSelectId);
    const eqSel = document.getElementById(equipoSelectId);
    if (!areaSel || !eqSel) return;

    areaSel.addEventListener('change', () => {
      const areaId = areaSel.value;
      if (!areaId || areaId === 'Todas') {
        eqSel.innerHTML = '<option value="">Primero seleccione el área...</option>';
        eqSel.disabled = true;
        return;
      }

      const equipos = store.getEquiposByArea(areaId);
      if (equipos.length === 0) {
        eqSel.innerHTML = '<option value="">No hay equipos registrados en esta área</option>';
        eqSel.disabled = true;
        return;
      }

      eqSel.disabled = false;
      eqSel.innerHTML = '<option value="">Seleccione el equipo...</option>';
      equipos.forEach(eq => {
        eqSel.innerHTML += `<option value="${eq.id}">${eq.codigo} - ${eq.nombre}</option>`;
      });
    });
  };

  handleAreaChangeForEquipos('solAreaId', 'solEquipoId');
  handleAreaChangeForEquipos('prevAreaId', 'prevEquipoId');

  // ==========================================================================
  // VISTA 1: PORTAL DE PRODUCCIÓN (SOLICITUDES)
  // Helper para resetear formulario de nueva solicitud con valores limpios
  const resetNuevaSolicitudForm = () => {
    populateAreaSelects();
    const form = document.getElementById('formNuevaSolicitud');
    if (form) form.reset();

    const tipoSel = document.getElementById('solTipoSolicitud');
    if (tipoSel) tipoSel.value = 'Averia';

    const groupEquipo = document.getElementById('groupSolEquipo');
    if (groupEquipo) groupEquipo.style.display = 'block';

    const eqSel = document.getElementById('solEquipoId');
    if (eqSel) {
      eqSel.innerHTML = '<option value="">Primero seleccione el área...</option>';
      eqSel.disabled = true;
      eqSel.required = true;
    }

    const lblDesc = document.getElementById('lblSolDescripcion');
    if (lblDesc) lblDesc.innerHTML = 'Detalles de la Falla / Síntoma <span class="req">*</span>';

    const descInput = document.getElementById('solDescripcion');
    if (descInput) descInput.placeholder = 'Describa el síntoma, ruido, mensaje de error en panel o fuga detectada...';

    const helpText = document.getElementById('solTipoHelpText');
    if (helpText) {
      helpText.innerHTML = '⚙️ <strong>Avería de Equipo:</strong> Se asociará a una máquina específica y computará dentro de las <em>Horas de Parada de Planta (MTTR/MTBF)</em>.';
    }
  };

  // Listener para cambio entre Avería de Equipo y Requerimiento de Área
  const solTipoSel = document.getElementById('solTipoSolicitud');
  if (solTipoSel) {
    solTipoSel.addEventListener('change', (e) => {
      const tipo = e.target.value;
      const groupEquipo = document.getElementById('groupSolEquipo');
      const eqSel = document.getElementById('solEquipoId');
      const lblDesc = document.getElementById('lblSolDescripcion');
      const descInput = document.getElementById('solDescripcion');
      const helpText = document.getElementById('solTipoHelpText');

      if (tipo === 'Requerimiento') {
        if (groupEquipo) groupEquipo.style.display = 'none';
        if (eqSel) {
          eqSel.required = false;
          eqSel.value = '';
        }
        if (lblDesc) lblDesc.innerHTML = 'Descripción del Requerimiento / Trabajo Solicitado <span class="req">*</span>';
        if (descInput) descInput.placeholder = 'Detalle el trabajo, mejora, instalación, adecuación o servicio requerido para esta área...';
        if (helpText) {
          helpText.innerHTML = '📋 <strong>Requerimiento de Área:</strong> Trabajo general o servicio del área. <strong>NO computa parada de maquinaria</strong> (la planta sigue operando). Se computará como tiempo de atención.';
        }
      } else {
        if (groupEquipo) groupEquipo.style.display = 'block';
        if (eqSel) {
          eqSel.required = true;
        }
        if (lblDesc) lblDesc.innerHTML = 'Detalles de la Falla / Síntoma <span class="req">*</span>';
        if (descInput) descInput.placeholder = 'Describa el síntoma, ruido, mensaje de error en panel o fuga detectada...';
        if (helpText) {
          helpText.innerHTML = '⚙️ <strong>Avería de Equipo:</strong> Se asociará a una máquina específica y computará dentro de las <em>Horas de Parada de Planta (MTTR/MTBF)</em>.';
        }
      }
    });
  }

  // ==========================================================================
  // VISTA 1: PORTAL DE PRODUCCIÓN (SOLICITUDES)
  // ==========================================================================
  const renderProduccion = () => {
    populateAreaSelects();
    const tbody = document.getElementById('tbodyProduccion');
    if (!tbody) return;

    const search = (document.getElementById('searchProd')?.value || '').toLowerCase();
    const tipoFilter = document.getElementById('filterTipoProd')?.value || 'Todos';
    const areaFilter = document.getElementById('filterAreaProd')?.value || 'Todas';
    const estadoFilter = document.getElementById('filterEstadoProd')?.value || 'Todos';

    let solicitudes = store.getSolicitudes();

    if (tipoFilter !== 'Todos') {
      solicitudes = solicitudes.filter(s => {
        const isReq = (s.tipoSolicitud === 'Requerimiento' || !s.equipoId);
        return tipoFilter === 'Requerimiento' ? isReq : !isReq;
      });
    }
    if (areaFilter !== 'Todas') solicitudes = solicitudes.filter(s => s.areaId === areaFilter);
    if (estadoFilter !== 'Todos') solicitudes = solicitudes.filter(s => s.estado === estadoFilter);
    if (search) {
      solicitudes = solicitudes.filter(s => {
        const eq = store.getEquipoById(s.equipoId);
        const folioStr = `sol-${s.folio}`.toLowerCase();
        return (
          folioStr.includes(search) ||
          (s.solicitante || '').toLowerCase().includes(search) ||
          (s.descripcion || '').toLowerCase().includes(search) ||
          (eq && (eq.nombre.toLowerCase().includes(search) || eq.codigo.toLowerCase().includes(search)))
        );
      });
    }

    const countLabel = document.getElementById('prodTableCount');
    if (countLabel) countLabel.textContent = `${solicitudes.length} solicitudes encontradas`;

    if (solicitudes.length === 0) {
      const isReal = store.getEnvironment() === 'real';
      const areasCount = store.getAreas().length;
      let msg = 'No se encontraron solicitudes registradas.';
      if (isReal && areasCount === 0) {
        msg = `
          <div style="padding: 1rem; text-align: center;">
            <p style="font-size: 1.05rem; font-weight: 700; color: var(--primary); margin-bottom: 0.35rem;">🏭 ¡Bienvenido a tu Entorno Real de Planta!</p>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Tu entorno está 100% en blanco. Cambia a perfil de <strong>Administrador (PIN 9999)</strong> para dar de alta tus áreas y equipos reales, o copia el catálogo base desde <em>Administrador &gt; Respaldo y Datos</em>.</p>
          </div>
        `;
      }
      tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted" style="padding: 2rem;">${msg}</td></tr>`;
      return;
    }

    tbody.innerHTML = solicitudes.map(s => {
      const area = store.getAreaById(s.areaId);
      const eq = store.getEquipoById(s.equipoId);
      const tec = s.tecnicoId ? store.getEmpleadoById(s.tecnicoId) : null;
      const isReq = (s.tipoSolicitud === 'Requerimiento' || !s.equipoId);

      const tipoBadge = isReq
        ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; font-weight:600;">📋 Requerimiento</span>`
        : `<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:600;">🛠️ Avería</span>`;

      const equipoHtml = isReq
        ? `<span class="badge badge-outline" style="background:var(--bg-hover);">🏢 Área General</span><br><small class="text-muted">Sin equipo</small>`
        : `<strong>${eq ? eq.codigo : 'N/A'}</strong><br><small class="text-muted">${eq ? eq.nombre : ''}</small>`;

      let estadoBadge = `<span class="badge badge-warning">🕒 Pendiente</span>`;
      if (s.estado === 'Asignada') estadoBadge = `<span class="badge badge-info">👷 Asignada</span>`;
      else if (s.estado === 'En Intervención') estadoBadge = `<span class="badge badge-primary">⚙️ En Intervención</span>`;
      else if (s.estado === 'Detenida') estadoBadge = `<span class="badge" style="background:#fed7aa; color:#c2410c; border:1px solid #fdba74; font-weight:600;">⏸️ Detenida</span><br><small style="color:#c2410c; font-weight:600;">${s.motivoDetenimiento || 'En espera'}</small>`;
      else if (s.estado === 'Cancelada') estadoBadge = `<span class="badge" style="background:#f3f4f6; color:#4b5563; border:1px solid #d1d5db; font-weight:600;">🗑️ Cancelada</span><br><small style="color:#6b7280; font-weight:600;">${s.motivoCancelacion || 'Anulada'}</small>`;
      else if (s.estado === 'Culminada') estadoBadge = `<span class="badge badge-success">✅ Culminada</span>`;

      let critBadge = `<span class="badge badge-warning">🟡 Media</span>`;
      if (s.criticidad === 'Crítica') critBadge = `<span class="badge badge-danger">🔴 Crítica</span>`;
      else if (s.criticidad === 'Alta') critBadge = `<span class="badge badge-warning">🟠 Alta</span>`;
      else if (s.criticidad === 'Baja') critBadge = `<span class="badge badge-success">🟢 Baja</span>`;

      let atendidoPor = '<span class="text-muted">Por asignar</span>';
      if (s.tipoEjecutor === 'Contratista' && s.contratista) {
        atendidoPor = `<span class="badge badge-contractor">🏢 ${s.contratista.nombre}</span>`;
      } else if (tec) {
        atendidoPor = `<strong>👷 ${tec.nombre}</strong>`;
      }

      const tiempoTexto = s.estado === 'Culminada'
        ? (isReq
            ? `<strong style="color: #0284c7;">⏱️ ${s.horasAtencionTexto || s.horasParadaTexto || '0h 00m'}</strong><br><small class="text-muted">Atención Área (${s.horasAtencionDecimal || 0} hrs)</small>`
            : `<strong class="text-danger">🛑 ${s.horasParadaTexto || '0h 00m'}</strong><br><small class="text-muted">Parada Equipo (${s.horasParadaDecimal || 0} hrs)</small>`)
        : (s.estado === 'Cancelada'
            ? '<span class="text-muted">Desestimada</span>'
            : (s.estado === 'Detenida'
                ? '<span style="color:#c2410c; font-weight:600;">⏸️ En pausa</span>'
                : (s.estado === 'En Intervención'
                    ? (isReq
                        ? (() => {
                            const startLive = s.fechaInicio || s.fechaSolicitud;
                            const liveCalc = startLive ? store.calcularHorasParada(startLive, getLocalDateTimeString()) : null;
                            const liveText = liveCalc && liveCalc.texto !== '0h 00m' ? ` (${liveCalc.texto})` : '';
                            return `<span style="color:#0284c7; font-weight:600;">⚙️ En atención${liveText}</span>`;
                          })()
                        : (() => {
                            const liveCalc = s.fechaInicio ? store.calcularHorasParada(s.fechaInicio, getLocalDateTimeString()) : null;
                            const liveText = liveCalc && liveCalc.texto !== '0h 00m' ? ` (${liveCalc.texto})` : '';
                            return `<span class="text-warning">⚙️ En curso${liveText}</span>`;
                          })())
                    : (isReq
                        ? (() => {
                            const waitCalc = s.fechaSolicitud ? store.calcularHorasParada(s.fechaSolicitud, getLocalDateTimeString()) : null;
                            const waitText = waitCalc && waitCalc.texto !== '0h 00m' ? ` (${waitCalc.texto})` : '';
                            return `<span class="text-muted">⏱️ En espera${waitText}</span>`;
                          })()
                        : '-'))));

      return `
        <tr>
          <td><strong>SOL-${String(s.folio).padStart(3, '0')}</strong></td>
          <td><small>${s.fechaSolicitud.replace('T', ' ')}</small></td>
          <td>${tipoBadge}</td>
          <td><span class="badge badge-outline">${area ? area.codigo : 'N/A'}</span></td>
          <td>${equipoHtml}</td>
          <td><div style="max-width: 230px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${s.descripcion}">${s.descripcion}</div></td>
          <td>${critBadge}</td>
          <td>${estadoBadge}</td>
          <td>${atendidoPor}</td>
          <td>${tiempoTexto}</td>
          <td style="text-align: right;">
            <button class="btn btn-outline btn-sm" onclick="window.cmmsVerDetalle('${s.id}')">
              <span>👁️</span> Ficha
            </button>
          </td>
        </tr>
      `;
    }).join('');
  };

  // Botón para abrir modal de nueva solicitud desde Producción
  const btnOpenModalProd = document.getElementById('btnOpenModalNuevaSolicitudProd');
  if (btnOpenModalProd) {
    btnOpenModalProd.addEventListener('click', () => {
      resetNuevaSolicitudForm();
      openModal('modalNuevaSolicitud');
    });
  }

  // Filtros de Producción
  ['searchProd', 'filterTipoProd', 'filterAreaProd', 'filterEstadoProd'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderProduccion);
  });

  // ==========================================================================
  // VISTA 2: BANDEJA DE MANTENIMIENTO (ÓRDENES DE TRABAJO)
  // ==========================================================================
  const renderGerencia = () => {
    populateAreaSelects();
    populateTecnicoSelects();
    const tbody = document.getElementById('tbodyGerencia');
    if (!tbody) return;

    const search = (document.getElementById('searchGerencia')?.value || '').toLowerCase();
    const tipoFilter = document.getElementById('filterTipoGerencia')?.value || 'Todos';
    const areaFilter = document.getElementById('filterAreaGerencia')?.value || 'Todas';
    const estadoFilter = document.getElementById('filterEstadoGerencia')?.value || 'Todos';
    const critFilter = document.getElementById('filterCriticidadGerencia')?.value || 'Todas';

    let solicitudes = store.getSolicitudes();

    if (tipoFilter !== 'Todos') {
      solicitudes = solicitudes.filter(s => {
        const isReq = (s.tipoSolicitud === 'Requerimiento' || !s.equipoId);
        return tipoFilter === 'Requerimiento' ? isReq : !isReq;
      });
    }
    if (areaFilter !== 'Todas') solicitudes = solicitudes.filter(s => s.areaId === areaFilter);
    if (estadoFilter !== 'Todos') solicitudes = solicitudes.filter(s => s.estado === estadoFilter);
    if (critFilter !== 'Todas') solicitudes = solicitudes.filter(s => s.criticidad === critFilter);
    if (search) {
      solicitudes = solicitudes.filter(s => {
        const eq = store.getEquipoById(s.equipoId);
        const tec = s.tecnicoId ? store.getEmpleadoById(s.tecnicoId) : null;
        const contratista = (s.tipoEjecutor === 'Contratista' && s.contratista) ? s.contratista.nombre : '';
        const folioStr = `sol-${s.folio}`.toLowerCase();
        return (
          folioStr.includes(search) ||
          (s.solicitante || '').toLowerCase().includes(search) ||
          (s.descripcion || '').toLowerCase().includes(search) ||
          contratista.toLowerCase().includes(search) ||
          (tec && tec.nombre.toLowerCase().includes(search)) ||
          (eq && (eq.nombre.toLowerCase().includes(search) || eq.codigo.toLowerCase().includes(search)))
        );
      });
    }

    const countLabel = document.getElementById('gerenciaTableCount');
    if (countLabel) countLabel.textContent = `${solicitudes.length} órdenes registradas`;

    if (solicitudes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" class="text-center text-muted" style="padding: 2.5rem;">No hay órdenes que coincidan con los filtros.</td></tr>`;
      return;
    }

    const cfg = store.getConfig();
    const moneda = cfg.moneda || '$';

    tbody.innerHTML = solicitudes.map(s => {
      const area = store.getAreaById(s.areaId);
      const eq = store.getEquipoById(s.equipoId);
      const tec = s.tecnicoId ? store.getEmpleadoById(s.tecnicoId) : null;
      const isReq = (s.tipoSolicitud === 'Requerimiento' || !s.equipoId);

      const tipoBadge = isReq
        ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; font-weight:600;">📋 Requerimiento</span>`
        : `<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:600;">🛠️ Avería</span>`;

      const equipoHtml = isReq
        ? `<span class="badge badge-outline" style="background:var(--bg-hover);">🏢 Área General</span><br><small class="text-muted">Sin equipo</small>`
        : `<strong>${eq ? eq.codigo : 'N/A'}</strong><br><small class="text-muted">${eq ? eq.nombre : ''}</small>`;

      let estadoBadge = `<span class="badge badge-warning">🕒 Pendiente</span>`;
      if (s.estado === 'Asignada') estadoBadge = `<span class="badge badge-info">👷 Asignada</span>`;
      else if (s.estado === 'En Intervención') estadoBadge = `<span class="badge badge-primary">⚙️ En Intervención</span>`;
      else if (s.estado === 'Detenida') estadoBadge = `<span class="badge" style="background:#fed7aa; color:#c2410c; border:1px solid #fdba74; font-weight:600;">⏸️ Detenida</span><br><small style="color:#c2410c; font-weight:600;">${s.motivoDetenimiento || 'En espera'}</small>`;
      else if (s.estado === 'Cancelada') estadoBadge = `<span class="badge" style="background:#f3f4f6; color:#4b5563; border:1px solid #d1d5db; font-weight:600;">🗑️ Cancelada</span><br><small style="color:#6b7280; font-weight:600;">${s.motivoCancelacion || 'Anulada'}</small>`;
      else if (s.estado === 'Culminada') estadoBadge = `<span class="badge badge-success">✅ Culminada</span>`;

      let critBadge = `<span class="badge badge-warning">🟡 Media</span>`;
      if (s.criticidad === 'Crítica') critBadge = `<span class="badge badge-danger">🔴 Crítica</span>`;
      else if (s.criticidad === 'Alta') critBadge = `<span class="badge badge-warning">🟠 Alta</span>`;
      else if (s.criticidad === 'Baja') critBadge = `<span class="badge badge-success">🟢 Baja</span>`;

      let ejecutorHtml = '<span class="text-muted">Sin Asignar</span>';
      if (s.tipoEjecutor === 'Contratista' && s.contratista) {
        ejecutorHtml = `
          <span class="badge badge-contractor">🏢 ${s.contratista.nombre}</span><br>
          <small class="text-purple"><strong>${moneda} ${(Number(s.contratista.costo) || 0).toFixed(2)}</strong></small>
        `;
      } else if (tec) {
        ejecutorHtml = `<strong>👷 ${tec.nombre}</strong><br><small class="text-muted">${tec.especialidad}</small>`;
      }

      let horasHtml = '-';
      if (s.estado === 'Culminada') {
        horasHtml = isReq
          ? `<strong style="color: #0284c7;">⏱️ ${s.horasAtencionTexto || s.horasParadaTexto || '0h 00m'}</strong><br><small class="text-muted">Atención Área (${s.horasAtencionDecimal || 0} hrs)</small>`
          : `<strong class="text-danger">🛑 ${s.horasParadaTexto || '0h 00m'}</strong><br><small class="text-muted">Parada (${s.horasParadaDecimal || 0} hrs)</small>`;
      } else if (s.estado === 'Detenida') {
        horasHtml = `<span style="color: #c2410c; font-weight: 600;">⏸️ Pausada</span><br><small class="text-muted">${s.fechaDetenimiento ? s.fechaDetenimiento.slice(5, 16) : ''}</small>`;
      } else if (s.estado === 'Cancelada') {
        horasHtml = `<span class="text-muted">Desestimada</span>`;
      } else if (s.estado === 'En Intervención') {
        const startLive = isReq ? (s.fechaInicio || s.fechaSolicitud) : s.fechaInicio;
        const liveCalc = startLive ? store.calcularHorasParada(startLive, getLocalDateTimeString()) : null;
        const liveText = liveCalc && liveCalc.texto !== '0h 00m' ? ` (${liveCalc.texto})` : '';
        horasHtml = isReq
          ? `<span style="color: #0284c7; font-weight: 600;">⚙️ En atención${liveText}</span>`
          : `<span class="text-warning">⚙️ En curso${liveText}</span>`;
      } else if (isReq && (s.estado === 'Pendiente' || s.estado === 'Asignada')) {
        const waitCalc = s.fechaSolicitud ? store.calcularHorasParada(s.fechaSolicitud, getLocalDateTimeString()) : null;
        const waitText = waitCalc && waitCalc.texto !== '0h 00m' ? `<br><small class="text-muted">${waitCalc.texto} esperando</small>` : '';
        horasHtml = `<span class="text-muted">⏱️ En espera${waitText}</span>`;
      }

      let fechasRango = '-';
      if (s.fechaInicio && s.fechaFin) {
        fechasRango = `<small>${s.fechaInicio.slice(5, 16)}<br>al ${s.fechaFin.slice(5, 16)}</small>`;
      } else if (s.fechaInicio) {
        fechasRango = `<small class="text-primary">Inició: ${s.fechaInicio.slice(5, 16)}</small>`;
      }

      // Botones de acción según el ciclo de vida
      let actionButtons = '';
      if (s.estado === 'Pendiente') {
        actionButtons = `
          <button class="btn btn-primary btn-sm" onclick="window.cmmsAbrirAsignar('${s.id}')">
            <span>👷</span> Asignar
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.cmmsAbrirDetener('${s.id}')" title="Detener / Pausar OT">
            <span>⏸️</span>
          </button>
          <button class="btn btn-outline btn-sm" style="color:#dc2626;" onclick="window.cmmsAbrirCancelar('${s.id}')" title="Anular / Eliminar Solicitud">
            <span>🗑️</span>
          </button>
        `;
      } else if (s.estado === 'Asignada') {
        actionButtons = `
          <button class="btn btn-warning btn-sm" onclick="window.cmmsAbrirIniciar('${s.id}')">
            <span>⚙️</span> Iniciar OT
          </button>
          <button class="btn btn-success btn-sm" onclick="window.cmmsAbrirCulminar('${s.id}')" title="Culminar y registrar atención">
            <span>✅</span> Culminar
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.cmmsAbrirDetener('${s.id}')" title="Detener / Pausar OT">
            <span>⏸️</span>
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.cmmsAbrirAsignar('${s.id}')" title="Reasignar">
            <span>✏️</span>
          </button>
          <button class="btn btn-outline btn-sm" style="color:#dc2626;" onclick="window.cmmsAbrirCancelar('${s.id}')" title="Anular / Eliminar OT">
            <span>🗑️</span>
          </button>
        `;
      } else if (s.estado === 'En Intervención') {
        actionButtons = `
          <button class="btn btn-success btn-sm" onclick="window.cmmsAbrirCulminar('${s.id}')">
            <span>✅</span> Culminar
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.cmmsAbrirDetener('${s.id}')" title="Detener / Pausar OT">
            <span>⏸️</span>
          </button>
          <button class="btn btn-outline btn-sm" style="color:#dc2626;" onclick="window.cmmsAbrirCancelar('${s.id}')" title="Anular / Eliminar OT">
            <span>🗑️</span>
          </button>
        `;
      } else if (s.estado === 'Detenida') {
        actionButtons = `
          <button class="btn btn-primary btn-sm" style="background: #16a34a; border-color: #16a34a; color: white;" onclick="window.cmmsReanudarOT('${s.id}')">
            <span>▶️</span> Reanudar OT
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.cmmsAbrirDetener('${s.id}')" title="Modificar Detenimiento">
            <span>✏️</span>
          </button>
          <button class="btn btn-outline btn-sm" style="color:#dc2626;" onclick="window.cmmsAbrirCancelar('${s.id}')" title="Anular / Eliminar OT">
            <span>🗑️</span>
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.cmmsVerDetalle('${s.id}')" title="Ver Ficha">
            <span>📄</span>
          </button>
        `;
      } else if (s.estado === 'Cancelada') {
        actionButtons = `
          <button class="btn btn-outline btn-sm" onclick="window.cmmsReactivarOT('${s.id}')" title="Reactivar Solicitud / OT">
            <span>♻️</span> Reactivar
          </button>
          <button class="btn btn-outline btn-sm" onclick="window.cmmsVerDetalle('${s.id}')" title="Ficha Técnica y Motivo de Baja">
            <span>📄</span> Ficha
          </button>
        `;
      } else {
        actionButtons = `
          <button class="btn btn-outline btn-sm" onclick="window.cmmsVerDetalle('${s.id}')">
            <span>📄</span> Ficha OT
          </button>
        `;
      }

      return `
        <tr>
          <td><strong>SOL-${String(s.folio).padStart(3, '0')}</strong></td>
          <td><small>${s.fechaSolicitud.replace('T', ' ')}</small></td>
          <td>${tipoBadge}</td>
          <td><span class="badge badge-outline">${area ? area.codigo : 'N/A'}</span></td>
          <td>${equipoHtml}</td>
          <td><div style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${s.descripcion}">${s.descripcion}</div></td>
          <td>${critBadge}</td>
          <td>${estadoBadge}</td>
          <td>${ejecutorHtml}</td>
          <td>${fechasRango}</td>
          <td>${horasHtml}</td>
          <td style="text-align: right;">${actionButtons}</td>
        </tr>
      `;
    }).join('');
  };

  // Filtros de Gerencia
  ['searchGerencia', 'filterTipoGerencia', 'filterAreaGerencia', 'filterEstadoGerencia', 'filterCriticidadGerencia'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderGerencia);
  });

  const btnOpenModalGerencia = document.getElementById('btnOpenModalNuevaSolicitudGerencia');
  if (btnOpenModalGerencia) {
    btnOpenModalGerencia.addEventListener('click', () => {
      resetNuevaSolicitudForm();
      openModal('modalNuevaSolicitud');
    });
  }

  // Exportar Excel desde Gerencia
  document.getElementById('btnExportCSVGerencia')?.addEventListener('click', () => {
    analytics.exportToCSV('all');
    showToast('Reporte en formato Excel/CSV descargado.', 'success');
  });

  // ==========================================================================
  // VISTA 3: MÓDULO DE MANTENIMIENTO PREVENTIVO
  // ==========================================================================
  const renderPreventivo = () => {
    populateAreaSelects();
    populateTecnicoSelects();
    const tbody = document.getElementById('tbodyPreventivos');
    if (!tbody) return;

    let preventivos = store.getPreventivos();
    const countLabel = document.getElementById('prevTableCount');

    // 1. Métricas Globales de Cabecera (Total de la planta)
    const totalGlobal = preventivos.length;
    const alDiaGlobal = preventivos.filter(p => store.evaluarEstadoPreventivo(p.proximaFecha) === 'Al Día').length;
    const proximosGlobal = preventivos.filter(p => store.evaluarEstadoPreventivo(p.proximaFecha) === 'Próximo').length;
    const vencidosGlobal = preventivos.filter(p => store.evaluarEstadoPreventivo(p.proximaFecha) === 'Vencido').length;

    const elTotal = document.getElementById('kpiPrevTotal');
    const elAlDia = document.getElementById('kpiPrevAlDia');
    const elProx = document.getElementById('kpiPrevProximos');
    const elVenc = document.getElementById('kpiPrevVencidos');

    if (elTotal) elTotal.textContent = totalGlobal;
    if (elAlDia) elAlDia.textContent = alDiaGlobal;
    if (elProx) elProx.textContent = proximosGlobal;
    if (elVenc) elVenc.textContent = vencidosGlobal;

    // 2. Filtros y Búsqueda
    const search = (document.getElementById('searchPreventivo')?.value || '').toLowerCase().trim();
    const estadoFilter = document.getElementById('filterEstadoPreventivo')?.value || 'Todos';
    const areaFilter = document.getElementById('filterAreaPreventivo')?.value || 'Todas';
    const frecuenciaFilter = document.getElementById('filterFrecuenciaPreventivo')?.value || 'Todas';

    // Filtro por Estado / Ejecución
    if (estadoFilter !== 'Todos') {
      preventivos = preventivos.filter(p => {
        const estadoActual = store.evaluarEstadoPreventivo(p.proximaFecha);
        const haSidoEjecutado = Boolean(
          (p.vecesEjecutado && p.vecesEjecutado > 0) || 
          (p.ultimaEjecucion && p.ultimaEjecucion !== '-' && p.ultimaEjecucion !== '')
        );

        if (estadoFilter === 'AlDia') {
          return estadoActual === 'Al Día';
        }
        if (estadoFilter === 'Ejecutados') {
          return haSidoEjecutado;
        }
        if (estadoFilter === 'NoEjecutados') {
          return !haSidoEjecutado;
        }
        if (estadoFilter === 'Proximos') {
          return estadoActual === 'Próximo';
        }
        if (estadoFilter === 'Vencidos') {
          return estadoActual === 'Vencido';
        }
        return true;
      });
    }

    // Filtro por Área
    if (areaFilter !== 'Todas') {
      preventivos = preventivos.filter(p => p.areaId === areaFilter);
    }

    // Filtro por Frecuencia
    if (frecuenciaFilter !== 'Todas') {
      preventivos = preventivos.filter(p => p.frecuencia === frecuenciaFilter);
    }

    // Búsqueda de Texto
    if (search) {
      preventivos = preventivos.filter(p => {
        const area = store.getAreaById(p.areaId);
        const eq = store.getEquipoById(p.equipoId);
        const emp = p.responsableId ? store.getEmpleadoById(p.responsableId) : null;
        const contratista = p.contratistaPrevisto?.nombre || '';
        const tareasStr = (p.tareas || []).join(' ');

        const texto = [
          p.codigo || '',
          p.titulo || '',
          p.frecuencia || '',
          area?.codigo || '',
          area?.nombre || '',
          eq?.codigo || '',
          eq?.nombre || '',
          emp?.nombre || '',
          contratista,
          tareasStr,
          p.observaciones || ''
        ].join(' ').toLowerCase();

        return texto.includes(search);
      });
    }

    // Actualizar conteo visible
    if (countLabel) {
      if (preventivos.length === totalGlobal) {
        countLabel.textContent = `${totalGlobal} planes registrados`;
      } else {
        countLabel.textContent = `Mostrando ${preventivos.length} de ${totalGlobal} planes`;
      }
    }

    if (preventivos.length === 0) {
      if (totalGlobal === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding: 2.5rem;">No hay planes preventivos registrados. Cree uno con el botón superior.</td></tr>`;
      } else {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding: 2.5rem;">🔍 No se encontraron planes que coincidan con la búsqueda o filtro seleccionado.</td></tr>`;
      }
      return;
    }

    const cfg = store.getConfig();
    const moneda = cfg.moneda || '$';

    tbody.innerHTML = preventivos.map(p => {
      const area = store.getAreaById(p.areaId);
      const eq = store.getEquipoById(p.equipoId);
      const estadoActual = store.evaluarEstadoPreventivo(p.proximaFecha);
      const haSidoEjecutado = Boolean(
        (p.vecesEjecutado && p.vecesEjecutado > 0) || 
        (p.ultimaEjecucion && p.ultimaEjecucion !== '-' && p.ultimaEjecucion !== '')
      );

      let estadoBadge = `<span class="badge badge-prev-aldia">🟢 Al Día</span>`;
      if (estadoActual === 'Próximo') estadoBadge = `<span class="badge badge-prev-proximo">🟡 Próximo (${p.proximaFecha})</span>`;
      else if (estadoActual === 'Vencido') estadoBadge = `<span class="badge badge-prev-vencido">🔴 Vencido (${p.proximaFecha})</span>`;

      let ejecucionBadge = `<span class="badge badge-subtle" style="color:var(--text-muted); font-size:0.8rem;">⏳ Sin ejecutar</span>`;
      if (haSidoEjecutado) {
        const veces = p.vecesEjecutado ? ` (${p.vecesEjecutado}x)` : '';
        ejecucionBadge = `<span class="badge badge-success" style="font-size:0.8rem; font-weight:600;">✅ ${p.ultimaEjecucion}${veces}</span>`;
      }

      let ejecutorPrev = '<span class="text-muted">Interno</span>';
      if (p.tipoEjecutor === 'Contratista') {
        const nom = p.contratistaPrevisto ? p.contratistaPrevisto.nombre : 'Contratista Externo';
        ejecutorPrev = `<span class="badge badge-contractor">🏢 ${nom}</span>`;
      } else if (p.responsableId) {
        const emp = store.getEmpleadoById(p.responsableId);
        if (emp) ejecutorPrev = `<span>👷 ${emp.nombre}</span>`;
      }

      return `
        <tr>
          <td><strong>${p.codigo}</strong></td>
          <td>
            <strong>${p.titulo}</strong>
            <br><small class="text-muted">${(p.tareas || []).length} tareas en checklist</small>
          </td>
          <td>
            <span class="badge badge-outline">${area ? area.codigo : ''}</span>
            <strong>${eq ? eq.codigo : ''}</strong>
          </td>
          <td>${p.frecuencia === 'Bimestral' ? '<span class="badge badge-subtle" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd;">Bimestral (60d)</span>' : (p.frecuencia === 'Personalizado' ? `<span class="badge badge-subtle" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;">⚙️ Cada ${p.diasFrecuencia || 60}d</span>` : `<span class="badge badge-subtle">${p.frecuencia}</span>`)}</td>
          <td>${ejecucionBadge}</td>
          <td><strong>${p.proximaFecha || '-'}</strong></td>
          <td>${estadoBadge}</td>
          <td>${ejecutorPrev}</td>
          <td>${moneda} ${(Number(p.costoEstimado) || 0).toFixed(2)}</td>
          <td style="text-align: right;">
            <button class="btn btn-success btn-sm" onclick="window.cmmsGenerarOTPreventiva('${p.id}')" title="Generar Orden de Trabajo inmediata">
              <span>🚀</span> OT
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.cmmsEditarPreventivo('${p.id}')" title="Editar Plan">
              <span>✏️</span>
            </button>
            <button class="btn btn-danger btn-sm" onclick="window.cmmsEliminarPreventivo('${p.id}')" title="Eliminar Plan">
              <span>🗑️</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  };

  // Botón para crear nuevo preventivo
  const btnNuevoPrev = document.getElementById('btnNuevoPreventivo');
  if (btnNuevoPrev) {
    btnNuevoPrev.addEventListener('click', () => {
      populateAreaSelects();
      populateTecnicoSelects();
      const form = document.getElementById('formPreventivo');
      if (form) form.reset();
      document.getElementById('prevEditId').value = '';
      document.getElementById('modalPrevTitle').innerHTML = `<span>📅</span> Registrar Plan Preventivo`;

      const grpDias = document.getElementById('grpPrevDiasPersonalizados');
      if (grpDias) grpDias.style.display = 'none';
      const inputDias = document.getElementById('prevDiasPersonalizados');
      if (inputDias) inputDias.value = '';

      const proxInput = document.getElementById('prevProximaFecha');
      if (proxInput) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        proxInput.value = d.toISOString().slice(0, 10);
      }

      const eqSel = document.getElementById('prevEquipoId');
      if (eqSel) {
        eqSel.innerHTML = '<option value="">Primero seleccione el área...</option>';
        eqSel.disabled = true;
      }
      openModal('modalPreventivo');
    });
  }

  // Toggle y sugerencia según frecuencia de Preventivo
  const selPrevFrecuencia = document.getElementById('prevFrecuencia');
  const grpPrevDiasPersonalizados = document.getElementById('grpPrevDiasPersonalizados');
  const inputPrevDiasPersonalizados = document.getElementById('prevDiasPersonalizados');
  const inputPrevProximaFecha = document.getElementById('prevProximaFecha');

  const mapDiasFrecuencia = {
    'Semanal': 7,
    'Quincenal': 15,
    'Mensual': 30,
    'Bimestral': 60,
    'Trimestral': 90,
    'Semestral': 180,
    'Anual': 365
  };

  const sugerirProximaFechaPrev = (dias) => {
    if (!dias || dias <= 0 || !inputPrevProximaFecha) return;
    const d = new Date();
    d.setDate(d.getDate() + Number(dias));
    inputPrevProximaFecha.value = d.toISOString().slice(0, 10);
  };

  if (selPrevFrecuencia) {
    selPrevFrecuencia.addEventListener('change', (e) => {
      const freq = e.target.value;
      if (freq === 'Personalizado') {
        if (grpPrevDiasPersonalizados) grpPrevDiasPersonalizados.style.display = 'block';
        if (inputPrevDiasPersonalizados) {
          inputPrevDiasPersonalizados.focus();
          if (inputPrevDiasPersonalizados.value) {
            sugerirProximaFechaPrev(parseInt(inputPrevDiasPersonalizados.value, 10));
          }
        }
      } else {
        if (grpPrevDiasPersonalizados) grpPrevDiasPersonalizados.style.display = 'none';
        const dias = mapDiasFrecuencia[freq] || 30;
        sugerirProximaFechaPrev(dias);
      }
    });
  }

  if (inputPrevDiasPersonalizados) {
    inputPrevDiasPersonalizados.addEventListener('input', (e) => {
      const dias = parseInt(e.target.value, 10);
      if (dias > 0) {
        sugerirProximaFechaPrev(dias);
      }
    });
  }

  // Toggle tipo ejecutor en Preventivo
  const selPrevTipoEjecutor = document.getElementById('prevTipoEjecutor');
  if (selPrevTipoEjecutor) {
    selPrevTipoEjecutor.addEventListener('change', (e) => {
      const respWrap = document.getElementById('prevResponsableWrap');
      const contWrap = document.getElementById('prevContratistaWrap');
      if (e.target.value === 'Contratista') {
        if (respWrap) respWrap.style.display = 'none';
        if (contWrap) contWrap.style.display = 'block';
      } else {
        if (respWrap) respWrap.style.display = 'block';
        if (contWrap) contWrap.style.display = 'none';
      }
    });
  }

  // Guardar Plan Preventivo
  const formPreventivo = document.getElementById('formPreventivo');
  if (formPreventivo) {
    formPreventivo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('prevEditId').value;
      const codigo = document.getElementById('prevCodigo').value.trim();
      const titulo = document.getElementById('prevTitulo').value.trim();
      const areaId = document.getElementById('prevAreaId').value;
      const equipoId = document.getElementById('prevEquipoId').value;
      const frecuencia = document.getElementById('prevFrecuencia').value;
      const proximaFecha = document.getElementById('prevProximaFecha').value;
      const tipoEjecutor = document.getElementById('prevTipoEjecutor').value;
      const responsableId = document.getElementById('prevResponsableId').value;
      const contratistaNombre = document.getElementById('prevContratistaNombre')?.value.trim();
      const costoEstimado = Number(document.getElementById('prevCostoEstimado').value) || 0;
      const tareasText = document.getElementById('prevTareas').value.trim();
      const observaciones = document.getElementById('prevObservaciones').value.trim();

      let diasFrecuencia = 30;
      if (frecuencia === 'Personalizado') {
        const diasNum = parseInt(inputPrevDiasPersonalizados ? inputPrevDiasPersonalizados.value : 0, 10);
        if (!diasNum || diasNum <= 0) {
          showToast('Indique la cantidad de días para la frecuencia personalizada.', 'warning');
          if (inputPrevDiasPersonalizados) inputPrevDiasPersonalizados.focus();
          return;
        }
        diasFrecuencia = diasNum;
      } else {
        diasFrecuencia = mapDiasFrecuencia[frecuencia] || 30;
      }

      const tareas = tareasText.split('\n').map(t => t.trim()).filter(Boolean);

      const payload = {
        codigo,
        titulo,
        areaId,
        equipoId,
        frecuencia,
        diasFrecuencia,
        proximaFecha,
        tipoEjecutor,
        responsableId: tipoEjecutor === 'Interno' ? responsableId : null,
        contratistaPrevisto: tipoEjecutor === 'Contratista' ? { nombre: contratistaNombre, costoEstimado } : null,
        costoEstimado,
        tareas,
        observaciones
      };

      if (editId) {
        await store.updatePreventivo(editId, payload);
        showToast('Plan preventivo actualizado.', 'success');
      } else {
        await store.createPreventivo(payload);
        showToast('Plan preventivo registrado con éxito.', 'success');
      }

      closeModal('modalPreventivo');
      renderPreventivo();
    });
  }

  // Filtros interactivos de Preventivo
  ['searchPreventivo', 'filterEstadoPreventivo', 'filterAreaPreventivo', 'filterFrecuenciaPreventivo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', renderPreventivo);
      el.addEventListener('change', renderPreventivo);
    }
  });

  window.cmmsFiltrarPreventivoRapido = (estado) => {
    const el = document.getElementById('filterEstadoPreventivo');
    if (el) {
      el.value = estado || 'Todos';
      renderPreventivo();
    }
  };

  // ==========================================================================
  // VISTA 4: MÉTRICAS Y ANALÍTICA (MTTR, MTBF, EFICIENCIA, COSTOS)
  // ==========================================================================
  const renderMetricas = () => {
    const kpis = analytics.getKPIs(dateRangeMetricas);
    const downtimeData = analytics.getDowntimeByEquipment(dateRangeMetricas);
    const areaDowntime = analytics.getDowntimeByArea(dateRangeMetricas);
    const techData = analytics.getTechnicianEfficiency(dateRangeMetricas);
    const costData = analytics.getContractorCostAnalytics(dateRangeMetricas);

    // 1. Tarjetas de KPIs
    const kpiDown = document.getElementById('kpiTotalDowntime');
    if (kpiDown) kpiDown.textContent = kpis.totalHorasTexto;
    const kpiDownDec = document.getElementById('kpiTotalDowntimeDec');
    if (kpiDownDec) kpiDownDec.textContent = `${kpis.totalHorasDecimal} hrs (${kpis.averiasCulminadasCount || 0} averías)`;

    // Disponibilidad Mecánica de Planta
    const kpiDisp = document.getElementById('kpiDisponibilidadMecanica');
    const kpiDispSub = document.getElementById('kpiDisponibilidadSubtext');
    if (kpiDisp) {
      kpiDisp.textContent = `${kpis.disponibilidadMecanicaDecimal}%`;
      if (kpis.disponibilidadMecanicaDecimal >= 95) {
        kpiDisp.style.color = '#059669';
      } else if (kpis.disponibilidadMecanicaDecimal >= 85) {
        kpiDisp.style.color = '#d97706';
      } else {
        kpiDisp.style.color = '#dc2626';
      }
    }
    if (kpiDispSub) {
      const jornada = `${kpis.horasPorDia || 8}h/d · ${kpis.diasLaboralesSemana || 6}d/sem`;
      if (kpis.totalHorasDecimal === 0) {
        kpiDispSub.textContent = `100% operativa (${kpis.horasPeriodoTotal || 0} hrs planif. | ${jornada})`;
      } else {
        kpiDispSub.textContent = `${kpis.tiempoOperativoNeto || 0} hrs oper. / ${kpis.horasPeriodoTotal || 0} hrs planif. (${jornada})`;
      }
    }

    const kpiAtencion = document.getElementById('kpiTotalAtencion');
    if (kpiAtencion) kpiAtencion.textContent = kpis.totalAtencionTexto || kpis.totalHorasAtencionTexto || '0h 00m';
    const kpiAtencionSub = document.getElementById('kpiTotalAtencionSub');
    if (kpiAtencionSub) kpiAtencionSub.textContent = `${kpis.totalAtencionDecimal || kpis.totalHorasAtencionDecimal || 0} hrs (${kpis.requerimientosCulminadosCount || 0} req. atendidos)`;

    document.getElementById('kpiMTTR').textContent = `${kpis.mttrDecimal} hrs`;
    document.getElementById('kpiMTBF').textContent = `${kpis.mtbfDecimal} hrs`;

    document.getElementById('kpiCostoContratistas').textContent = `${kpis.moneda} ${kpis.costoTotalContratistas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpiCostoSubtext').textContent = `${kpis.cantidadContratistas} intervenciones tercerizadas`;

    document.getElementById('kpiResolutionRate').textContent = `${kpis.tasaResolucion}%`;
    const desestimadasSub = kpis.canceladasCount > 0 ? ` (${kpis.canceladasCount} desestimadas)` : '';
    document.getElementById('kpiCompletedCount').textContent = `${kpis.culminadasCount} de ${kpis.totalEfectivas || kpis.totalSolicitudes} cerradas${desestimadasSub}`;

    document.getElementById('kpiPrevCumplimiento').textContent = `${kpis.preventivos.cumplimiento}%`;
    document.getElementById('kpiPrevSubtext').textContent = `${kpis.preventivos.alDia} de ${kpis.preventivos.total} planes al día`;

    // 2. Gráficos Analíticos
    analytics.renderBarChartDowntime('chartDowntimeByEquipment', downtimeData, 6);
    analytics.renderStatusDonutChart('chartStatusComparison', kpis);
    analytics.renderTechnicianChart('chartTechEfficiency', techData);
    analytics.renderContractorCosts('chartContractorCosts', costData, kpis.moneda);

    // 3. Tabla Consolidada de Equipos
    const tbody = document.getElementById('tbodyResumenEquipos');
    if (tbody) {
      if (downtimeData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding: 2rem;">No hay registros de paradas en este período.</td></tr>`;
      } else {
        tbody.innerHTML = downtimeData.map(item => {
          let impactoBadge = `<span class="badge badge-success">🟢 Bajo</span>`;
          if (item.horasDecimal > 10 || item.paradasCount >= 3) impactoBadge = `<span class="badge badge-danger">🔴 Alto</span>`;
          else if (item.horasDecimal > 3 || item.paradasCount >= 2) impactoBadge = `<span class="badge badge-warning">🟡 Medio</span>`;

          const disp = item.disponibilidadMecanica != null ? item.disponibilidadMecanica : 100;
          let dispBadge = `<span class="badge badge-success" style="font-weight: 700;">🟢 ${disp}%</span>`;
          if (disp < 85) {
            dispBadge = `<span class="badge badge-danger" style="font-weight: 700;">🔴 ${disp}%</span>`;
          } else if (disp < 95) {
            dispBadge = `<span class="badge badge-warning" style="font-weight: 700;">🟡 ${disp}%</span>`;
          }

          return `
            <tr>
              <td><strong>${item.codigo}</strong></td>
              <td>${item.nombre}</td>
              <td>${item.areaNombre}</td>
              <td><strong class="text-primary">${item.paradasCount}</strong></td>
              <td>${item.horasDecimal} hrs</td>
              <td><strong>${item.horasTexto}</strong></td>
              <td>${dispBadge}</td>
              <td>${kpis.moneda} ${item.costoTerceros.toFixed(2)}</td>
              <td>${impactoBadge}</td>
            </tr>
          `;
        }).join('');
      }
    }
  };

  document.getElementById('dateRangeFilter')?.addEventListener('change', (e) => {
    dateRangeMetricas = e.target.value;
    renderMetricas();
  });

  document.getElementById('btnExportCSVMetricas')?.addEventListener('click', () => {
    analytics.exportToCSV(dateRangeMetricas);
    showToast('Reporte exportado exitosamente a CSV/Excel.', 'success');
  });

  // ==========================================================================
  // VISTA 5: MODO ADMINISTRADOR (CRUD COMPLETO)
  // ==========================================================================
  const renderAdmin = () => {
    renderAdminPanel(currentAdminPanel);
  };

  const renderAdminPanel = (panelId) => {
    if (panelId === 'panelAdminAreas') renderAdminAreas();
    else if (panelId === 'panelAdminEquipos') renderAdminEquipos();
    else if (panelId === 'panelAdminEmpleados') renderAdminEmpleados();
    else if (panelId === 'panelAdminConfig') renderAdminConfig();
  };

  // 5.1 CRUD Áreas
  const renderAdminAreas = () => {
    const tbody = document.getElementById('tbodyAreas');
    if (!tbody) return;
    const areas = store.getAreas();
    const equipos = store.getEquipos();

    tbody.innerHTML = areas.map(a => {
      const eqCount = equipos.filter(e => e.areaId === a.id).length;
      return `
        <tr>
          <td><strong>${a.codigo}</strong></td>
          <td><strong>${a.nombre}</strong></td>
          <td><small class="text-muted">${a.descripcion || '-'}</small></td>
          <td><span class="badge badge-subtle">${eqCount} equipos</span></td>
          <td><span class="badge badge-success">Activa</span></td>
          <td style="text-align: right;">
            <button class="btn btn-outline btn-sm" onclick="window.cmmsEditarArea('${a.id}')"><span>✏️</span></button>
            <button class="btn btn-danger btn-sm" onclick="window.cmmsEliminarArea('${a.id}')"><span>🗑️</span></button>
          </td>
        </tr>
      `;
    }).join('');
  };

  // 5.2 CRUD Equipos
  const renderAdminEquipos = () => {
    const tbody = document.getElementById('tbodyEquipos');
    if (!tbody) return;
    const equipos = store.getEquipos();

    tbody.innerHTML = equipos.map(eq => {
      const area = store.getAreaById(eq.areaId);
      return `
        <tr>
          <td><strong>${eq.codigo}</strong></td>
          <td><strong>${eq.nombre}</strong></td>
          <td><span class="badge badge-outline">${area ? area.nombre : 'N/A'}</span></td>
          <td><small class="text-muted">${eq.ubicacion || '-'}</small></td>
          <td><span class="badge badge-subtle">${eq.criticidad}</span></td>
          <td><span class="badge badge-success">${eq.estado}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-outline btn-sm" onclick="window.cmmsEditarEquipo('${eq.id}')"><span>✏️</span></button>
            <button class="btn btn-danger btn-sm" onclick="window.cmmsEliminarEquipo('${eq.id}')"><span>🗑️</span></button>
          </td>
        </tr>
      `;
    }).join('');
  };

  // 5.3 CRUD Empleados / Personal
  const renderAdminEmpleados = () => {
    const tbody = document.getElementById('tbodyEmpleados');
    if (!tbody) return;
    const empleados = store.getEmpleados();

    tbody.innerHTML = empleados.map(emp => {
      let rolBadge = `<span class="badge badge-info">🛠️ ${emp.rol}</span>`;
      if (emp.rol === 'Supervisor') rolBadge = `<span class="badge badge-primary">⭐ Supervisor</span>`;
      else if (emp.rol === 'Solicitante') rolBadge = `<span class="badge badge-subtle">📋 Solicitante</span>`;

      return `
        <tr>
          <td><strong>${emp.nombre}</strong></td>
          <td>${rolBadge}</td>
          <td>${emp.especialidad}</td>
          <td><small class="text-muted">${emp.telefono || '-'}</small></td>
          <td><span class="badge badge-success">Activo</span></td>
          <td style="text-align: right;">
            <button class="btn btn-outline btn-sm" onclick="window.cmmsEditarEmpleado('${emp.id}')"><span>✏️</span></button>
            <button class="btn btn-danger btn-sm" onclick="window.cmmsEliminarEmpleado('${emp.id}')"><span>🗑️</span></button>
          </td>
        </tr>
      `;
    }).join('');
  };

  // 5.4 Ajustes y Configuración
  const renderAdminConfig = () => {
    const cfg = store.getConfig();
    const elNom = document.getElementById('cfgNombreEmpresa');
    const elMon = document.getElementById('cfgMoneda');
    const elHoras = document.getElementById('cfgHorasTurnoDia');
    const elDias = document.getElementById('cfgDiasLaboralesSemana');
    const elPinM = document.getElementById('cfgPinMantenimiento');
    const elPinA = document.getElementById('cfgPinAdmin');

    if (elNom) elNom.value = cfg.nombreEmpresa || '';
    if (elMon) elMon.value = cfg.moneda || '$';
    if (elHoras) elHoras.value = cfg.horasTurnoDia || 8;
    if (elDias) elDias.value = cfg.diasLaboralesSemana || 6;
    if (elPinM) elPinM.value = cfg.pinMantenimiento || '1234';
    if (elPinA) elPinA.value = cfg.pinAdmin || '9999';
  };

  document.getElementById('formConfig')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombreEmpresa = document.getElementById('cfgNombreEmpresa').value.trim();
    const moneda = document.getElementById('cfgMoneda').value.trim();
    const horasTurnoDia = Number(document.getElementById('cfgHorasTurnoDia')?.value) || 8;
    const diasLaboralesSemana = Number(document.getElementById('cfgDiasLaboralesSemana')?.value) || 6;
    const pinMantenimiento = document.getElementById('cfgPinMantenimiento').value.trim();
    const pinAdmin = document.getElementById('cfgPinAdmin').value.trim();

    await store.updateConfig({
      nombreEmpresa,
      moneda,
      horasTurnoDia,
      diasLaboralesSemana,
      pinMantenimiento,
      pinAdmin
    });

    renderMetricas();
    showToast('Configuración guardada (Jornada actualizada para Disponibilidad).', 'success');
  });

  // Exportar e Importar JSON
  document.getElementById('btnExportJSON')?.addEventListener('click', () => {
    const dataStr = JSON.stringify(store.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CMMS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    showToast('Respaldo JSON descargado.', 'success');
  });

  const fileInput = document.getElementById('fileImportJSON');
  document.getElementById('btnTriggerImportJSON')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        await store.api.restoreDatabase(parsed);
        await store.init();
        showToast('Base de datos restaurada correctamente.', 'success');
        window.location.reload();
      } catch (err) {
        showToast('Archivo JSON inválido o corrupto.', 'error');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btnResetDemo')?.addEventListener('click', async () => {
    if (confirm('¿Desea restaurar todos los datos a la demostración inicial de planta? Se sobreescribirán los cambios.')) {
      await store.resetToSeed();
      showToast('Datos de demostración restablecidos.', 'success');
      window.location.reload();
    }
  });

  // ==========================================================================
  // FORMULARIO: CREAR SOLICITUD DE FALLA O REQUERIMIENTO
  // ==========================================================================
  const formNuevaSolicitud = document.getElementById('formNuevaSolicitud');
  if (formNuevaSolicitud) {
    formNuevaSolicitud.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tipoSolicitud = document.getElementById('solTipoSolicitud')?.value || 'Averia';
      const solicitante = document.getElementById('solSolicitante').value.trim();
      const turno = document.getElementById('solTurno').value;
      const areaId = document.getElementById('solAreaId').value;
      const equipoId = document.getElementById('solEquipoId')?.value || null;
      const tipoFalla = document.getElementById('solTipoFalla').value;
      const criticidad = document.getElementById('solCriticidad').value;
      const descripcion = document.getElementById('solDescripcion').value.trim();

      const isAveria = (tipoSolicitud === 'Averia');
      if (!solicitante || !areaId || (isAveria && !equipoId) || !descripcion) {
        showToast(isAveria ? 'Complete todos los campos obligatorios incluyendo el equipo.' : 'Complete todos los campos obligatorios.', 'error');
        return;
      }

      const nueva = await store.createSolicitud({
        tipoSolicitud,
        fechaSolicitud: getLocalDateTimeString(),
        solicitante,
        turno,
        areaId,
        equipoId: isAveria ? equipoId : null,
        tipoFalla,
        criticidad,
        descripcion
      });

      closeModal('modalNuevaSolicitud');
      resetNuevaSolicitudForm();
      const tipoLabel = isAveria ? 'Avería de Equipo' : 'Requerimiento de Área';
      showToast(`Solicitud SOL-${String(nueva.folio).padStart(3, '0')} (${tipoLabel}) emitida con éxito. Mantenimiento fue notificado.`, 'success');

      renderProduccion();
      renderGerencia();
      updateHeaderBadges();
    });
  }

  // ==========================================================================
  // MODAL Y FORMULARIO: ASIGNAR TÉCNICO O CONTRATISTA
  // ==========================================================================
  window.cmmsAbrirAsignar = (solId) => {
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    populateTecnicoSelects();
    document.getElementById('asigSolId').value = sol.id;

    const isReq = (sol.tipoSolicitud === 'Requerimiento' || !sol.equipoId);
    const area = store.getAreaById(sol.areaId);
    const eq = store.getEquipoById(sol.equipoId);

    const tipoBadge = isReq
      ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; font-weight:600;">📋 Requerimiento de Área</span>'
      : '<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:600;">🛠️ Avería de Equipo</span>';

    const targetDesc = isReq
      ? `Área: <strong>${area ? area.nombre : 'Área General'} (Sin equipo)</strong>`
      : `Equipo: <strong>${eq ? eq.codigo : ''} - ${eq ? eq.nombre : ''}</strong>`;

    document.getElementById('asigInfoSol').innerHTML = `
      Orden: <strong>SOL-${String(sol.folio).padStart(3, '0')}</strong> ${tipoBadge} | ${targetDesc}<br>
      Asunto: <em>"${sol.descripcion}"</em>
    `;

    // Asignar fecha actual
    const fechaInput = document.getElementById('asigFechaHora');
    if (fechaInput) fechaInput.value = getLocalDateTimeString();

    // Toggle Interno vs Contratista
    const radioInterno = document.querySelector('input[name="asigTipoEjecutor"][value="Interno"]');
    if (radioInterno) radioInterno.checked = true;
    document.getElementById('seccionAsigInterno').style.display = 'block';
    document.getElementById('seccionAsigContratista').style.display = 'none';

    // Limpiar campos contratista
    document.getElementById('asigContratistaNombre').value = '';
    document.getElementById('asigContratistaOC').value = '';
    document.getElementById('asigContratistaCosto').value = '';

    openModal('modalAsignar');
  };

  // Listener para el radio de tipo de ejecutor
  document.querySelectorAll('input[name="asigTipoEjecutor"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const secInterno = document.getElementById('seccionAsigInterno');
      const secContratista = document.getElementById('seccionAsigContratista');
      if (e.target.value === 'Contratista') {
        if (secInterno) secInterno.style.display = 'none';
        if (secContratista) secContratista.style.display = 'block';
      } else {
        if (secInterno) secInterno.style.display = 'block';
        if (secContratista) secContratista.style.display = 'none';
      }
    });
  });

  document.getElementById('formAsignar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const solId = document.getElementById('asigSolId').value;
    const tipoEjecutor = document.querySelector('input[name="asigTipoEjecutor"]:checked')?.value || 'Interno';
    const fechaAsignacion = document.getElementById('asigFechaHora').value || getLocalDateTimeString();
    const notas = document.getElementById('asigNotas').value.trim();

    const patch = {
      estado: 'Asignada',
      tipoEjecutor,
      fechaAsignacion,
      observaciones: notas
    };

    if (tipoEjecutor === 'Interno') {
      const tecId = document.getElementById('asigTecnicoId').value;
      if (!tecId) {
        showToast('Seleccione un técnico responsable.', 'error');
        return;
      }
      patch.tecnicoId = tecId;
      patch.contratista = null;
    } else {
      const nombre = document.getElementById('asigContratistaNombre').value.trim();
      const oc = document.getElementById('asigContratistaOC').value.trim();
      const costo = Number(document.getElementById('asigContratistaCosto').value) || 0;

      if (!nombre) {
        showToast('Ingrese el nombre de la empresa contratista.', 'error');
        return;
      }

      patch.tecnicoId = null;
      patch.contratista = {
        nombre,
        ordenCompra: oc || `OC-${Date.now().toString().slice(-4)}`,
        costo
      };
    }

    await store.updateSolicitud(solId, patch);
    closeModal('modalAsignar');
    showToast('Orden de Trabajo asignada.', 'success');
    renderGerencia();
    renderProduccion();
    updateHeaderBadges();
  });

  // ==========================================================================
  // MODAL Y FORMULARIO: INICIAR INTERVENCIÓN (INICIO PARADA / ATENCIÓN)
  // ==========================================================================
  window.cmmsAbrirIniciar = (solId) => {
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    document.getElementById('iniciarSolId').value = sol.id;
    const isReq = (sol.tipoSolicitud === 'Requerimiento' || !sol.equipoId);
    const eq = store.getEquipoById(sol.equipoId);
    const area = store.getAreaById(sol.areaId);

    const tipoBadge = isReq
      ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; font-weight:600;">📋 Requerimiento</span>'
      : '<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:600;">🛠️ Avería</span>';

    const targetDesc = isReq
      ? `Área: <strong>${area ? area.nombre : 'Área General'} (Sin equipo)</strong>`
      : `Equipo: <strong>${eq ? eq.codigo : ''} - ${eq ? eq.nombre : ''}</strong>`;

    document.getElementById('iniciarInfoSol').innerHTML = `
      Iniciando OT: <strong>SOL-${String(sol.folio).padStart(3, '0')}</strong> ${tipoBadge} | ${targetDesc}
    `;

    document.getElementById('iniciarFechaHora').value = getLocalDateTimeString();
    openModal('modalIniciar');
  };

  document.getElementById('btnSetNowInicio')?.addEventListener('click', () => {
    document.getElementById('iniciarFechaHora').value = getLocalDateTimeString();
  });

  document.getElementById('formIniciar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const solId = document.getElementById('iniciarSolId').value;
    const sol = store.getSolicitudById(solId);
    const isReq = (sol && (sol.tipoSolicitud === 'Requerimiento' || !sol.equipoId));
    const fechaInicio = document.getElementById('iniciarFechaHora').value;
    const notas = document.getElementById('iniciarNotas').value.trim();

    await store.updateSolicitud(solId, {
      estado: 'En Intervención',
      fechaInicio,
      observaciones: notas
    });

    closeModal('modalIniciar');
    showToast(isReq ? 'Atención al requerimiento iniciada.' : 'Intervención iniciada. Conteo de parada en curso.', 'success');
    renderGerencia();
    renderProduccion();
    updateHeaderBadges();
  });

  // ==========================================================================
  // MODAL Y FORMULARIO: DETENER / PAUSAR ORDEN DE TRABAJO
  // ==========================================================================
  window.cmmsAbrirDetener = (solId) => {
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    document.getElementById('detenerSolId').value = sol.id;
    const isReq = (sol.tipoSolicitud === 'Requerimiento' || !sol.equipoId);
    const eq = store.getEquipoById(sol.equipoId);
    const area = store.getAreaById(sol.areaId);

    const targetDesc = isReq
      ? `Área: <strong>${area ? area.nombre : 'Área General'} (Sin equipo)</strong>`
      : `Equipo: <strong>${eq ? eq.codigo : ''} - ${eq ? eq.nombre : ''}</strong>`;

    document.getElementById('detenerInfoSol').innerHTML = `
      Pausando OT: <strong>SOL-${String(sol.folio).padStart(3, '0')}</strong> | ${targetDesc}<br>
      Falla / Asunto: <em>"${sol.descripcion}"</em>
    `;

    document.getElementById('detenerMotivo').value = sol.motivoDetenimiento || 'Compra de materiales';
    document.getElementById('detenerFechaHora').value = getLocalDateTimeString();
    document.getElementById('detenerDetalle').value = sol.detalleDetenimiento || '';

    openModal('modalDetenerOT');
  };

  document.getElementById('btnSetNowDetener')?.addEventListener('click', () => {
    document.getElementById('detenerFechaHora').value = getLocalDateTimeString();
  });

  document.getElementById('formDetenerOT')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const solId = document.getElementById('detenerSolId').value;
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    const motivo = document.getElementById('detenerMotivo').value;
    const fecha = document.getElementById('detenerFechaHora').value;
    const detalle = document.getElementById('detenerDetalle').value.trim();

    const estadoPrevio = sol.estado !== 'Detenida' ? sol.estado : (sol.estadoPrevio || (sol.fechaInicio ? 'En Intervención' : 'Asignada'));

    await store.updateSolicitud(solId, {
      estado: 'Detenida',
      estadoPrevio,
      motivoDetenimiento: motivo,
      detalleDetenimiento: detalle,
      fechaDetenimiento: fecha
    });

    closeModal('modalDetenerOT');
    showToast(`Orden SOL-${String(sol.folio).padStart(3, '0')} detenida por: ${motivo}.`, 'warning');
    renderGerencia();
    renderProduccion();
    renderMetricas();
    updateHeaderBadges();
  });

  window.cmmsReanudarOT = async (solId) => {
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    const nuevoEstado = sol.estadoPrevio || (sol.fechaInicio ? 'En Intervención' : 'Asignada');
    if (confirm(`¿Desea reanudar la Orden de Trabajo SOL-${String(sol.folio).padStart(3, '0')}? Pasará a estado "${nuevoEstado}".`)) {
      await store.updateSolicitud(solId, {
        estado: nuevoEstado
      });
      showToast(`Orden SOL-${String(sol.folio).padStart(3, '0')} reanudada. Estado actual: ${nuevoEstado}.`, 'success');
      renderGerencia();
      renderProduccion();
      renderMetricas();
      updateHeaderBadges();
    }
  };

  // ==========================================================================
  // MODAL Y FORMULARIO: ANULAR / ELIMINAR SOLICITUD (BAJA REGISTRADA)
  // ==========================================================================
  window.cmmsAbrirCancelar = (solId) => {
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    document.getElementById('cancelarSolId').value = sol.id;
    const isReq = (sol.tipoSolicitud === 'Requerimiento' || !sol.equipoId);
    const eq = store.getEquipoById(sol.equipoId);
    const area = store.getAreaById(sol.areaId);

    const targetDesc = isReq
      ? `Área: <strong>${area ? area.nombre : 'Área General'} (Sin equipo)</strong>`
      : `Equipo: <strong>${eq ? eq.codigo : ''} - ${eq ? eq.nombre : ''}</strong>`;

    document.getElementById('cancelarInfoSol').innerHTML = `
      Anulando Solicitud: <strong>SOL-${String(sol.folio).padStart(3, '0')}</strong> | ${targetDesc}<br>
      Falla / Asunto: <em>"${sol.descripcion}"</em>
    `;

    document.getElementById('cancelarMotivo').value = sol.motivoCancelacion || 'Solicitud duplicada';
    document.getElementById('cancelarFechaHora').value = getLocalDateTimeString();
    document.getElementById('cancelarDetalle').value = sol.detalleCancelacion || '';

    openModal('modalCancelarOT');
  };

  document.getElementById('btnSetNowCancelar')?.addEventListener('click', () => {
    document.getElementById('cancelarFechaHora').value = getLocalDateTimeString();
  });

  document.getElementById('formCancelarOT')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const solId = document.getElementById('cancelarSolId').value;
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    const motivo = document.getElementById('cancelarMotivo').value;
    const fecha = document.getElementById('cancelarFechaHora').value;
    const detalle = document.getElementById('cancelarDetalle').value.trim();

    if (!motivo || !detalle) {
      showToast('Seleccione un motivo e ingrese la justificación de la anulación.', 'error');
      return;
    }

    const estadoPrevio = sol.estado !== 'Cancelada' ? sol.estado : (sol.estadoPrevio || 'Pendiente');

    await store.updateSolicitud(solId, {
      estado: 'Cancelada',
      estadoPrevio,
      motivoCancelacion: motivo,
      detalleCancelacion: detalle,
      fechaCancelacion: fecha,
      usuarioCancelacion: store.getRole()
    });

    closeModal('modalCancelarOT');
    showToast(`Solicitud SOL-${String(sol.folio).padStart(3, '0')} anulada y archivada: ${motivo}.`, 'warning');
    renderGerencia();
    renderProduccion();
    renderMetricas();
    updateHeaderBadges();
  });

  window.cmmsReactivarOT = async (solId) => {
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    const nuevoEstado = sol.estadoPrevio || 'Pendiente';
    if (confirm(`¿Desea reactivar la Orden de Trabajo SOL-${String(sol.folio).padStart(3, '0')}? Se restablecerá a estado "${nuevoEstado}".`)) {
      await store.updateSolicitud(solId, {
        estado: nuevoEstado,
        motivoCancelacion: null,
        detalleCancelacion: null,
        fechaCancelacion: null
      });
      showToast(`Orden SOL-${String(sol.folio).padStart(3, '0')} reactivada exitosamente. Estado actual: ${nuevoEstado}.`, 'success');
      renderGerencia();
      renderProduccion();
      renderMetricas();
      updateHeaderBadges();
    }
  };

  // ==========================================================================
  // MODAL Y FORMULARIO: CULMINAR INTERVENCIÓN (CÁLCULO DOWNTIME / ATENCIÓN)
  // ==========================================================================
  const recalcularDowntimeEnModal = () => {
    const solId = document.getElementById('culminarSolId')?.value;
    const sol = solId ? store.getSolicitudById(solId) : null;
    const isReq = sol ? (sol.tipoSolicitud === 'Requerimiento' || !sol.equipoId) : false;

    const inicioStr = document.getElementById('culminarFechaInicio').value;
    const finStr = document.getElementById('culminarFechaFin').value;
    const calc = store.calcularHorasParada(inicioStr, finStr);
    const label = document.getElementById('liveDowntimeCalc');
    if (label) {
      if (isReq) {
        label.textContent = `${calc.texto} (${calc.decimal} hrs de atención)`;
      } else {
        label.textContent = `${calc.texto} (${calc.decimal} hrs de parada)`;
      }
    }
  };

  window.cmmsAbrirCulminar = (solId) => {
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    document.getElementById('culminarSolId').value = sol.id;
    const isReq = (sol.tipoSolicitud === 'Requerimiento' || !sol.equipoId);
    const eq = store.getEquipoById(sol.equipoId);
    const area = store.getAreaById(sol.areaId);

    const titleEl = document.getElementById('modalCulminarTitle');
    if (titleEl) {
      titleEl.innerHTML = isReq
        ? '<span>✅</span> Culminar Requerimiento de Área'
        : '<span>✅</span> Culminar Intervención y Cierre de Parada';
    }

    const lblInicio = document.getElementById('lblCulminarFechaInicio');
    if (lblInicio) {
      lblInicio.innerHTML = isReq
        ? 'Fecha y Hora de Inicio de Atención <span class="req">*</span>'
        : 'Fecha y Hora de Inicio de Parada / Reparación <span class="req">*</span>';
    }

    const btnSetSol = document.getElementById('btnSetFechaSolicitud');
    if (btnSetSol) {
      btnSetSol.style.display = (isReq && sol.fechaSolicitud) ? 'inline-block' : 'none';
      btnSetSol.dataset.fecha = sol.fechaSolicitud || '';
    }

    const lblDowntime = document.getElementById('labelCulminarDowntime');
    if (lblDowntime) {
      lblDowntime.textContent = isReq
        ? 'TIEMPO DE ATENCIÓN DEL REQUERIMIENTO:'
        : 'TIEMPO TOTAL DE PARADA DEL EQUIPO (DOWNTIME):';
    }

    const lblDiag = document.getElementById('lblCulminarDiagnostico');
    if (lblDiag) {
      lblDiag.innerHTML = isReq
        ? 'Diagnóstico / Alcance del Servicio <span class="req">*</span>'
        : 'Diagnóstico Técnico de la Causa Raíz <span class="req">*</span>';
    }

    const lblSol = document.getElementById('lblCulminarSolucion');
    if (lblSol) {
      lblSol.innerHTML = isReq
        ? 'Trabajos y Adecuaciones Realizadas <span class="req">*</span>'
        : 'Acción Correctiva / Solución Ejecutada <span class="req">*</span>';
    }

    const btnSubmit = document.getElementById('btnSubmitCulminar');
    if (btnSubmit) {
      btnSubmit.textContent = isReq
        ? 'Guardar y Culminar Requerimiento'
        : 'Guardar y Cerrar Parada';
    }

    const tipoBadge = isReq
      ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; font-weight:600;">📋 Requerimiento</span>'
      : '<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:600;">🛠️ Avería</span>';

    const targetDesc = isReq
      ? `Área: <strong>${area ? area.nombre : 'Área General'} (Sin equipo)</strong>`
      : `Equipo: <strong>${eq ? eq.codigo : ''} - ${eq ? eq.nombre : ''}</strong>`;

    document.getElementById('culminarInfoSol').innerHTML = `
      Cerrando Orden <strong>SOL-${String(sol.folio).padStart(3, '0')}</strong> ${tipoBadge} | ${targetDesc}
    `;

    const defaultInicio = sol.fechaInicio || (isReq ? (sol.fechaAsignacion || sol.fechaSolicitud) : sol.fechaSolicitud) || getLocalDateTimeString();
    document.getElementById('culminarFechaInicio').value = defaultInicio;
    document.getElementById('culminarFechaFin').value = getLocalDateTimeString();
    document.getElementById('culminarDiagnostico').value = sol.diagnostico || '';
    document.getElementById('culminarSolucion').value = sol.solucion || '';
    document.getElementById('culminarRepuestos').value = sol.repuestos || '';
    document.getElementById('culminarObservaciones').value = sol.observaciones || '';

    // Si es contratista, mostrar campo de costo final
    const wrapCosto = document.getElementById('culminarContratistaCostoWrap');
    const inputCosto = document.getElementById('culminarContratistaCosto');
    if (sol.tipoEjecutor === 'Contratista' && sol.contratista) {
      if (wrapCosto) wrapCosto.style.display = 'block';
      if (inputCosto) inputCosto.value = sol.contratista.costo || 0;
    } else {
      if (wrapCosto) wrapCosto.style.display = 'none';
    }

    recalcularDowntimeEnModal();
    openModal('modalCulminar');
  };

  document.getElementById('culminarFechaInicio')?.addEventListener('input', recalcularDowntimeEnModal);
  document.getElementById('culminarFechaFin')?.addEventListener('input', recalcularDowntimeEnModal);
  document.getElementById('btnSetNowFin')?.addEventListener('click', () => {
    document.getElementById('culminarFechaFin').value = getLocalDateTimeString();
    recalcularDowntimeEnModal();
  });
  document.getElementById('btnSetFechaSolicitud')?.addEventListener('click', () => {
    const btn = document.getElementById('btnSetFechaSolicitud');
    if (btn && btn.dataset.fecha) {
      document.getElementById('culminarFechaInicio').value = btn.dataset.fecha;
      recalcularDowntimeEnModal();
    }
  });

  document.getElementById('formCulminar')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const solId = document.getElementById('culminarSolId').value;
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    const isReq = (sol.tipoSolicitud === 'Requerimiento' || !sol.equipoId);
    const fechaInicio = document.getElementById('culminarFechaInicio').value;
    const fechaFin = document.getElementById('culminarFechaFin').value;
    const diagnostico = document.getElementById('culminarDiagnostico').value.trim();
    const solucion = document.getElementById('culminarSolucion').value.trim();
    const repuestos = document.getElementById('culminarRepuestos').value.trim();
    const observaciones = document.getElementById('culminarObservaciones').value.trim();

    const calc = store.calcularHorasParada(fechaInicio, fechaFin);

    const patch = {
      estado: 'Culminada',
      fechaInicio,
      fechaFin,
      diagnostico,
      solucion,
      repuestos,
      observaciones
    };

    if (isReq) {
      patch.horasParadaDecimal = 0;
      patch.horasParadaTexto = 'No aplica (Operativo)';
      patch.minutosParadaTotal = 0;
      patch.horasAtencionDecimal = calc.decimal;
      patch.horasAtencionTexto = calc.texto;
      patch.minutosAtencionTotal = calc.minutos;
    } else {
      patch.horasParadaDecimal = calc.decimal;
      patch.horasParadaTexto = calc.texto;
      patch.minutosParadaTotal = calc.minutos;
      patch.horasAtencionDecimal = calc.decimal;
      patch.horasAtencionTexto = calc.texto;
      patch.minutosAtencionTotal = calc.minutos;
    }

    if (sol.tipoEjecutor === 'Contratista' && sol.contratista) {
      const costoFinal = Number(document.getElementById('culminarContratistaCosto').value) || sol.contratista.costo;
      patch.contratista = { ...sol.contratista, costo: costoFinal };
    }

    await store.updateSolicitud(solId, patch);
    closeModal('modalCulminar');
    const toastMsg = isReq
      ? `Requerimiento culminado: ${calc.texto} (${calc.decimal} hrs atención).`
      : `Parada cerrada: ${calc.texto} (${calc.decimal} hrs parada de equipo).`;
    showToast(toastMsg, 'success');

    renderGerencia();
    renderProduccion();
    renderMetricas();
    updateHeaderBadges();
  });

  // ==========================================================================
  // FICHA TÉCNICA DE LA ORDEN (IMPRIMIBLE)
  // ==========================================================================
  window.cmmsVerDetalle = (solId) => {
    const sol = store.getSolicitudById(solId);
    if (!sol) return;

    const area = store.getAreaById(sol.areaId);
    const eq = store.getEquipoById(sol.equipoId);
    const tec = sol.tecnicoId ? store.getEmpleadoById(sol.tecnicoId) : null;
    const cfg = store.getConfig();
    const moneda = cfg.moneda || '$';
    const isReq = (sol.tipoSolicitud === 'Requerimiento' || !sol.equipoId);

    const tipoBadge = isReq
      ? '<span class="badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; font-weight:600;">📋 Requerimiento de Área</span>'
      : '<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-weight:600;">🛠️ Avería de Equipo</span>';

    const equipoDetalle = isReq
      ? '<span class="badge badge-outline">🏢 Área General (Sin equipo asignado)</span>'
      : `${eq ? eq.codigo : 'N/A'} - ${eq ? eq.nombre : ''}`;
    const ubicacionDetalle = isReq
      ? (area ? area.nombre : 'Área General')
      : (eq ? eq.ubicacion : 'N/A');

    let ejecutorTexto = 'Sin asignar';
    if (sol.tipoEjecutor === 'Contratista' && sol.contratista) {
      ejecutorTexto = `🏢 <strong>${sol.contratista.nombre}</strong> (OC: ${sol.contratista.ordenCompra} | Costo: ${moneda} ${Number(sol.contratista.costo).toFixed(2)})`;
    } else if (tec) {
      ejecutorTexto = `👷 <strong>${tec.nombre}</strong> (${tec.especialidad})`;
    }

    const tiempoSectionTitle = isReq ? 'Atención del Requerimiento' : 'Intervención Técnica y Tiempos de Parada';
    const tiempoSectionMetric = isReq
      ? `<div><strong>Tiempo de Atención:</strong> <strong style="color:#0284c7;">${sol.horasAtencionTexto || sol.horasParadaTexto || '0h 00m'}</strong> (${sol.horasAtencionDecimal || 0} hrs)</div>`
      : `<div><strong>Tiempo Total Parada:</strong> <strong class="text-danger">${sol.horasParadaTexto || '0h 00m'}</strong> (${sol.horasParadaDecimal || 0} hrs)</div>`;
    const inicioLabel = isReq ? 'Inicio Atención:' : 'Inicio Parada:';
    const finLabel = isReq ? 'Fin Atención:' : 'Fin Parada:';

    const html = `
      <div style="padding: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-surface);">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--primary); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <div>
            <h2 style="font-size: 1.25rem; color: var(--primary);">${cfg.nombreEmpresa || 'Planta Industrial'}</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">ORDEN DE TRABAJO TÉCNICA - MANTENIMIENTO INDUSTRIAL</p>
          </div>
          <div style="text-align: right;">
            <h3 style="font-size: 1.2rem; color: var(--text-main);">FOLIO: SOL-${String(sol.folio).padStart(3, '0')}</h3>
            <span class="badge badge-info">${sol.estado}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; font-size: 0.9rem; margin-bottom: 1.25rem;">
          <div><strong>Tipo de Solicitud:</strong> ${tipoBadge}</div>
          <div><strong>Turno:</strong> ${sol.turno}</div>
          <div><strong>Fecha de Reporte:</strong> ${sol.fechaSolicitud.replace('T', ' ')}</div>
          <div><strong>Solicitante:</strong> ${sol.solicitante}</div>
          <div><strong>Área de Planta:</strong> ${area ? area.nombre : 'N/A'} (${area ? area.codigo : ''})</div>
          <div><strong>Equipo / Asunto:</strong> ${equipoDetalle}</div>
          <div><strong>Ubicación:</strong> ${ubicacionDetalle}</div>
          <div><strong>Tipo / Falla:</strong> ${sol.tipoFalla}</div>
          <div><strong>Criticidad:</strong> ${sol.criticidad}</div>
        </div>

        <div style="margin-bottom: 1.25rem; padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-sm);">
          <strong>${isReq ? 'Descripción del Requerimiento:' : 'Síntoma / Descripción Inicial:'}</strong>
          <p style="margin-top: 0.25rem;">${sol.descripcion}</p>
        </div>

        ${sol.motivoDetenimiento ? `
          <div style="margin-bottom: 1.25rem; padding: 0.85rem; background: #fff7ed; border-left: 4px solid #ea580c; border-radius: var(--radius-sm);">
            <strong style="color: #c2410c; font-size: 0.95rem;">⏸️ Registro de Detenimiento:</strong> <strong style="color: #9a3412;">${sol.motivoDetenimiento}</strong><br>
            <div style="margin-top: 0.35rem; font-size: 0.88rem; color: var(--text-main);">
              <span><strong>Fecha y Hora de Detención:</strong> ${sol.fechaDetenimiento ? sol.fechaDetenimiento.replace('T', ' ') : '-'}</span><br>
              <span><strong>Justificación / Notas:</strong> ${sol.detalleDetenimiento || 'Sin observaciones registradas'}</span>
            </div>
          </div>
        ` : ''}

        ${sol.estado === 'Cancelada' ? `
          <div style="margin-bottom: 1.25rem; padding: 0.85rem; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: var(--radius-sm);">
            <strong style="color: #dc2626; font-size: 0.95rem;">🗑️ Solicitud Anulada / Desestimada:</strong> <strong style="color: #991b1b;">${sol.motivoCancelacion || 'Cancelada'}</strong><br>
            <div style="margin-top: 0.35rem; font-size: 0.88rem; color: var(--text-main);">
              <span><strong>Fecha y Hora de la Baja:</strong> ${sol.fechaCancelacion ? sol.fechaCancelacion.replace('T', ' ') : '-'}</span><br>
              <span><strong>Justificación Técnica del Descarte:</strong> ${sol.detalleCancelacion || 'Sin observaciones registradas'}</span>
            </div>
          </div>
        ` : ''}

        <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-bottom: 1rem;">
          <h4 style="margin-bottom: 0.5rem; color: var(--primary);">${tiempoSectionTitle}</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.9rem;">
            <div><strong>Ejecutado Por:</strong> ${ejecutorTexto}</div>
            ${tiempoSectionMetric}
            <div><strong>${inicioLabel}</strong> ${sol.fechaInicio ? sol.fechaInicio.replace('T', ' ') : '-'}</div>
            <div><strong>${finLabel}</strong> ${sol.fechaFin ? sol.fechaFin.replace('T', ' ') : '-'}</div>
          </div>
        </div>

        ${sol.diagnostico ? `
          <div style="margin-bottom: 0.75rem;">
            <strong>${isReq ? 'Diagnóstico / Alcance del Servicio:' : 'Diagnóstico de Causa Raíz:'}</strong>
            <p>${sol.diagnostico}</p>
          </div>
        ` : ''}

        ${sol.solucion ? `
          <div style="margin-bottom: 0.75rem;">
            <strong>${isReq ? 'Trabajo Realizado:' : 'Acción Correctiva Ejecutada:'}</strong>
            <p>${sol.solucion}</p>
          </div>
        ` : ''}

        ${sol.repuestos ? `
          <div style="margin-bottom: 0.75rem;">
            <strong>${isReq ? 'Materiales / Insumos Utilizados:' : 'Repuestos y Materiales:'}</strong>
            <p>${sol.repuestos}</p>
          </div>
        ` : ''}

        ${sol.observaciones ? `
          <div style="margin-bottom: 1rem;">
            <strong>Observaciones de Entrega:</strong>
            <p>${sol.observaciones}</p>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px dashed var(--border-dark); font-size: 0.85rem; text-align: center;">
          <div style="width: 200px; border-top: 1px solid #000; padding-top: 0.25rem;">Firma Solicitante</div>
          <div style="width: 200px; border-top: 1px solid #000; padding-top: 0.25rem;">Firma Técnico / Supervisor</div>
        </div>
      </div>
    `;

    document.getElementById('detalleContenido').innerHTML = html;
    openModal('modalDetalle');
  };

  // ==========================================================================
  // ACCIONES DINÁMICAS DE PREVENTIVO
  // ==========================================================================
  window.cmmsGenerarOTPreventiva = async (prevId) => {
    if (confirm('¿Desea generar la Orden de Trabajo inmediata para este plan preventivo?')) {
      const sol = await store.generarOTDesdePreventivo(prevId);
      if (sol) {
        showToast(`Orden preventiva SOL-${String(sol.folio).padStart(3, '0')} creada y asignada en Mantenimiento.`, 'success');
        renderPreventivo();
        renderGerencia();
        updateHeaderBadges();
      }
    }
  };

  window.cmmsEditarPreventivo = (prevId) => {
    const p = store.getPreventivoById(prevId);
    if (!p) return;

    populateAreaSelects();
    populateTecnicoSelects();

    document.getElementById('prevEditId').value = p.id;
    document.getElementById('modalPrevTitle').innerHTML = `<span>✏️</span> Editar Plan Preventivo: ${p.codigo}`;
    document.getElementById('prevCodigo').value = p.codigo;
    document.getElementById('prevTitulo').value = p.titulo;
    document.getElementById('prevAreaId').value = p.areaId;

    // Poblar equipos de esa área
    const eqSel = document.getElementById('prevEquipoId');
    const equipos = store.getEquiposByArea(p.areaId);
    eqSel.disabled = false;
    eqSel.innerHTML = equipos.map(e => `<option value="${e.id}">${e.codigo} - ${e.nombre}</option>`).join('');
    eqSel.value = p.equipoId;

    document.getElementById('prevFrecuencia').value = p.frecuencia || 'Mensual';
    const grpDias = document.getElementById('grpPrevDiasPersonalizados');
    const inputDias = document.getElementById('prevDiasPersonalizados');
    if (p.frecuencia === 'Personalizado') {
      if (grpDias) grpDias.style.display = 'block';
      if (inputDias) inputDias.value = p.diasFrecuencia || '';
    } else {
      if (grpDias) grpDias.style.display = 'none';
      if (inputDias) inputDias.value = '';
    }
    document.getElementById('prevProximaFecha').value = p.proximaFecha;
    document.getElementById('prevTipoEjecutor').value = p.tipoEjecutor || 'Interno';

    const respWrap = document.getElementById('prevResponsableWrap');
    const contWrap = document.getElementById('prevContratistaWrap');

    if (p.tipoEjecutor === 'Contratista') {
      if (respWrap) respWrap.style.display = 'none';
      if (contWrap) contWrap.style.display = 'block';
      document.getElementById('prevContratistaNombre').value = p.contratistaPrevisto ? p.contratistaPrevisto.nombre : '';
    } else {
      if (respWrap) respWrap.style.display = 'block';
      if (contWrap) contWrap.style.display = 'none';
      document.getElementById('prevResponsableId').value = p.responsableId || '';
    }

    document.getElementById('prevCostoEstimado').value = p.costoEstimado || 0;
    document.getElementById('prevTareas').value = (p.tareas || []).join('\n');
    document.getElementById('prevObservaciones').value = p.observaciones || '';

    openModal('modalPreventivo');
  };

  window.cmmsEliminarPreventivo = async (prevId) => {
    if (confirm('¿Está seguro de eliminar este plan preventivo?')) {
      await store.deletePreventivo(prevId);
      showToast('Plan preventivo eliminado.', 'success');
      renderPreventivo();
    }
  };

  // ==========================================================================
  // ACCIONES CRUD DEL ADMINISTRADOR (ÁREAS, EQUIPOS, EMPLEADOS)
  // ==========================================================================

  // Áreas
  document.getElementById('btnNuevaArea')?.addEventListener('click', () => {
    document.getElementById('formArea').reset();
    document.getElementById('areaEditId').value = '';
    document.getElementById('modalAreaTitle').innerHTML = `<span>🏭</span> Registrar Área de Producción`;
    openModal('modalArea');
  });

  window.cmmsEditarArea = (id) => {
    const a = store.getAreaById(id);
    if (!a) return;
    document.getElementById('areaEditId').value = a.id;
    document.getElementById('modalAreaTitle').innerHTML = `<span>✏️</span> Editar Área: ${a.codigo}`;
    document.getElementById('areaCodigo').value = a.codigo;
    document.getElementById('areaNombre').value = a.nombre;
    document.getElementById('areaDescripcion').value = a.descripcion || '';
    openModal('modalArea');
  };

  window.cmmsEliminarArea = async (id) => {
    try {
      if (confirm('¿Desea eliminar esta área?')) {
        await store.deleteArea(id);
        showToast('Área eliminada.', 'success');
        renderAdminAreas();
        populateAreaSelects();
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  document.getElementById('formArea')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('areaEditId').value;
    const codigo = document.getElementById('areaCodigo').value.trim().toUpperCase();
    const nombre = document.getElementById('areaNombre').value.trim();
    const descripcion = document.getElementById('areaDescripcion').value.trim();

    if (editId) {
      await store.updateArea(editId, { codigo, nombre, descripcion });
      showToast('Área actualizada.', 'success');
    } else {
      await store.createArea({ codigo, nombre, descripcion });
      showToast('Área registrada exitosamente.', 'success');
    }
    closeModal('modalArea');
    renderAdminAreas();
    populateAreaSelects();
  });

  // Equipos
  document.getElementById('btnNuevoEquipo')?.addEventListener('click', () => {
    populateAreaSelects();
    document.getElementById('formEquipo').reset();
    document.getElementById('equipoEditId').value = '';
    document.getElementById('modalEquipoTitle').innerHTML = `<span>⚙️</span> Registrar Equipo`;
    openModal('modalEquipo');
  });

  window.cmmsEditarEquipo = (id) => {
    const eq = store.getEquipoById(id);
    if (!eq) return;
    populateAreaSelects();
    document.getElementById('equipoEditId').value = eq.id;
    document.getElementById('modalEquipoTitle').innerHTML = `<span>✏️</span> Editar Equipo: ${eq.codigo}`;
    document.getElementById('equipoCodigo').value = eq.codigo;
    document.getElementById('equipoNombre').value = eq.nombre;
    document.getElementById('equipoAreaId').value = eq.areaId;
    document.getElementById('equipoUbicacion').value = eq.ubicacion || '';
    document.getElementById('equipoCriticidad').value = eq.criticidad || 'Media';
    document.getElementById('equipoEstado').value = eq.estado || 'Operativo';
    openModal('modalEquipo');
  };

  window.cmmsEliminarEquipo = async (id) => {
    try {
      if (confirm('¿Desea eliminar este equipo?')) {
        await store.deleteEquipo(id);
        showToast('Equipo eliminado.', 'success');
        renderAdminEquipos();
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  document.getElementById('formEquipo')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('equipoEditId').value;
    const codigo = document.getElementById('equipoCodigo').value.trim().toUpperCase();
    const nombre = document.getElementById('equipoNombre').value.trim();
    const areaId = document.getElementById('equipoAreaId').value;
    const ubicacion = document.getElementById('equipoUbicacion').value.trim();
    const criticidad = document.getElementById('equipoCriticidad').value;
    const estado = document.getElementById('equipoEstado').value;

    if (editId) {
      await store.updateEquipo(editId, { codigo, nombre, areaId, ubicacion, criticidad, estado });
      showToast('Equipo actualizado.', 'success');
    } else {
      await store.createEquipo({ codigo, nombre, areaId, ubicacion, criticidad, estado });
      showToast('Equipo registrado exitosamente.', 'success');
    }
    closeModal('modalEquipo');
    renderAdminEquipos();
  });

  // Empleados
  document.getElementById('btnNuevoEmpleado')?.addEventListener('click', () => {
    document.getElementById('formEmpleado').reset();
    document.getElementById('empEditId').value = '';
    document.getElementById('modalEmpleadoTitle').innerHTML = `<span>👥</span> Registrar Empleado`;
    openModal('modalEmpleado');
  });

  window.cmmsEditarEmpleado = (id) => {
    const emp = store.getEmpleadoById(id);
    if (!emp) return;
    document.getElementById('empEditId').value = emp.id;
    document.getElementById('modalEmpleadoTitle').innerHTML = `<span>✏️</span> Editar Empleado: ${emp.nombre}`;
    document.getElementById('empNombre').value = emp.nombre;
    document.getElementById('empRol').value = emp.rol || 'Técnico';
    document.getElementById('empEspecialidad').value = emp.especialidad;
    document.getElementById('empTelefono').value = emp.telefono || '';
    openModal('modalEmpleado');
  };

  window.cmmsEliminarEmpleado = async (id) => {
    if (confirm('¿Desea eliminar este empleado del sistema?')) {
      await store.deleteEmpleado(id);
      showToast('Empleado eliminado.', 'success');
      renderAdminEmpleados();
      populateTecnicoSelects();
    }
  };

  document.getElementById('formEmpleado')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('empEditId').value;
    const nombre = document.getElementById('empNombre').value.trim();
    const rol = document.getElementById('empRol').value;
    const especialidad = document.getElementById('empEspecialidad').value.trim();
    const telefono = document.getElementById('empTelefono').value.trim();

    if (editId) {
      await store.updateEmpleado(editId, { nombre, rol, especialidad, telefono });
      showToast('Empleado actualizado.', 'success');
    } else {
      await store.createEmpleado({ nombre, rol, especialidad, telefono });
      showToast('Empleado registrado exitosamente.', 'success');
    }
    closeModal('modalEmpleado');
    renderAdminEmpleados();
    populateTecnicoSelects();
  });

  // ==========================================================================
  // EVENTOS REMOTOS Y TIEMPO REAL
  // ==========================================================================
  window.addEventListener('cmms:data-updated', () => {
    updateEnvironmentUI();
    if (currentView === 'produccion') renderProduccion();
    else if (currentView === 'gerencia') renderGerencia();
    else if (currentView === 'preventivo') renderPreventivo();
    else if (currentView === 'metricas') renderMetricas();
    else if (currentView === 'admin') renderAdmin();
    updateHeaderBadges();
  });

  window.addEventListener('cmms:env-changed', () => {
    updateEnvironmentUI();
  });

  // ==========================================================================
  // INICIALIZACIÓN DE LA APLICACIÓN
  // ==========================================================================
  await store.init();
  updateEnvironmentUI();
  applyRolePermissions();
  populateAreaSelects();
  populateTecnicoSelects();
  updateHeaderBadges();
});
