# Módulo de Importación CSV desde Evolcampus

## 📋 Descripción General

El módulo de importación CSV desde Evolcampus es una solución completa para importar preguntas de examen desde archivos CSV generados por la plataforma Evolcampus. El sistema incluye detección automática de respuestas marcadas con "x", preview editable, validación de duplicados y logs detallados de importación.

## 🏗️ Arquitectura del Sistema

### Backend (Node.js + Express + Sequelize)

#### Modelos de Base de Datos

1. **ImportLogs** (`models/importLogs.model.js`)
   - Registra todas las importaciones realizadas
   - Incluye estadísticas, errores y metadatos
   - Estados: pending, completed, failed, partial

2. **Questions** (existente)
   - Estructura principal de preguntas
   - Campos: block, topic, question, optionA, optionB, optionC, correctAnswer, feedback

#### Servicios

**EvolcampusImportService** (`services/evolcampusImport.services.js`)
- `calculateBlock(topic)`: Calcula bloque automáticamente según tema
- `detectCorrectAnswer(row)`: Detecta y limpia respuestas marcadas con "x"
- `validateQuestion(question, rowIndex)`: Valida estructura de preguntas
- `transformCSV(filePath, topic)`: Transforma CSV a formato interno
- `checkDuplicates(questions)`: Busca preguntas duplicadas en BD
- `generatePreview(filePath, topic)`: Genera preview sin guardar
- `confirmImport(questions, fileName, userId)`: Confirma e importa preguntas
- `getImportHistory(limit)`: Obtiene historial de importaciones
- `getImportDetails(logId)`: Obtiene detalles de importación específica

#### Endpoints API

**Rutas** (`routes/upload.route.js`)

```javascript
POST /api/upload/preview-evolcampus
// Genera preview de importación
// Body: FormData con archivo CSV + tema
// Response: { success, questions, stats, errors }

POST /api/upload/confirm-evolcampus
// Confirma e importa preguntas seleccionadas
// Body: { questions, fileName, userId }
// Response: { success, summary, logId }

GET /api/upload/import-history?limit=50
// Obtiene historial de importaciones
// Response: { success, history }

GET /api/upload/import-details/:logId
// Obtiene detalles de importación específica
// Response: { success, details }
```

### Frontend (React + TypeScript + Material-UI)

#### Componentes

1. **EvolcampusImporter** (`components/EvolcampusImporter.jsx`)
   - Componente principal con flujo de 3 pasos
   - Stepper, upload, preview editable, confirmación

2. **QuestionRow** (componente interno)
   - Fila editable de pregunta en la tabla de preview
   - Modo vista y modo edición inline

#### APIs y Hooks

1. **EvolcampusAPI** (`apis/EvolcampusAPI.ts`)
   - Clase para comunicación con backend
   - Métodos: generatePreview, confirmImport, getImportHistory
   - Utilidades: calculateBlock, isValidTopic, formatProcessingTime

2. **useEvolcampusImport** (`hooks/useEvolcampusImport.ts`)
   - Hook personalizado con toda la lógica de estado
   - Manejo de archivos, validaciones, navegación
   - Operaciones de selección y edición

#### Rutas

```javascript
/evolcampus-import - Página principal del importador
```

## 🔧 Instalación y Configuración

### Backend

1. **Dependencias ya instaladas** (verificar en package.json):
   ```bash
   npm install csv-parser sequelize express multiparty
   ```

2. **Migración de Base de Datos**:
   ```sql
   -- La tabla import_logs se creará automáticamente con Sequelize
   -- Verificar que la tabla questions existe
   ```

3. **Variables de Entorno**:
   ```bash
   DATABASE_URL=tu_connection_string_supabase
   ```

### Frontend

1. **Dependencias ya instaladas**:
   ```bash
   npm install @mui/material @mui/icons-material
   ```

2. **Agregar al routing** (ya configurado en router.tsx):
   ```javascript
   {
     path: '/evolcampus-import',
     element: <Layout><EvolcampusImport /></Layout>,
   }
   ```

## 📁 Estructura de Archivos

