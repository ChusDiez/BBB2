# 🎯 SISTEMA UNIFICADO DE SUBIDA DE PREGUNTAS

## 📋 Descripción General

El Sistema Unificado de Subida de Preguntas es una ampliación del módulo CSV existente que permite **4 tipos diferentes de subida** con control flexible sobre la disponibilidad de las preguntas.

### 🎨 Tipos de Subida Soportados

1. **✅ SUBIDA DIRECTA** - Comportamiento actual (inmediatamente disponible)
2. **📅 RF CON VENTANA** - RF específicos con fechas de apertura/cierre + liberación automática  
3. **⏰ PREGUNTAS FUTURAS** - Subir ahora, liberar al pool más adelante
4. **🎓 EXAMEN PERSONALIZADO** - Tests específicos independientes del pool global

## 🏗️ Arquitectura del Sistema

### 📊 Modelos de Base de Datos

#### `questions` (actualizado)
```sql
ALTER TABLE questions ADD COLUMN globally_available BOOLEAN DEFAULT TRUE;
```

#### `specific_exams` (nueva tabla)
```sql
CREATE TABLE specific_exams (
  id SERIAL PRIMARY KEY,
  exam_name VARCHAR(200) NOT NULL,
  exam_type VARCHAR(50) NOT NULL,
  historic_id INTEGER NOT NULL REFERENCES historics(idExam),
  
  -- Estados y disponibilidad
  status VARCHAR(50) DEFAULT 'draft',
  immediately_available BOOLEAN DEFAULT FALSE,
  
  -- Ventana de disponibilidad específica
  window_start_date TIMESTAMPTZ,
  window_end_date TIMESTAMPTZ,
  
  -- Liberación al pool global
  global_release_date TIMESTAMPTZ,
  auto_release BOOLEAN DEFAULT FALSE,
  released_to_global BOOLEAN DEFAULT FALSE,
  
  -- Metadatos
  total_questions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 🔧 Servicios Principales

- **`UnifiedUploadService`** - Servicio principal de subida unificada
- **`TemporalManagementService`** - Gestión automática de fechas y liberaciones
- **`RFMigrationService`** - Migración de RF existentes

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias
```bash
cd BackExams
npm install formidable node-cron
```

### 2. Ejecutar Migración de Base de Datos
Asegúrate de que las columnas y tablas estén creadas en Supabase:

```sql
-- Añadir columna globally_available a questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS globally_available BOOLEAN DEFAULT TRUE;

-- Crear tabla specific_exams (si no existe)
-- [SQL de creación de tabla específica_exams aquí]
```

### 3. Migrar RF Existentes (UNA SOLA VEZ)
```bash
npm run migrate:rf
```

### 4. Iniciar Servidor
```bash
npm run start:dev
```

El servicio temporal se iniciará automáticamente con el servidor.

## 📖 Guía de Uso

### 1️⃣ SUBIDA DIRECTA (Comportamiento Actual)

**Endpoint:** `POST /api/v1/unified-upload/direct`

**Uso:**
```javascript
// Frontend
const formData = new FormData();
formData.append('csvFile', file);

fetch('/api/v1/unified-upload/direct', {
  method: 'POST',
  body: formData
});
```

**Resultado:**
- ✅ Preguntas inmediatamente disponibles en pool global
- ✅ Registro en `historics`
- ✅ `globally_available = true`

### 2️⃣ RF CON VENTANA ESPECÍFICA

**Endpoint:** `POST /api/v1/unified-upload/rf-exam`

**Uso:**
```javascript
const formData = new FormData();
formData.append('csvFile', file);
formData.append('examName', 'RF19');
formData.append('startDate', '2024-09-05T00:00:00Z');
formData.append('endDate', '2024-09-12T23:59:59Z');
formData.append('globalReleaseDate', '2024-09-13T00:00:00Z');
formData.append('autoRelease', 'true');

fetch('/api/v1/unified-upload/rf-exam', {
  method: 'POST',
  body: formData
});
```

**Resultado:**
- 📅 Preguntas disponibles solo durante ventana específica
- 🤖 Liberación automática al pool global después del cierre
- 📊 Registro en `specific_exams` con tipo 'rf'
- ✅ `globally_available = false` inicialmente

### 3️⃣ PREGUNTAS FUTURAS

**Endpoint:** `POST /api/v1/unified-upload/future-questions`

**Uso:**
```javascript
const formData = new FormData();
formData.append('csvFile', file);
formData.append('releaseDate', '2024-12-01T00:00:00Z');
formData.append('autoRelease', 'false'); // Liberación manual

fetch('/api/v1/unified-upload/future-questions', {
  method: 'POST',
  body: formData
});
```

**Resultado:**
- ⏰ Preguntas guardadas en BD pero no disponibles
- 🔒 `globally_available = false`
- 📅 Liberación programada (manual o automática)

### 4️⃣ EXAMEN PERSONALIZADO

**Endpoint:** `POST /api/v1/unified-upload/custom-exam`

**Uso:**
```javascript
const formData = new FormData();
formData.append('csvFile', file);
formData.append('examName', 'Constitución Temas 2-3');
formData.append('examType', 'constitutional');
formData.append('availabilityType', 'permanent');
formData.append('immediatelyAvailable', 'false');

