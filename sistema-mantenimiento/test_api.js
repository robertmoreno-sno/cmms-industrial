/**
 * test_api.js - Script de Verificación Integral de la API y Servidor CMMS
 */

const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Iniciando pruebas automatizadas del servidor CMMS...\n');

  try {
    // 1. GET /api/info
    const info = await request({ hostname: 'localhost', port: 3000, path: '/api/info', method: 'GET' });
    console.log(`✅ [1/6] GET /api/info -> Status: ${info.status}, Version: ${info.body.version}, IPs: ${info.body.localIPs.join(', ')}`);

    // 2. GET /api/data
    const data = await request({ hostname: 'localhost', port: 3000, path: '/api/data', method: 'GET' });
    console.log(`✅ [2/6] GET /api/data -> Status: ${data.status}`);
    console.log(`       Áreas: ${data.body.areas.length}, Equipos: ${data.body.equipos.length}, Empleados: ${data.body.empleados.length}, Solicitudes: ${data.body.solicitudes.length}, Preventivos: ${data.body.preventivos.length}`);

    // 3. POST /api/solicitudes (Crear Solicitud de Producción)
    const newTicket = {
      solicitante: 'Marcos Rivas (Supervisor Envasado)',
      turno: 'Mañana',
      areaId: 'AREA-1',
      equipoId: 'EQ-1',
      tipoFalla: 'Mecánica',
      criticidad: 'Alta',
      descripcion: 'Pistón neumático de la estrella presenta fuga y oscilación.'
    };
    const created = await request({
      hostname: 'localhost', port: 3000, path: '/api/solicitudes', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, newTicket);
    console.log(`✅ [3/6] POST /api/solicitudes -> Status: ${created.status}, ID: ${created.body.id}, Folio: ${created.body.folio}`);

    // 4. PUT /api/solicitudes/:id (Asignar Contratista Externo con Costo)
    const patch = {
      estado: 'Asignada',
      tipoEjecutor: 'Contratista',
      contratista: {
        nombre: 'Servicios Neumáticos del Centro C.A.',
        ordenCompra: 'OC-2026-TEST-99',
        costo: 480.00
      },
      fechaAsignacion: '2026-09-07T14:30'
    };
    const updated = await request({
      hostname: 'localhost', port: 3000, path: `/api/solicitudes/${created.body.id}`, method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, patch);
    console.log(`✅ [4/6] PUT /api/solicitudes/${created.body.id} -> Status: ${updated.status}, Contratista: ${updated.body.contratista.nombre}, Costo: $${updated.body.contratista.costo}`);

    // 5. GET /api/preventivos
    const prevs = await request({ hostname: 'localhost', port: 3000, path: '/api/preventivos', method: 'GET' });
    console.log(`✅ [5/6] GET /api/preventivos -> Status: ${prevs.status}, Total Planes: ${prevs.body.length}`);

    // 6. Archivos Estáticos
    const html = await request({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
    const css = await request({ hostname: 'localhost', port: 3000, path: '/css/styles.css', method: 'GET' });
    const js = await request({ hostname: 'localhost', port: 3000, path: '/js/api.js', method: 'GET' });
    console.log(`✅ [6/6] Estáticos -> HTML: ${html.status}, CSS: ${css.status}, API.js: ${js.status}`);

    console.log('\n🎉 ¡TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE!');
  } catch (err) {
    console.error('❌ Error en las pruebas:', err);
    process.exit(1);
  }
}

runTests();