```
BBDD/
├── BackExams/
│   ├── models/
│   │   └── importLogs.model.js          # ✅ Nuevo modelo de logs
│   ├── services/
│   │   └── evolcampusImport.services.js # ✅ Servicio especializado
│   └── routes/
│       └── upload.route.js              # ✅ Endpoints añadidos
│
└── FrontExams/
    ├── src/
    │   ├── apis/
    │   │   └── EvolcampusAPI.ts          # ✅ API cliente
    │   ├── components/
    │   │   └── EvolcampusImporter.jsx    # ✅ Componente principal
    │   ├── hooks/
    │   │   └── useEvolcampusImport.ts    # ✅ Hook personalizado
    │   ├── routes/
    │   │   └── EvolcampusImport.tsx      # ✅ Página
    │   └── styles/
    │       └── evolcampus-import.scss    # ✅ Estilos
    └── router.tsx                        # ✅ Ruta añadida
```

## 📊 Formato CSV Esperado

### Estructura del archivo CSV de Evolcampus:

```csv
Pregunta;Opción A;Opción B;Opción C
"¿Cuál es la capital de España?";x Madrid;Barcelona;Sevilla
"¿En qué año se descubrió América?";1490;x 1492;1494
"¿Quién escribió Don Quijote?";Lope de Vega;Góngora;x Cervantes
```

### Reglas de formato:

- **Separador**: Punto y coma (`;`)
- **Codificación**: UTF-8 con BOM
- **Respuesta correcta**: Marcada con `x ` al inicio de la opción
- **Headers**: `Pregunta`, `Opción A`, `Opción B`, `Opción C`
- **Texto entre comillas**: Recomendado para preguntas largas

## 🚀 Flujo de Uso

### Paso 1: Subir archivo y especificar tema
1. Arrastrar o seleccionar archivo CSV
2. Especificar tema (1-45)
3. El sistema calcula automáticamente el bloque:
   - Temas 1-26: Bloque 1
   - Temas 27-37: Bloque 2
   - Temas 38-45: Bloque 3

### Paso 2: Preview y edición
1. El sistema procesa el CSV y detecta respuestas marcadas
2. Muestra tabla con todas las preguntas
3. Marca duplicados en amarillo
4. Permite editar cualquier campo inline
5. Seleccionar qué preguntas importar

### Paso 3: Confirmación
1. Resumen de la importación
2. Estadísticas: nuevas vs actualizadas
3. Importación final a base de datos
4. Log guardado para auditoría

## ⚙️ Funcionalidades Principales

### 🔍 Detección Automática de Respuestas
- Busca `x ` al inicio de las opciones
- Limpia automáticamente la "x" del texto
- Convierte a A, B, C según la columna
- Valida que solo hay una respuesta marcada

### 🔄 Gestión de Duplicados
- Busca por texto de pregunta similar (primeros 100 caracteres)
- Marca duplicados visualmente
- Permite actualizar o crear nuevas
- Conserva IDs existentes para actualizaciones

### ✏️ Edición Inline
- Editar texto de pregunta
- Modificar opciones A, B, C
- Cambiar respuesta correcta
- Guardar/cancelar cambios individuales

### 📈 Estadísticas en Tiempo Real
- Total de preguntas procesadas
- Nuevas vs duplicadas
- Preguntas seleccionadas
- Errores encontrados
- Tiempo de procesamiento

### 🗂️ Logs y Auditoría
- Registro completo de cada importación
- Metadatos: archivo, tema, usuario, timestamp
- Estadísticas: total, nuevas, actualizadas, errores
- Historial navegable
- Detalles expandibles

## 🛠️ Validaciones Implementadas

### Archivo CSV
- ✅ Formato .csv válido
- ✅ Codificación UTF-8
- ✅ Estructura de columnas correcta
- ✅ Al menos una fila de datos

### Contenido
- ✅ Tema entre 1-45
- ✅ Bloque calculado automáticamente
- ✅ Pregunta no vacía
- ✅ Tres opciones completas
- ✅ Una respuesta marcada con "x"
- ✅ Respuesta correcta válida (A, B, C)

### Base de Datos
- ✅ Duplicados por texto de pregunta
- ✅ Integridad referencial
- ✅ Validaciones de modelo Sequelize
- ✅ Manejo de errores SQL

## 🚨 Manejo de Errores

### Errores de Formato
```javascript
// Ejemplos de errores detectados:
"Fila 3: Falta la opción A"
"Fila 7: Múltiples respuestas marcadas con 'x'"
"Fila 12: Tema inválido: '50' (debe ser entre 1 y 45)"
```

### Errores de Red
- Timeout en archivos grandes (30s preview, 60s import)
- Retry automático en errores temporales
- Mensajes user-friendly
- Fallback a operaciones offline

### Errores de Base de Datos
- Violaciones de integridad
- Problemas de conexión
- Transacciones rollback automático
- Logs detallados para debugging

## 📊 Monitoreo y Performance