fetch('/api/v1/unified-upload/custom-exam', {
  method: 'POST',
  body: formData
});
```

**Resultado:**
- 🎓 Examen específico independiente del pool global
- 📊 Disponible solo como test específico
- 🚫 No se libera automáticamente al pool global

## 🕒 Gestión Temporal Automática

### Funcionalidades del Servicio Temporal

- **⏰ Apertura de Ventanas RF** - Activación automática en `window_start_date`
- **🚪 Cierre de Ventanas RF** - Desactivación automática en `window_end_date`  
- **🌍 Liberación Automática** - Release al pool global en `global_release_date`
- **🧹 Limpieza** - Mantenimiento de registros antiguos

### Endpoints de Gestión

#### Estado del Servicio
```bash
GET /api/v1/unified-upload/temporal/status
```

#### Control Manual
```bash
POST /api/v1/unified-upload/temporal/start
POST /api/v1/unified-upload/temporal/stop
POST /api/v1/unified-upload/temporal/release/:examId
POST /api/v1/unified-upload/temporal/activate/:examId
```

## 🔄 Migración de RF Existentes

### Verificar Estado Actual
```bash
GET /api/v1/unified-upload/migration/status
```

### Ejecutar Migración
```bash
POST /api/v1/unified-upload/migration/execute
```

**O por línea de comandos:**
```bash
npm run migrate:rf
```

### Reglas de Migración
- **RF1-RF17:** `globally_available = TRUE` (ya liberados)
- **RF18:** `globally_available = FALSE` (aún no liberado)
- **Todos:** Crear registros en `specific_exams`

## 🛠️ Utilidades Adicionales

### Diagnóstico de CSV
**Endpoint:** `POST /api/v1/unified-upload/diagnose`

Analiza un archivo CSV y reporta problemas sin subirlo.

### Compatibilidad con Sistema Anterior
**Endpoint:** `POST /api/v1/unified-upload/legacy`

Mantiene compatibilidad con el código frontend existente.

## 📊 Ejemplos de Casos de Uso

### Caso 1: Subir RF19 con Ventana
```javascript
// RF19: Disponible del 5-12 de septiembre, liberación automática el 13
const rfData = {
  examName: 'RF19',
  startDate: '2024-09-05T00:00:00Z',
  endDate: '2024-09-12T23:59:59Z', 
  globalReleaseDate: '2024-09-13T00:00:00Z',
  autoRelease: true
};

await uploadService.uploadRFExam(csvFile, rfData);
```

### Caso 2: Preparar Preguntas para Más Adelante
```javascript
// Subir preguntas ahora, liberar manualmente más tarde
const futureData = {
  releaseDate: '2024-12-01T00:00:00Z',
  autoRelease: false // Liberación manual
};

await uploadService.uploadFutureQuestions(csvFile, futureData);
```

### Caso 3: Crear Test Temático Específico
```javascript
// Test de Constitución que nunca se libera al pool general
const customData = {
  examName: 'Constitución Española - Temas 2 y 3',
  examType: 'constitutional',
  availabilityType: 'permanent',
  immediatelyAvailable: false
};

await uploadService.uploadCustomExam(csvFile, customData);
```

## 🚨 Consideraciones Importantes

### ⚠️ Migración Única
- La migración de RF existentes debe ejecutarse **SOLO UNA VEZ**
- Verificar estado antes de ejecutar: `GET /migration/status`

### 🔒 Disponibilidad Global
- `globally_available = true` → Pregunta disponible en pool general
- `globally_available = false` → Pregunta solo disponible en contextos específicos

### 📅 Gestión de Fechas
- Todas las fechas deben estar en formato ISO 8601 con timezone
- El servicio temporal verifica cambios cada 10 minutos
- Las liberaciones automáticas se procesan cada hora

### 🔄 Compatibilidad
- El sistema mantiene **100% compatibilidad** hacia atrás
- Las rutas existentes siguen funcionando sin cambios
- El comportamiento por defecto es subida directa

## 🆘 Troubleshooting

### Error: "globally_available column doesn't exist"
```sql
ALTER TABLE questions ADD COLUMN globally_available BOOLEAN DEFAULT TRUE;
```

### Error: "specific_exams table doesn't exist"
Ejecutar script de creación de tabla o migración de BD.

### Servicio Temporal No Inicia
Verificar que las dependencias están instaladas:
```bash
npm install node-cron
```

### RF No Se Migran
Verificar que los nombres en `historics` siguen el patrón `RF[número]`

## 🎉 ¡Listo!

El Sistema Unificado está ahora implementado y listo para usar. Puedes:

1. ✅ Continuar usando el sistema actual sin cambios
2. ✅ Crear RF con ventanas específicas y liberación automática  
3. ✅ Preparar preguntas futuras para trabajo previo
4. ✅ Crear exámenes temáticos independientes

¡Disfruta del control flexible sobre tus preguntas! 🚀
