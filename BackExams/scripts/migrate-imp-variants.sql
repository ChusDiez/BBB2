-- =====================================================
-- MIGRACIÓN: Soporte para múltiples variantes IMP
-- =====================================================
-- Fecha: 2025-10-26
-- Autor: Sistema BBB2
-- Descripción: Permite tener IMP1 (40 preguntas) e IMP2 (20 preguntas) por tema
-- =====================================================

-- PASO 0: Verificar constraints existentes
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'imp_availability_control'::regclass;

-- =====================================================
-- PASO 1: Eliminar/Actualizar constraints antiguos
-- =====================================================

-- 1.1 Eliminar constraint de validación del theme_name antiguo
ALTER TABLE imp_availability_control 
DROP CONSTRAINT IF EXISTS valid_theme_name;

-- 1.2 Eliminar constraints UNIQUE antiguos
ALTER TABLE imp_availability_control 
DROP CONSTRAINT IF EXISTS imp_availability_control_theme_number_key;

ALTER TABLE imp_availability_control 
DROP CONSTRAINT IF EXISTS imp_availability_control_theme_name_key;

-- =====================================================
-- PASO 2: Añadir columna imp_variant
-- =====================================================

-- 2.1 Añadir columna con valor por defecto
ALTER TABLE imp_availability_control 
ADD COLUMN IF NOT EXISTS imp_variant INTEGER DEFAULT 1;

-- 2.2 Actualizar todos los registros existentes a variante 1
UPDATE imp_availability_control 
SET imp_variant = 1
WHERE imp_variant IS NULL OR imp_variant = 0;

-- 2.3 Hacer la columna NOT NULL
ALTER TABLE imp_availability_control 
ALTER COLUMN imp_variant SET NOT NULL;

-- =====================================================
-- PASO 3: Actualizar nombres de IMPs existentes
-- =====================================================

-- 3.1 Actualizar theme_name de "X_IMP" a "X_IMP1" para registros existentes
UPDATE imp_availability_control 
SET theme_name = theme_name || '1'
WHERE theme_name ~ '^\d+_IMP$' 
  AND theme_name NOT LIKE '%IMP1' 
  AND theme_name NOT LIKE '%IMP2';

-- =====================================================
-- PASO 4: Crear nuevos constraints
-- =====================================================

-- 4.1 Añadir constraint CHECK para imp_variant (1 o 2)
ALTER TABLE imp_availability_control 
ADD CONSTRAINT imp_variant_check CHECK (imp_variant IN (1, 2));

-- 4.2 Añadir constraint CHECK para theme_name con nuevo formato
ALTER TABLE imp_availability_control 
ADD CONSTRAINT valid_theme_name_new CHECK (theme_name ~ '^\d+_IMP[12]$');

-- 4.3 Crear UNIQUE compuesto: un tema puede tener IMP1 e IMP2, pero no duplicados
ALTER TABLE imp_availability_control 
ADD CONSTRAINT imp_availability_control_theme_variant_unique 
UNIQUE (theme_number, imp_variant);

-- 4.4 Añadir comentario a la columna
COMMENT ON COLUMN imp_availability_control.imp_variant IS 'Variante del IMP: 1 (40 preguntas) o 2 (20 preguntas)';

-- =====================================================
-- PASO 5: VERIFICACIÓN
-- =====================================================

-- 5.1 Ver todos los IMPs actualizados
SELECT 
  theme_number, 
  theme_name, 
  imp_variant, 
  total_questions,
  status,
  created_at
FROM imp_availability_control 
ORDER BY theme_number, imp_variant;

-- 5.2 Verificar que no hay duplicados
SELECT 
  theme_number, 
  imp_variant, 
  COUNT(*) as count
FROM imp_availability_control
GROUP BY theme_number, imp_variant
HAVING COUNT(*) > 1;
-- Debe devolver 0 filas

-- 5.3 Verificar constraints finales
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'imp_availability_control'::regclass
ORDER BY conname;

-- 5.4 Verificar estructura de columnas
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'imp_availability_control'
ORDER BY ordinal_position;

-- =====================================================
-- RESULTADOS ESPERADOS
-- =====================================================
-- Después de la migración deberías ver:
-- - Columna imp_variant (integer, not null, default 1)
-- - Todos los IMPs existentes como "X_IMP1"
-- - Constraints: imp_variant_check, valid_theme_name_new, imp_availability_control_theme_variant_unique
-- - Sin duplicados de (theme_number, imp_variant)

-- =====================================================
-- ROLLBACK (por si necesitas revertir)
-- =====================================================
/*
-- ADVERTENCIA: Esto revertirá TODOS los cambios

-- 1. Eliminar constraints nuevos
ALTER TABLE imp_availability_control 
DROP CONSTRAINT IF EXISTS imp_availability_control_theme_variant_unique;

ALTER TABLE imp_availability_control 
DROP CONSTRAINT IF EXISTS imp_variant_check;

ALTER TABLE imp_availability_control 
DROP CONSTRAINT IF EXISTS valid_theme_name_new;

-- 2. Restaurar theme_name a formato antiguo
UPDATE imp_availability_control 
SET theme_name = REGEXP_REPLACE(theme_name, '^(\d+)_IMP[12]$', '\1_IMP')
WHERE theme_name ~ '^\d+_IMP[12]$';

-- 3. Restaurar constraint CHECK antiguo
ALTER TABLE imp_availability_control 
ADD CONSTRAINT valid_theme_name CHECK (theme_name ~ '^\d+_IMP$');

-- 4. Restaurar constraints UNIQUE antiguos
ALTER TABLE imp_availability_control 
ADD CONSTRAINT imp_availability_control_theme_number_key UNIQUE (theme_number);

ALTER TABLE imp_availability_control 
ADD CONSTRAINT imp_availability_control_theme_name_key UNIQUE (theme_name);

-- 5. Eliminar columna imp_variant
ALTER TABLE imp_availability_control 
DROP COLUMN IF EXISTS imp_variant;

-- 6. Verificar que todo volvió a la normalidad
SELECT * FROM imp_availability_control ORDER BY theme_number;
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Esta migración es IRREVERSIBLE sin el rollback
-- 2. Hacer backup de la tabla ANTES de ejecutar:
--    CREATE TABLE imp_availability_control_backup AS 
--    SELECT * FROM imp_availability_control;
-- 
-- 3. Después de la migración, reiniciar el backend:
--    cd BackExams && npm run dev
--
-- 4. La aplicación frontend admin ya está lista para usar el nuevo sistema
--
-- 5. La aplicación de alumnos necesitará actualizarse para mostrar IMP1 e IMP2
--    (Ver documentación en IMP_VARIANTS_DESIGN.md)

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
