# CMMS Mantenimiento Industrial (Versión 2.0 Cloud & Multiusuario)

Sistema integral de **Gestión de Mantenimiento Asistido por Computadora (CMMS / GMAO)** diseñado específicamente para plantas de producción industrial, con soporte multiusuario simultáneo en red local o en la nube, separación estricta de perfiles, control de costos de terceros/contratistas, módulo de mantenimiento preventivo y analítica avanzada de confiabilidad (**MTTR, MTBF, paradas, eficiencia y costos**).

---

## 🚀 Cómo Iniciar la Aplicación

### Opción 1: En tu Computador o Red Local (Recomendada)
1. Haz doble clic en el archivo **`iniciar_servidor.bat`** (o **`iniciar_app.bat`**).
2. Se iniciará el servidor centralizado en Node.js y se abrirá automáticamente tu navegador en:
   - **Local:** `http://localhost:3000/`
   - **Red Local (LAN/WiFi):** `http://[TU_IP_LOCAL]:3000/` (ejemplo: `http://192.168.1.50:3000/`)
3. Cualquier otra computadora, tablet o teléfono conectado a la misma red WiFi o cableada de la planta puede acceder directamente usando esa dirección IP sin instalar nada.

---

## 🏭 Entorno Real (En Blanco) vs 🧪 Entorno de Prueba (Demostración)

El sistema cuenta con un conmutador de bases de datos independientes que puedes cambiar con un solo clic en la barra superior:

1. **🏭 Entorno Real (Mi Planta / En Cero):**
   - Base de datos independiente (`data/database_real.json`) que inicia **completamente en blanco (0 áreas, 0 equipos, 0 solicitudes)**.
   - Diseñado para que configures las áreas de tu propia empresa, des de alta tu maquinaria real, tus técnicos y comiences a operar en producción.
   - En el panel de Administrador > Respaldo y Datos, tienes la opción de **"Copiar Catálogo a Entorno Real"** (si deseas usar como plantilla las áreas/equipos de prueba) o **"Vaciar Entorno Real a Cero"**.

2. **🧪 Entorno de Prueba (Demostración):**
   - Base de datos independiente (`data/database_demo.json`) preconfigurada con líneas de envasado, reactores químicos, calderas, solicitudes de avería ficticias, horas de parada y órdenes de preventivo.
   - Ideal para capacitar a tu personal, practicar o probar cómo se ven los gráficos y reportes sin tocar ni alterar tus datos reales de planta.


---

## ☁️ Cómo Desplegar en la Nube (Acceso Remoto Global)

La aplicación incluye soporte nativo y archivos de configuración para su despliegue en la nube en plataformas gratuitas o de bajo costo:

