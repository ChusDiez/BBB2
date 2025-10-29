# 📚 SISTEMA DE VARIANTES IMP (IMP1 e IMP2)

## 🎯 Objetivo
Permitir subir **dos exámenes imprescindibles por tema**:
- **IMP1**: 40 preguntas (examen completo actual)
- **IMP2**: 20 preguntas (examen reducido nuevo)

---

## 🗄️ CAMBIOS EN BASE DE DATOS

### 1. Nueva Estructura de `imp_availability_control`

```sql
-- Añadir nueva columna imp_variant
ALTER TABLE imp_availability_control 
ADD COLUMN imp_variant INTEGER DEFAULT 1 CHECK (imp_variant IN (1, 2));

-- Actualizar comentario
COMMENT ON COLUMN imp_availability_control.imp_variant IS 'Variante del IMP: 1 (40 preguntas) o 2 (20 preguntas)';

-- Eliminar constraint UNIQUE antigua de theme_number
ALTER TABLE imp_availability_control 
DROP CONSTRAINT IF EXISTS imp_availability_control_theme_number_key;

-- Eliminar constraint UNIQUE antigua de theme_name
ALTER TABLE imp_availability_control 
DROP CONSTRAINT IF EXISTS imp_availability_control_theme_name_key;

-- Crear UNIQUE compuesto: un tema puede tener IMP1 e IMP2, pero no dos IMP1
ALTER TABLE imp_availability_control 
ADD CONSTRAINT imp_availability_control_theme_variant_unique 
UNIQUE (theme_number, imp_variant);
```

### 2. Nuevo Formato de Nombres

#### **Anterior:**
- `theme_name`: "1_IMP", "2_IMP", "3_IMP"...

#### **Nuevo:**
- `theme_name`: "1_IMP1", "1_IMP2", "2_IMP1", "2_IMP2"...

**Patrón regex:** `/^\d+_IMP[12]$/`

---

## 💻 CAMBIOS EN BACKEND

### 1. Modelo: `BackExams/models/impAvailability.model.js`

```javascript
imp_variant: {
  type: Sequelize.INTEGER,
  allowNull: false,
  defaultValue: 1,
  validate: {
    isIn: [[1, 2]],
  },
  comment: 'Variante del IMP: 1 (40 preguntas) o 2 (20 preguntas)',
},
theme_name: {
  type: Sequelize.STRING(10),
  allowNull: false,
  comment: 'Formato X_IMP1 o X_IMP2',
  validate: { is: /^\d+_IMP[12]$/ },
},
```

**Actualizar indexes:**
```javascript
indexes: [
  {
    unique: true,
    fields: ['theme_number', 'imp_variant'],
    name: 'imp_theme_variant_unique',
  },
],
```

### 2. Servicio: `BackExams/services/impUpload.services.js`

#### Actualizar `validateImpMetadata()`:

```javascript
validateImpMetadata({ themeNumber, themeName, impVariant = 1 }) {
  const errors = [];
  
  if (!themeNumber || themeNumber < 1 || themeNumber > 45) {
    errors.push('Número de tema inválido (1-45)');
  }
  
  if (![1, 2].includes(impVariant)) {
    errors.push('Variante IMP inválida (debe ser 1 o 2)');
  }
  
  // Validar formato: "X_IMP1" o "X_IMP2"
  if (!/^\d+_IMP[12]$/.test(themeName || '')) {
    errors.push('Formato de nombre incorrecto. Debe ser "X_IMP1" o "X_IMP2"');
  } else {
    const matches = String(themeName).match(/^(\d+)_IMP([12])$/);
    const numberFromName = parseInt(matches[1]);
    const variantFromName = parseInt(matches[2]);
    
    if (numberFromName !== themeNumber) {
      errors.push('El número del tema no coincide con el nombre');
    }
    
    if (variantFromName !== impVariant) {
      errors.push('La variante del tema no coincide con el nombre');
    }
  }
  
  return errors;
}
```

#### Actualizar `uploadImpExam()`:

