/**
 * Analytics.js - Motor de Analítica Avanzada y Métricas CMMS
 * Calcula MTTR, MTBF, Horas de Parada por Equipo y Área, Eficiencia de Técnicos,
 * Relación Ejecutadas vs Pendientes, Costos de Contratistas y Cumplimiento Preventivo.
 */

class AnalyticsEngine {
  constructor(store) {
    this.store = store;
  }

  // Filtrar solicitudes por período de tiempo
  getFilteredRequests(dateRange = 'all', customStart = null, customEnd = null) {
    const all = this.store.getSolicitudes();
    if (dateRange === 'all') return all;

    const now = new Date();
    let startDate = new Date(0);

    if (dateRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateRange === 'custom' && customStart) {
      startDate = new Date(customStart);
    }

    let endDate = now;
    if (dateRange === 'custom' && customEnd) {
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    }

    return all.filter(s => {
      const d = new Date(s.fechaSolicitud);
      return d >= startDate && d <= endDate;
    });
  }

  // Resumen principal de KPIs
  getKPIs(dateRange = 'all', customStart = null, customEnd = null) {
    const solicitudes = this.getFilteredRequests(dateRange, customStart, customEnd);
    const totalSolicitudes = solicitudes.length;

    let totalMinutosParada = 0;       // Solo para Averías de Equipos (Parada de planta)
    let totalMinutosAtencion = 0;     // Para Requerimientos / Servicios de Área
    let culminadasCount = 0;
    let averiasCulminadasCount = 0;
    let requerimientosCulminadosCount = 0;
    let averiasTotalCount = 0;
    let requerimientosTotalCount = 0;

    let enIntervencionCount = 0;
    let pendientesCount = 0;
    let asignadasCount = 0;
    let detenidasCount = 0;
    let canceladasCount = 0;
    let costoTotalContratistas = 0;
    let cantidadContratistas = 0;

    solicitudes.forEach(s => {
      const isReq = (s.tipoSolicitud === 'Requerimiento' || !s.equipoId);
      if (isReq) requerimientosTotalCount++;
      else averiasTotalCount++;

      if (s.estado === 'Culminada') {
        culminadasCount++;
        if (isReq) {
          requerimientosCulminadosCount++;
          totalMinutosAtencion += (s.minutosAtencionTotal || s.minutosParadaTotal || 0);
        } else {
          averiasCulminadasCount++;
          totalMinutosParada += (s.minutosParadaTotal || 0);
        }
      } else if (s.estado === 'En Intervención') {
        enIntervencionCount++;
      } else if (s.estado === 'Pendiente') {
        pendientesCount++;
      } else if (s.estado === 'Asignada') {
        asignadasCount++;
      } else if (s.estado === 'Detenida') {
        detenidasCount++;
      } else if (s.estado === 'Cancelada') {
        canceladasCount++;
      }

      if (s.tipoEjecutor === 'Contratista' && s.contratista && s.contratista.costo) {
        costoTotalContratistas += Number(s.contratista.costo) || 0;
        cantidadContratistas++;
      }
    });

    // Horas de Parada de Equipos (Downtime real de planta)
    const totalHorasDecimal = Number((totalMinutosParada / 60).toFixed(2));
    const h = Math.floor(totalMinutosParada / 60);
    const m = totalMinutosParada % 60;
    const totalHorasTexto = `${h}h ${m.toString().padStart(2, '0')}m`;

    // Tiempo de Atención de Requerimientos de Área (Servicios / Mejoras)
    const totalAtencionDecimal = Number((totalMinutosAtencion / 60).toFixed(2));
    const ah = Math.floor(totalMinutosAtencion / 60);
    const am = totalMinutosAtencion % 60;
    const totalAtencionTexto = `${ah}h ${am.toString().padStart(2, '0')}m`;

    // MTTR (Mean Time To Repair en horas): Horas de parada / fallas de equipo culminadas
    const mttrDecimal = averiasCulminadasCount > 0
      ? Number((totalHorasDecimal / averiasCulminadasCount).toFixed(2))
      : 0;

    // MTBF (Mean Time Between Failures): Tiempo operativo / averías de equipo
    // Estimación: Período activo (30 días * 24h = 720h base por equipo activo)
    const equipos = this.store.getEquipos();
    const cantEquipos = Math.max(equipos.length, 1);
    const horasPeriodoTotal = cantEquipos * 720; // 30 días base
    const tiempoOperativoNeto = Math.max(horasPeriodoTotal - totalHorasDecimal, 0);
    const mtbfDecimal = averiasCulminadasCount > 0
      ? Number((tiempoOperativoNeto / averiasCulminadasCount).toFixed(1))
      : horasPeriodoTotal;

    // Métricas de Preventivo
    const preventivos = this.store.getPreventivos();
    const totalPrev = preventivos.length;
    const prevAlDia = preventivos.filter(p => p.estado === 'Al Día').length;
    const prevVencidos = preventivos.filter(p => p.estado === 'Vencido').length;
    const prevProximos = preventivos.filter(p => p.estado === 'Próximo').length;
    const tasaCumplimientoPrev = totalPrev > 0 ? Math.round((prevAlDia / totalPrev) * 100) : 100;

    // Tasa de Resolución
    const totalAbiertas = pendientesCount + asignadasCount + enIntervencionCount + detenidasCount;
    const tasaResolucion = totalSolicitudes > 0
      ? Math.round((culminadasCount / totalSolicitudes) * 100)
      : 0;

    const config = this.store.getConfig();

    return {
      totalSolicitudes,
      averiasTotalCount,
      requerimientosTotalCount,
      culminadasCount,
      averiasCulminadasCount,
      requerimientosCulminadosCount,
      totalAbiertas,
      enIntervencionCount,
      pendientesCount,
      asignadasCount,
      detenidasCount,
      canceladasCount,
      totalMinutosParada,
      totalHorasDecimal,
      totalHorasTexto,
      totalMinutosAtencion,
      totalAtencionDecimal,
      totalAtencionTexto,
      totalHorasAtencionDecimal: totalAtencionDecimal,
      totalHorasAtencionTexto: totalAtencionTexto,
      mttrDecimal,
      mtbfDecimal,
      costoTotalContratistas: Number(costoTotalContratistas.toFixed(2)),
      cantidadContratistas,
      tasaResolucion,
      moneda: config.moneda || '$',
      preventivos: {
        total: totalPrev,
        alDia: prevAlDia,
        vencidos: prevVencidos,
        proximos: prevProximos,
        cumplimiento: tasaCumplimientoPrev
      }
    };
  }