### Métricas Registradas
- Tiempo de procesamiento por archivo
- Número de preguntas por importación
- Ratio de duplicados vs nuevas
- Errores frecuentes por tipo

### Optimizaciones
- Procesamiento en chunks para archivos grandes
- Índices en campos de búsqueda de duplicados
- Validación en frontend antes de envío
- Caching de resultados de preview

## 🔐 Consideraciones de Seguridad

### Validación de Archivos
- Verificación de tipo MIME
- Límite de tamaño de archivo
- Sanitización de contenido
- Validación de encoding

### Autenticación y Autorización
- Logs incluyen userId para auditoría
- Verificación de permisos en endpoints
- Rate limiting en endpoints de upload
- Validación de CSRF tokens

## 🧪 Testing

### Backend Tests
```bash
# Ejecutar tests del servicio
npm test services/evolcampusImport.services.test.js

# Casos de prueba incluidos:
# - Detección correcta de respuestas marcadas
# - Validación de duplicados
# - Manejo de errores de formato
# - Cálculo de bloques por tema
```

### Frontend Tests
```bash
# Ejecutar tests del componente
npm test EvolcampusImporter.test.jsx

# Casos de prueba incluidos:
# - Flujo completo de importación
# - Edición inline de preguntas
# - Validaciones de formulario
# - Manejo de estados de carga
```

## 📝 Ejemplos de Uso

### Importación Básica
```javascript
// 1. Usuario selecciona archivo CSV
// 2. Especifica tema: 15 (será bloque 1)
// 3. Sistema detecta 25 preguntas, 3 duplicadas
// 4. Usuario revisa preview, edita 2 preguntas
// 5. Selecciona 22 preguntas para importar
// 6. Confirma: 19 nuevas + 3 actualizadas
```

### Manejo de Errores
```javascript
// CSV con problemas:
"Pregunta incompleta";"Opción A";"";"Opción C"  // ❌ Falta opción B
"¿Pregunta válida?";"x Opción A";"x Opción B";"Opción C"  // ❌ Múltiples x
"¿Otra pregunta?";"Opción A";"Opción B";"Opción C"  // ❌ Sin x

// Sistema muestra errores específicos por fila
// Permite continuar con preguntas válidas
```

## 🔄 Roadmap Futuro

### Mejoras Planificadas
- [ ] Importación en lotes asíncronos
- [ ] Preview con paginación para archivos grandes
- [ ] Exportación de preguntas a formato Evolcampus
- [ ] Plantillas de mapping personalizables
- [ ] Integración directa con API de Evolcampus
- [ ] Validación semántica con IA
- [ ] Dashboard de analytics de importaciones

### Optimizaciones Técnicas
- [ ] Worker threads para procesamiento pesado
- [ ] Cache Redis para previews
- [ ] Compresión de archivos temporales
- [ ] Streaming processing para CSVs gigantes

## 📞 Soporte y Mantenimiento

### Logs de Debug
```bash
# Backend logs
tail -f logs/evolcampus-import.log

# Frontend console
localStorage.setItem('debug', 'evolcampus:*')
```

### Comandos Útiles
```bash
# Verificar estado de importaciones
GET /api/upload/import-history

# Limpiar archivos temporales
rm -rf /tmp/evolcampus-*

# Verificar integridad de base de datos
SELECT COUNT(*) FROM questions WHERE topic BETWEEN 1 AND 45;
```

---

## ✅ Checklist de Instalación

- [x] ✅ Modelo ImportLogs creado
- [x] ✅ Servicio EvolcampusImportService implementado
- [x] ✅ Endpoints API añadidos a upload.route.js
- [x] ✅ Componente React EvolcampusImporter creado
- [x] ✅ Hook useEvolcampusImport implementado
- [x] ✅ API cliente EvolcampusAPI creado
- [x] ✅ Estilos SCSS añadidos
- [x] ✅ Ruta añadida al router
- [x] ✅ Validaciones completas implementadas
- [x] ✅ Manejo de errores robusto
- [x] ✅ Sin errores de linting

## 🎉 ¡Módulo Listo para Usar!

El módulo está completamente implementado y listo para producción. Solo necesitas:

1. **Navegar a** `/evolcampus-import` en tu aplicación
2. **Subir un CSV** con el formato correcto de Evolcampus
3. **Especificar el tema** (1-45)
4. **Revisar el preview** y editar si es necesario
5. **Confirmar la importación**

¡Y listo! Las preguntas se importarán automáticamente a tu base de datos con logs detallados para auditoría.