```javascript
async uploadImpExam(filePath, impOptions) {
  const {
    themeNumber,
    themeName,
    impVariant = 1,  // 🆕 NUEVO: Por defecto variante 1
    windowStartDate,
    autoRelease = true,
    immediatelyAvailable = true,
  } = impOptions || {};

  // Validación de metadatos IMP
  const metaErrors = this.validateImpMetadata({ themeNumber, themeName, impVariant });
  if (metaErrors.length > 0) {
    throw new Error(metaErrors.join(' | '));
  }

  // Procesar CSV
  const csvData = await this.transformData(filePath);
  if (!csvData || csvData.length === 0) {
    throw new Error('El archivo CSV está vacío o no tiene el formato correcto');
  }
  
  // 🆕 VALIDACIÓN FLEXIBLE: 40 para IMP1, 20 para IMP2
  const expectedQuestions = impVariant === 1 ? 40 : 20;
  if (csvData.length !== expectedQuestions) {
    throw new Error(
      `IMP${impVariant} debe tener exactamente ${expectedQuestions} preguntas (actual: ${csvData.length})`
    );
  }

  // ... resto del código igual ...

  // Crear control de disponibilidad IMP
  const releaseDate = autoRelease && windowStartDate ? this.addDays(windowStartDate, 7) : null;
  await ImpAvailability.create({
    theme_number: themeNumber,
    theme_name: themeName,
    historic_id: historicIdExam,
    imp_variant: impVariant,  // 🆕 NUEVO
    status: 'active',
    window_start_date: windowStartDate ? new Date(windowStartDate) : null,
    global_release_date: releaseDate ? new Date(releaseDate) : null,
    immediately_available: !!immediatelyAvailable,
    auto_release: !!autoRelease,
    total_questions: expectedQuestions,  // 🆕 DINÁMICO: 40 o 20
  });

  return {
    success: true,
    historic_id: historicIdExam,
    theme_name: themeName,
    imp_variant: impVariant,  // 🆕 NUEVO
    total_questions: expectedQuestions,
    message: `IMP "${themeName}" subido correctamente con ${expectedQuestions} preguntas`,
  };
}
```

### 3. Ruta: `BackExams/routes/unifiedUpload.route.js`

```javascript
// En el endpoint POST '/imp-exam'
const impOptions = {
  themeNumber: fields.themeNumber?.[0] ? parseInt(fields.themeNumber[0]) : null,
  themeName: fields.themeName?.[0] || null,
  impVariant: fields.impVariant?.[0] ? parseInt(fields.impVariant[0]) : 1,  // 🆕 NUEVO
  windowStartDate: fields.windowStartDate?.[0] ? new Date(fields.windowStartDate[0]) : null,
  autoRelease: fields.autoRelease?.[0] !== 'false',
  immediatelyAvailable: fields.immediatelyAvailable?.[0] !== 'false',
};
```

---

## 🎨 CAMBIOS EN FRONTEND ADMIN (AdvancedUpload)

### 1. Tipos TypeScript: `FrontExams/src/types/unifiedUpload.ts`

```typescript
export interface IMPWindow {
  themeNumber: number;
  themeName: string;
  impVariant: 1 | 2;  // 🆕 NUEVO
  startDate: string;
  autoRelease: boolean;
  immediatelyAvailable: boolean;
}

export interface UnifiedUploadFormData {
  // ... otros campos ...
  
  // IMP Exam
  impThemeNumber: number;
  impVariant: 1 | 2;  // 🆕 NUEVO
  impStartDate: string;
  impAutoRelease: boolean;
  impImmediatelyAvailable: boolean;
}
```

### 2. Componente: `FrontExams/src/routes/AdvancedUpload.tsx`

```typescript
// En el estado inicial
const [formData, setFormData] = useState<UnifiedUploadFormData>({
  // ...
  impThemeNumber: 1,
  impVariant: 1,  // 🆕 NUEVO: Por defecto IMP1
  impStartDate: '',
  // ...
});

// En renderIMPExamFields()
<div className="col-md-6">
  <label className="form-label">Número de tema</label>
  <input
    type="number"
    className="form-control"
    min="1"
    max="45"
    value={formData.impThemeNumber}
    onChange={(e) => handleInputChange('impThemeNumber', parseInt(e.target.value))}
    required
  />
</div>

{/* 🆕 NUEVO: Selector de variante */}
<div className="col-md-6">
  <label className="form-label">Variante IMP</label>
  <select
    className="form-select"
    value={formData.impVariant}
    onChange={(e) => handleInputChange('impVariant', parseInt(e.target.value) as 1 | 2)}
    required
  >
    <option value={1}>IMP1 - 40 preguntas (completo)</option>
    <option value={2}>IMP2 - 20 preguntas (reducido)</option>
  </select>
  <div className="form-text small">
    {formData.impVariant === 1 
      ? "📋 IMP1: Examen completo de 40 preguntas" 
      : "⚡ IMP2: Examen reducido de 20 preguntas"}
  </div>
</div>

{/* Mostrar nombre generado automáticamente */}
<div className="col-12">
  <div className="alert alert-info">
    <strong>📝 Nombre generado:</strong> {formData.impThemeNumber}_IMP{formData.impVariant}
    <br />
    <small>El archivo CSV debe contener exactamente {formData.impVariant === 1 ? '40' : '20'} preguntas</small>
  </div>
</div>
```