### Despliegue en Render.com (Gratuito con 1-Click)
1. Sube esta carpeta a un repositorio de GitHub (o GitLab).
2. Inicia sesión en [Render.com](https://render.com/) y crea un **Web Service**.
3. Selecciona tu repositorio. Render detectará automáticamente `package.json` o `render.yaml`.
4. Configuración:
   - **Build Command:** *(dejar vacío)*
   - **Start Command:** `node server.js`
   - **Port:** `3000` (o `$PORT`)
5. ¡Listo! Render te dará una URL pública tipo `https://tu-planta-cmms.onrender.com` accesible desde cualquier parte del mundo.

### Despliegue con Docker
La carpeta incluye un `Dockerfile` optimizado:
```bash
docker build -t cmms-industrial .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name cmms cmms-industrial
```

---

## 👥 Separación Estricta de Perfiles y Módulos

El sistema cuenta con un control de acceso por roles en la esquina superior derecha:

### 1. Perfil: Producción y Departamentos Externos (Solicitantes)
- **Acceso:** Libre y directo (sin clave).
- **Alcance:** Los operadores de producción o servicios generales **solo ven el módulo de solicitudes**. Todas las demás pestañas confidenciales (órdenes de trabajo, técnicos, costos, preventivo, métricas y administración) están ocultas.
- **Funcionalidades:**
  - Botón **"Generar Solicitud de Falla"**: Formulario rápido con solicitante, turno, área, selector reactivo de equipo, tipo de falla (mecánica, eléctrica, neumática, etc.), criticidad y descripción.
  - Tabla de seguimiento con semáforos de estado en vivo: `🕒 Pendiente`, `👷 Asignada`, `⚙️ En Intervención`, `✅ Culminada`.

### 2. Perfil: Mantenimiento (Técnicos, Planificadores y Supervisores)
- **Acceso:** Protegido con PIN de seguridad (por defecto: `1234`).
- **Alcance:** Control total de la bandeja de órdenes de trabajo (OT), mantenimiento preventivo y métricas.
- **Funcionalidades:**
  - **Asignación:** Permite elegir entre **Personal Interno** (técnicos mecánicos, electricistas, etc.) o **Tercero / Contratista Externo**.
  - **Costos de Terceros:** Si el trabajo es tercerizado, se registra la empresa contratista, número de orden/factura y el **costo del trabajo ($)**.
  - **Iniciar Intervención:** Registra la fecha y hora de inicio de parada de la máquina.
  - **Culminar Intervención:** Registra fecha y hora de cierre, calcula en tiempo real el tiempo de parada exacto (Downtime), causa raíz, solución ejecutada y repuestos utilizados.
  - **Ficha Técnica Imprimible:** Formato tipo Orden de Trabajo oficial para firma de entrega a producción.

### 3. Módulo de Mantenimiento Preventivo
- Calendario y semáforo de planes programados: `🟢 Al Día`, `🟡 Próximo a Vencer`, `🔴 Vencido`.
- Checklist detallado de inspecciones periódicas (semanal, quincenal, mensual, trimestral, anual).
- Botón de 1-clic **"🚀 Generar OT"**: Envía la tarea preventiva directamente a la bandeja de Mantenimiento con su checklist y reprograma la próxima fecha automáticamente.

### 4. Perfil: Administrador General
- **Acceso:** Protegido con PIN maestro (por defecto: `9999`).
- **CRUD Completo (Crear, Editar y Eliminar):**
  - **Áreas:** Departamentos de la planta (ej. Envasado, Mezclado, Empaque, Servicios).
  - **Equipos:** Maquinarias y activos con código, criticidad y estado.
  - **Empleados:** Nómina de personal técnico, supervisores y operadores.
  - **Configuración:** Modificación de pines de acceso, nombre de planta y moneda (`$`, `€`, etc.).
  - **Respaldos:** Descarga de backup completo en JSON y restauración.

---

## 📊 Dashboard de Métricas y Analítica Avanzada (KPIs)

El panel de métricas calcula de forma automática:
1. **Total de Horas de Parada:** Conteo en formato horas:minutos (`2h 30m`) y decimal (`2.50 hrs`).
2. **MTTR (Mean Time To Repair):** Horas promedio requeridas para reparar una avería culminada.
3. **MTBF (Mean Time Between Failures):** Confiabilidad operativa y tiempo medio entre fallas de los equipos.
4. **Costo Total de Contratistas Externos:** Sumatoria económica del gasto en servicios tercerizados, desglose por empresa y costo promedio por intervención.
5. **Ejecutadas vs Pendientes:** Relación y porcentaje de efectividad en la atención de fallas.
6. **Cumplimiento Preventivo (%):** Porcentaje de planes de mantenimiento preventivo ejecutados a tiempo vs retrasados.
7. **Ranking de Paradas por Equipo:** Identificación de equipos con mayor downtime para priorizar mejoras.
8. **Eficiencia por Trabajador:** Tabla comparativa por técnico con cantidad de OTs atendidas, cerradas, tiempo promedio y efectividad.
9. **Exportación a Excel / CSV:** Descarga con 1 clic de la matriz completa con todas las columnas de tiempos, diagnósticos y costos.

---

## 📁 Estructura del Código

```
sistema-mantenimiento/
├── index.html              # Interfaz HTML5 con navegación por roles y modales
├── css/
│   └── styles.css          # Diseño responsivo industrial, badges y estilos visuales
├── js/
│   ├── api.js              # Cliente REST y sincronización en tiempo real SSE
│   ├── store.js            # Almacén de datos centralizado y lógica de negocio
│   ├── analytics.js        # Motor matemático de KPIs (MTTR, MTBF, costos, eficiencia)
│   └── app.js              # Controlador principal de eventos y vistas
├── server.js               # Servidor HTTP nativo en Node.js con API REST y SSE
├── package.json            # Metadatos del proyecto y scripts Node.js
├── Dockerfile              # Contenedor optimizado para despliegue en la nube
├── render.yaml             # Configuración de 1-click para Render Cloud
├── iniciar_servidor.bat    # Lanzador automático del servidor y navegador
├── iniciar_app.bat         # Acceso directo para usuarios
├── test_api.js             # Suite de pruebas automatizadas de la API
└── data/
    └── database.json       # Base de datos centralizada con persistencia atómica
```