  // 1. Horas y Conteo de Paradas por Equipo (Solo Averías con Equipo)
  getDowntimeByEquipment(dateRange = 'all') {
    const solicitudes = this.getFilteredRequests(dateRange).filter(s => s.equipoId && s.tipoSolicitud !== 'Requerimiento');
    const map = {};

    solicitudes.forEach(s => {
      if (!map[s.equipoId]) {
        const eq = this.store.getEquipoById(s.equipoId);
        const area = eq ? this.store.getAreaById(eq.areaId) : null;
        map[s.equipoId] = {
          equipoId: s.equipoId,
          codigo: eq ? eq.codigo : 'N/A',
          nombre: eq ? eq.nombre : 'Equipo Desconocido',
          areaNombre: area ? area.nombre : 'Área Desconocida',
          paradasCount: 0,
          minutosParada: 0,
          horasDecimal: 0,
          costoTerceros: 0
        };
      }

      map[s.equipoId].paradasCount++;
      if (s.estado === 'Culminada') {
        map[s.equipoId].minutosParada += (s.minutosParadaTotal || 0);
      }
      if (s.tipoEjecutor === 'Contratista' && s.contratista && s.contratista.costo) {
        map[s.equipoId].costoTerceros += Number(s.contratista.costo) || 0;
      }
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        horasDecimal: Number((item.minutosParada / 60).toFixed(2)),
        horasTexto: `${Math.floor(item.minutosParada / 60)}h ${(item.minutosParada % 60).toString().padStart(2, '0')}m`
      }))
      .sort((a, b) => b.horasDecimal - a.horasDecimal);
  }

  // 2. Horas y Conteo de Paradas por Área
  getDowntimeByArea(dateRange = 'all') {
    const solicitudes = this.getFilteredRequests(dateRange);
    const map = {};

    solicitudes.forEach(s => {
      if (!map[s.areaId]) {
        const area = this.store.getAreaById(s.areaId);
        map[s.areaId] = {
          areaId: s.areaId,
          codigo: area ? area.codigo : 'N/A',
          nombre: area ? area.nombre : 'Área Desconocida',
          paradasCount: 0,
          requerimientosCount: 0,
          minutosParada: 0,
          minutosAtencion: 0,
          horasDecimal: 0,
          horasAtencionDecimal: 0,
          costoTerceros: 0
        };
      }

      const isReq = (s.tipoSolicitud === 'Requerimiento' || !s.equipoId);
      if (isReq) {
        map[s.areaId].requerimientosCount++;
        if (s.estado === 'Culminada') {
          map[s.areaId].minutosAtencion += (s.minutosAtencionTotal || s.minutosParadaTotal || 0);
        }
      } else {
        map[s.areaId].paradasCount++;
        if (s.estado === 'Culminada') {
          map[s.areaId].minutosParada += (s.minutosParadaTotal || 0);
        }
      }

      if (s.tipoEjecutor === 'Contratista' && s.contratista && s.contratista.costo) {
        map[s.areaId].costoTerceros += Number(s.contratista.costo) || 0;
      }
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        horasDecimal: Number((item.minutosParada / 60).toFixed(2)),
        horasTexto: `${Math.floor(item.minutosParada / 60)}h ${(item.minutosParada % 60).toString().padStart(2, '0')}m`,
        horasAtencionDecimal: Number((item.minutosAtencion / 60).toFixed(2)),
        horasAtencionTexto: `${Math.floor(item.minutosAtencion / 60)}h ${(item.minutosAtencion % 60).toString().padStart(2, '0')}m`
      }))
      .sort((a, b) => b.paradasCount - a.paradasCount);
  }

  // 3. Eficiencia y Desempeño por Técnico
  getTechnicianEfficiency(dateRange = 'all') {
    const solicitudes = this.getFilteredRequests(dateRange);
    const empleados = this.store.getEmpleados();
    const tecnicos = empleados.filter(e => e.rol === 'Técnico' || e.rol === 'Supervisor');
    const map = {};

    tecnicos.forEach(t => {
      map[t.id] = {
        id: t.id,
        nombre: t.nombre,
        especialidad: t.especialidad,
        asignadas: 0,
        culminadas: 0,
        enProceso: 0,
        totalMinutos: 0,
        tiempoMedioDecimal: 0,
        eficienciaPct: 0
      };
    });

    solicitudes.forEach(s => {
      if (s.tipoEjecutor === 'Interno' && s.tecnicoId && map[s.tecnicoId]) {
        map[s.tecnicoId].asignadas++;
        if (s.estado === 'Culminada') {
          map[s.tecnicoId].culminadas++;
          map[s.tecnicoId].totalMinutos += (s.minutosParadaTotal || 0) + (s.minutosAtencionTotal || 0);
        } else if (s.estado === 'En Intervención' || s.estado === 'Asignada') {
          map[s.tecnicoId].enProceso++;
        }
      }
    });

    return Object.values(map).map(t => {
      const horasTotal = Number((t.totalMinutos / 60).toFixed(2));
      const tiempoMedio = t.culminadas > 0 ? Number((horasTotal / t.culminadas).toFixed(2)) : 0;
      const pct = t.asignadas > 0 ? Math.round((t.culminadas / t.asignadas) * 100) : 0;
      return {
        ...t,
        horasTotal,
        tiempoMedioDecimal: tiempoMedio,
        eficienciaPct: pct
      };
    }).sort((a, b) => b.culminadas - a.culminadas);
  }

  // 4. Análisis de Costos de Contratistas Externos
  getContractorCostAnalytics(dateRange = 'all') {
    const solicitudes = this.getFilteredRequests(dateRange);
    const contratistasMap = {};
    let granTotalCosto = 0;

    solicitudes.forEach(s => {
      if (s.tipoEjecutor === 'Contratista' && s.contratista && s.contratista.nombre) {
        const nombre = s.contratista.nombre.trim();
        const costo = Number(s.contratista.costo) || 0;
        granTotalCosto += costo;

        if (!contratistasMap[nombre]) {
          contratistasMap[nombre] = {
            nombre,
            trabajosCount: 0,
            costoTotal: 0,
            ordenes: []
          };
        }

        contratistasMap[nombre].trabajosCount++;
        contratistasMap[nombre].costoTotal += costo;
        contratistasMap[nombre].ordenes.push({
          folio: s.folio,
          solicitudId: s.id,
          ordenCompra: s.contratista.ordenCompra,
          costo,
          equipo: s.equipoId
        });
      }
    });

    const lista = Object.values(contratistasMap).map(c => ({
      ...c,
      costoTotal: Number(c.costoTotal.toFixed(2)),
      costoPromedio: c.trabajosCount > 0 ? Number((c.costoTotal / c.trabajosCount).toFixed(2)) : 0,
      porcentajeDelGasto: granTotalCosto > 0 ? Math.round((c.costoTotal / granTotalCosto) * 100) : 0
    })).sort((a, b) => b.costoTotal - a.costoTotal);

    return {
      granTotalCosto: Number(granTotalCosto.toFixed(2)),
      contratistas: lista
    };
  }

  // ==========================================
  // GENERADORES DE GRÁFICOS EN FORMATO SVG
  // ==========================================

  // Gráfico de Barras Horizontales: Downtime por Equipo
  renderBarChartDowntime(containerId, data, limit = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const items = data.slice(0, limit);
    if (items.length === 0 || items.every(i => i.horasDecimal === 0)) {
      container.innerHTML = `<div class="chart-empty">No hay paradas registradas en el período seleccionado.</div>`;
      return;
    }

    const maxVal = Math.max(...items.map(i => i.horasDecimal), 1);
    let html = `<div class="bar-chart-container">`;

    items.forEach(item => {
      const pct = Math.max(Math.round((item.horasDecimal / maxVal) * 100), 5);
      html += `
        <div class="bar-row">
          <div class="bar-label">
            <strong>${item.codigo}</strong>
            <span class="bar-sublabel">${item.nombre}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${pct}%;">
              <span class="bar-value">${item.horasDecimal} hrs (${item.paradasCount} fallas)</span>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  // Gráfico Comparativo: Solicitudes Ejecutadas vs Pendientes
  renderStatusDonutChart(containerId, kpis) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const culminadas = kpis.culminadasCount;
    const enIntervencion = kpis.enIntervencionCount;
    const asignadas = kpis.asignadasCount;
    const pendientes = kpis.pendientesCount;
    const detenidas = kpis.detenidasCount || 0;
    const total = kpis.totalSolicitudes;

    if (total === 0) {
      container.innerHTML = `<div class="chart-empty">Sin solicitudes registradas.</div>`;
      return;
    }

    const pctCulm = Math.round((culminadas / total) * 100);
    const pctProc = Math.round(((enIntervencion + asignadas) / total) * 100);
    const pctDet = Math.round((detenidas / total) * 100);
    const pctPend = Math.round((pendientes / total) * 100);

    let segmentsHtml = `
      <div class="progress-segment seg-success" style="width: ${pctCulm}%;" title="Culminadas: ${culminadas} (${pctCulm}%)"></div>
      <div class="progress-segment seg-warning" style="width: ${pctProc}%;" title="En Proceso: ${enIntervencion + asignadas} (${pctProc}%)"></div>
    `;
    if (detenidas > 0) {
      segmentsHtml += `<div class="progress-segment" style="width: ${pctDet}%; background: #ea580c;" title="Detenidas: ${detenidas} (${pctDet}%)"></div>`;
    }
    segmentsHtml += `<div class="progress-segment seg-danger" style="width: ${pctPend}%;" title="Pendientes: ${pendientes} (${pctPend}%)"></div>`;

    let legendHtml = `
      <div class="legend-item"><span class="legend-dot dot-success"></span><strong>Culminadas:</strong> ${culminadas} (${pctCulm}%)</div>
      <div class="legend-item"><span class="legend-dot dot-warning"></span><strong>En Proceso:</strong> ${enIntervencion + asignadas} (${pctProc}%)</div>
    `;
    if (detenidas > 0) {
      legendHtml += `<div class="legend-item"><span class="legend-dot" style="background: #ea580c;"></span><strong>Detenidas:</strong> ${detenidas} (${pctDet}%)</div>`;
    }
    legendHtml += `<div class="legend-item"><span class="legend-dot dot-danger"></span><strong>Pendientes:</strong> ${pendientes} (${pctPend}%)</div>`;

    container.innerHTML = `
      <div class="status-comparison-card">
        <div class="progress-stacked-bar">
          ${segmentsHtml}
        </div>
        <div class="status-legend-grid">
          ${legendHtml}
        </div>
      </div>
    `;
  }

  // Gráfico de Eficiencia por Técnico
  renderTechnicianChart(containerId, techs) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!techs || techs.length === 0) {
      container.innerHTML = `<div class="chart-empty">No hay técnicos asignados.</div>`;
      return;
    }

    let html = `<div class="table-responsive"><table class="custom-table compact-table">
      <thead>
        <tr>
          <th>Técnico Especialista</th>
          <th>Especialidad</th>
          <th style="text-align:center;">Asignadas</th>
          <th style="text-align:center;">Culminadas</th>
          <th style="text-align:center;">En Proceso</th>
          <th style="text-align:center;">Tiempo Medio</th>
          <th style="text-align:right;">Efectividad</th>
        </tr>
      </thead>
      <tbody>`;

    techs.forEach(t => {
      const badgeClass = t.eficienciaPct >= 80 ? 'badge-success' : (t.eficienciaPct >= 50 ? 'badge-warning' : 'badge-danger');
      html += `
        <tr>
          <td><strong>👷 ${t.nombre}</strong></td>
          <td><span class="text-muted">${t.especialidad}</span></td>
          <td style="text-align:center;">${t.asignadas}</td>
          <td style="text-align:center;"><strong class="text-success">${t.culminadas}</strong></td>
          <td style="text-align:center;">${t.enProceso}</td>
          <td style="text-align:center;">${t.tiempoMedioDecimal > 0 ? t.tiempoMedioDecimal + ' hrs' : '-'}</td>
          <td style="text-align:right;"><span class="badge ${badgeClass}">${t.eficienciaPct}%</span></td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  }

  // Gráfico / Tabla de Costos de Contratistas
  renderContractorCosts(containerId, costData, moneda = '$') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!costData.contratistas || costData.contratistas.length === 0) {
      container.innerHTML = `<div class="chart-empty">No hay intervenciones ejecutadas por contratistas externos en este período.</div>`;
      return;
    }

    let html = `
      <div class="contractor-summary-banner">
        <span>Gasto Acumulado en Terceros:</span>
        <strong class="text-purple">${moneda} ${costData.granTotalCosto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
      </div>
      <div class="table-responsive">
        <table class="custom-table compact-table">
          <thead>
            <tr>
              <th>Empresa / Contratista</th>
              <th style="text-align:center;">Intervenciones</th>
              <th style="text-align:right;">Costo Total</th>
              <th style="text-align:right;">Promedio/OT</th>
              <th style="text-align:right;">% Participación</th>
            </tr>
          </thead>
          <tbody>`;

    costData.contratistas.forEach(c => {
      html += `
        <tr>
          <td><strong>🏢 ${c.nombre}</strong></td>
          <td style="text-align:center;">${c.trabajosCount}</td>
          <td style="text-align:right; font-weight: bold; color: var(--purple);">${moneda} ${c.costoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
          <td style="text-align:right;">${moneda} ${c.costoPromedio.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
          <td style="text-align:right;">${c.porcentajeDelGasto}%</td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
  }

  // Exportar Matriz a CSV/Excel con soporte de Terceros y Costos
  exportToCSV(dateRange = 'all') {
    const solicitudes = this.getFilteredRequests(dateRange);
    const cfg = this.store.getConfig();
    const moneda = cfg.moneda || '$';

    const headers = [
      'Folio',
      'Fecha Solicitud',
      'Solicitante',
      'Turno',
      'Area',
      'Codigo Equipo',
      'Nombre Equipo',
      'Tipo de Falla',
      'Criticidad',
      'Estado',
      'Ejecutor',
      'Tecnico Asignado',
      'Contratista Externo',
      'Orden de Compra',
      `Costo Tercero (${moneda})`,
      'Fecha Inicio Parada',
      'Fecha Fin Parada',
      'Horas Parada (Decimal)',
      'Horas Parada (Texto)',
      'Diagnostico',
      'Solucion',
      'Repuestos',
      'Observaciones'
    ];

    const rows = solicitudes.map(s => {
      const eq = this.store.getEquipoById(s.equipoId);
      const area = this.store.getAreaById(s.areaId);
      const tec = s.tecnicoId ? this.store.getEmpleadoById(s.tecnicoId) : null;
      const contratistaNom = (s.tipoEjecutor === 'Contratista' && s.contratista) ? s.contratista.nombre : '';
      const oc = (s.tipoEjecutor === 'Contratista' && s.contratista) ? s.contratista.ordenCompra : '';
      const costo = (s.tipoEjecutor === 'Contratista' && s.contratista) ? s.contratista.costo : 0;

      return [
        `SOL-${String(s.folio).padStart(3, '0')}`,
        s.fechaSolicitud || '',
        `"${(s.solicitante || '').replace(/"/g, '""')}"`,
        s.turno || '',
        `"${(area ? area.nombre : '').replace(/"/g, '""')}"`,
        eq ? eq.codigo : '',
        `"${(eq ? eq.nombre : '').replace(/"/g, '""')}"`,
        s.tipoFalla || '',
        s.criticidad || '',
        s.estado || '',
        s.tipoEjecutor || 'Interno',
        `"${(tec ? tec.nombre : '').replace(/"/g, '""')}"`,
        `"${contratistaNom.replace(/"/g, '""')}"`,
        oc,
        costo,
        s.fechaInicio || '',
        s.fechaFin || '',
        (s.tipoSolicitud === 'Requerimiento' ? (s.horasAtencionDecimal || 0) : (s.horasParadaDecimal || 0)),
        (s.tipoSolicitud === 'Requerimiento' ? (s.horasAtencionTexto || '0h 00m') : (s.horasParadaTexto || '0h 00m')),
        `"${(s.diagnostico || '').replace(/"/g, '""')}"`,
        `"${(s.solucion || '').replace(/"/g, '""')}"`,
        `"${(s.repuestos || '').replace(/"/g, '""')}"`,
        `"${(s.observaciones || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CMMS_Mantenimiento_Reporte_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Instancia global
window.cmmsAnalytics = new AnalyticsEngine(window.cmmsStore);
window.analyticsEngine = window.cmmsAnalytics;