### 3. Hook: `FrontExams/src/hooks/useUnifiedUpload.ts`

```typescript
case 'imp_exam':
  options.impWindow = {
    themeNumber: formData.impThemeNumber,
    themeName: `${formData.impThemeNumber}_IMP${formData.impVariant}`,  // 🆕 ACTUALIZADO
    impVariant: formData.impVariant,  // 🆕 NUEVO
    startDate: formatDateTime(formData.impStartDate, formData.impStartTime),
    autoRelease: formData.impAutoRelease,
    immediatelyAvailable: formData.impImmediatelyAvailable,
  };
  break;
```

### 4. API Client: `FrontExams/src/apis/UnifiedUploadAPI.ts`

```typescript
static async uploadIMPExam(file: File, options: UnifiedUploadOptions): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('csvFile', file);
  
  if (options.impWindow) {
    formData.append('themeNumber', String(options.impWindow.themeNumber));
    formData.append('themeName', options.impWindow.themeName);
    formData.append('impVariant', String(options.impWindow.impVariant));  // 🆕 NUEVO
    formData.append('windowStartDate', options.impWindow.startDate);
    formData.append('autoRelease', String(options.impWindow.autoRelease));
    formData.append('immediatelyAvailable', String(options.impWindow.immediatelyAvailable));
  }
  
  // ... resto del código ...
}
```

---

## 📱 INTEGRACIÓN CON APP DE ALUMNOS

### Consultas SQL que Deberá Usar el Frontend de Alumnos:

#### 1. **Listar IMPs disponibles por tema**
```sql
SELECT 
  theme_number,
  theme_name,
  imp_variant,
  total_questions,
  status,
  immediately_available,
  window_start_date,
  global_release_date
FROM imp_availability_control
WHERE theme_number = $1  -- Ej: 1 para ver IMP1 e IMP2 del tema 1
  AND status = 'active'
ORDER BY imp_variant ASC;
```

#### 2. **Obtener preguntas de un IMP específico**
```sql
SELECT q.*
FROM questions q
INNER JOIN historics h ON q.idQuestion = ANY(h.questions)
INNER JOIN imp_availability_control imp ON imp.historic_id = h."idExam"
WHERE imp.theme_number = $1  -- Número de tema
  AND imp.imp_variant = $2   -- 1 o 2
  AND imp.status = 'active';
```

### UI/UX Sugerida para App de Alumnos:

```
┌─────────────────────────────────────────┐
│  📚 Tema 1: Derecho Constitucional      │
├─────────────────────────────────────────┤
│                                         │
│  🎯 IMP1 - Examen Completo              │
│  ├─ 40 preguntas                        │
│  ├─ Disponible: ✅                       │
│  └─ [Comenzar IMP1]                     │
│                                         │
│  ⚡ IMP2 - Examen Reducido               │
│  ├─ 20 preguntas                        │
│  ├─ Disponible: ✅                       │
│  └─ [Comenzar IMP2]                     │
│                                         │
└─────────────────────────────────────────┘
```

### Lógica de Disponibilidad:

```javascript
// Pseudo-código para el frontend de alumnos

function checkIMPAvailability(impRecord) {
  // 1. Si immediately_available = true → Mostrar disponible
  if (impRecord.immediately_available) {
    return { available: true, reason: 'immediately' };
  }
  
  // 2. Si está en ventana específica
  const now = new Date();
  if (impRecord.window_start_date && now >= new Date(impRecord.window_start_date)) {
    return { available: true, reason: 'specific_window' };
  }
  
  // 3. Si ha sido liberado globalmente
  if (impRecord.released_to_global || 
      (impRecord.global_release_date && now >= new Date(impRecord.global_release_date))) {
    return { available: true, reason: 'global_release' };
  }
  
  return { available: false, reason: 'not_yet' };
}

// Uso:
const imp1 = getIMPByThemeAndVariant(1, 1);  // Tema 1, IMP1
const imp2 = getIMPByThemeAndVariant(1, 2);  // Tema 1, IMP2

const imp1Availability = checkIMPAvailability(imp1);
const imp2Availability = checkIMPAvailability(imp2);
```

---

## 🔄 MIGRACIÓN DE DATOS EXISTENTES

### Script para Actualizar IMPs Actuales a IMP1:

```sql
-- 1. Añadir columna imp_variant si no existe
ALTER TABLE imp_availability_control 
ADD COLUMN IF NOT EXISTS imp_variant INTEGER DEFAULT 1 CHECK (imp_variant IN (1, 2));

-- 2. Actualizar todos los registros existentes a variante 1
UPDATE imp_availability_control 
SET imp_variant = 1
WHERE imp_variant IS NULL;

-- 3. Actualizar theme_name de "X_IMP" a "X_IMP1"
UPDATE imp_availability_control 
SET theme_name = theme_name || '1'
WHERE theme_name ~ '^\d+_IMP$';

-- 4. Actualizar constraints
ALTER TABLE imp_availability_control 
DROP CONSTRAINT IF EXISTS imp_availability_control_theme_number_key;

ALTER TABLE imp_availability_control 
DROP CONSTRAINT IF EXISTS imp_availability_control_theme_name_key;

ALTER TABLE imp_availability_control 
ADD CONSTRAINT imp_availability_control_theme_variant_unique 
UNIQUE (theme_number, imp_variant);

-- 5. Verificación
SELECT theme_number, theme_name, imp_variant, total_questions 
FROM imp_availability_control 
ORDER BY theme_number, imp_variant;
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Base de Datos:
- [ ] Ejecutar migración SQL para añadir `imp_variant`
- [ ] Actualizar constraints UNIQUE
- [ ] Migrar datos existentes a formato IMP1
- [ ] Verificar que no hay conflictos de constraints

### Backend:
- [ ] Actualizar modelo `impAvailability.model.js`
- [ ] Actualizar servicio `impUpload.services.js`
- [ ] Actualizar ruta `unifiedUpload.route.js`
- [ ] Probar upload de IMP1 (40 preguntas)
- [ ] Probar upload de IMP2 (20 preguntas)
- [ ] Verificar validaciones de número de preguntas

### Frontend Admin (AdvancedUpload):
- [ ] Actualizar tipos TypeScript
- [ ] Añadir selector de variante IMP
- [ ] Actualizar lógica de generación de nombres
- [ ] Mostrar número de preguntas esperadas
- [ ] Probar flujo completo de upload

### Documentación:
- [ ] Crear guía para equipo de contenidos
- [ ] Documentar formato de CSV para IMP2
- [ ] Preparar comunicación para frontend de alumnos
- [ ] Documentar queries necesarias para app de alumnos

---

## 📊 EJEMPLOS DE USO

### Ejemplo 1: Subir IMP1 (40 preguntas) del Tema 3
```
- Archivo CSV: tema3_imp1.csv (40 filas)
- Tema: 3
- Variante: IMP1
- Nombre generado: "3_IMP1"
```

### Ejemplo 2: Subir IMP2 (20 preguntas) del Tema 3
```
- Archivo CSV: tema3_imp2.csv (20 filas)
- Tema: 3
- Variante: IMP2
- Nombre generado: "3_IMP2"
```

### Resultado en Base de Datos:
```
theme_number | theme_name | imp_variant | total_questions
-------------+------------+-------------+----------------
     3       |   3_IMP1   |      1      |       40
     3       |   3_IMP2   |      2      |       20
```

---

## 🚨 CONSIDERACIONES IMPORTANTES

1. **No se puede tener dos IMP1 o dos IMP2 del mismo tema**: El constraint UNIQUE `(theme_number, imp_variant)` lo previene.

2. **El orden de subida no importa**: Puedes subir primero IMP2 y luego IMP1, o viceversa.

3. **Total de preguntas es fijo**: 
   - IMP1 = exactamente 40 preguntas
   - IMP2 = exactamente 20 preguntas

4. **Los IMPs son independientes**: Cada uno tiene su propio `historic_id` y control de disponibilidad.

5. **Frontend de alumnos debe actualizarse**: Para mostrar ambas opciones (IMP1 e IMP2) cuando estén disponibles.

---

## 📞 SOPORTE

Para dudas sobre la implementación:
- Revisar código en `BackExams/services/impUpload.services.js`
- Consultar queries en este documento
- Verificar estructura de BD con el script de migración

---

**Última actualización**: 26/10/2025  
**Versión**: 1.0



