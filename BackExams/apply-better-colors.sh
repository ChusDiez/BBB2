#!/bin/bash

echo "🎨 Aplicando colores mejorados para máxima visibilidad..."

# Ir a BackExams
cd BackExams

# 1. Respaldar archivos actuales
echo "📋 Creando respaldos..."
cp services/aiEnrichment.services.js services/aiEnrichment.services.js.backup
cp utils/htmlToDocx.js utils/htmlToDocx.js.backup

# 2. Actualizar prompt del servicio de IA
echo "🤖 Actualizando servicio de IA..."
cat > temp_ai_prompt.js << 'EOF'
// Script para actualizar el prompt en aiEnrichment.services.js
import fs from 'fs';

const filePath = 'services/aiEnrichment.services.js';
let content = fs.readFileSync(filePath, 'utf8');

// Buscar y reemplazar el prompt
const newPrompt = `ELEMENTOS ESTRUCTURALES (colores OSCUROS y CONTRASTADOS):
- Leyes completas (Ley 8/2011, LO 4/2015, RD 704/2011): <span style="background-color: #FFD700; color: #000000; padding: 2px 6px; border-radius: 3px; font-weight: 700; border: 1px solid #DAA520;">TEXTO</span>
- Artículos específicos (art. 36.23, artículo 4.3): <span style="background-color: #87CEEB; color: #000080; padding: 2px 6px; border-radius: 3px; font-weight: 700; border: 1px solid #4682B4;">TEXTO</span>
- Conceptos técnicos clave: <span style="background-color: #98FB98; color: #006400; padding: 2px 6px; border-radius: 3px; font-weight: 600; border: 1px solid #32CD32;">TEXTO</span>`;

// Reemplazar la sección antigua
content = content.replace(
  /ELEMENTOS ESTRUCTURALES.*?(?=ELEMENTOS SEMÁNTICOS|3\.|EJEMPLOS)/s,
  newPrompt + '\n\n'
);

fs.writeFileSync(filePath, content);
console.log('✅ Prompt del servicio de IA actualizado');
EOF

node temp_ai_prompt.js
rm temp_ai_prompt.js

# 3. Actualizar función de colores en htmlToDocx.js
echo "🔧 Actualizando convertidor HTML..."
cat > temp_color_fix.js << 'EOF'
// Script para actualizar colores en htmlToDocx.js
import fs from 'fs';

const filePath = 'utils/htmlToDocx.js';
let content = fs.readFileSync(filePath, 'utf8');

// Nuevos mapas de colores mejorados
const newColorMap = `const colorMap = {
    // 🎯 COLORES OPTIMIZADOS PARA MÁXIMA VISIBILIDAD EN WORD
    '#FFD700': 'DAA520', // Oro → Oro oscuro
    '#FFFF00': 'FFD700', // Amarillo puro → Oro
    '#FFF3CD': 'FFD700', // Amarillo muy claro → Oro
    '#87CEEB': '4682B4', // Azul cielo → Azul acero
    '#E8F4FD': '1E90FF', // Azul muy claro → Azul dodger
    '#98FB98': '228B22', // Verde claro → Verde bosque
    '#FFE4E1': 'CD5C5C', // Rosa muy claro → Rojo indio
    '#FFA500': 'FF8C00', // Naranja → Naranja oscuro
    '#FF6347': 'B22222', // Rojo tomate → Rojo ladrillo
    'gold': 'DAA520',
    'yellow': 'FFD700',
    'lightblue': '4682B4',
    'lightgreen': '228B22',
    'orange': 'FF8C00',
    'red': '8B0000',
    'blue': '000080',
    'green': '006400'
  };`;

// Reemplazar el colorMap existente
content = content.replace(
  /const colorMap = \{[^}]+\};/s,
  newColorMap
);

fs.writeFileSync(filePath, content);
console.log('✅ Colores en htmlToDocx.js actualizados');
EOF

node temp_color_fix.js
rm temp_color_fix.js

# 4. Ir al frontend y actualizar CSS
echo "🎨 Actualizando CSS del frontend..."
cd ../FrontExams

# Añadir estilos mejorados al feedback.scss
cat >> src/styles/feedback.scss << 'EOF'

/* 🎯 ESTILOS MEJORADOS PARA MÁXIMA VISIBILIDAD */
.feedback-preview, .feedback-container {
  span[style*="background-color: #FFD700"],
  span[style*="background-color: #FFFF00"] {
    background-color: #FFD700 !important;
    color: #000000 !important;
    padding: 2px 6px !important;
    border-radius: 3px !important;
    font-weight: 700 !important;
    border: 1px solid #DAA520 !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
  }
  
  span[style*="background-color: #87CEEB"] {
    background-color: #87CEEB !important;
    color: #000080 !important;
    padding: 2px 6px !important;
    border-radius: 3px !important;
    font-weight: 700 !important;
    border: 1px solid #4682B4 !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
  }
  
  span[style*="background-color: #98FB98"] {
    background-color: #98FB98 !important;
    color: #006400 !important;
    padding: 2px 6px !important;
    border-radius: 3px !important;
    font-weight: 600 !important;
    border: 1px solid #32CD32 !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
  }
}
EOF

echo "✅ CSS del frontend actualizado"

# 5. Volver al backend y regenerar feedbacks
cd ../BackExams

echo "🔄 Regenerando feedbacks con colores mejorados..."
npm run enrich:force-test

echo ""
echo "🎉 ¡COLORES MEJORADOS APLICADOS!"
echo ""
echo "📋 Resumen de cambios:"
echo "   ✅ Servicio de IA actualizado con colores contrastados"
echo "   ✅ Convertidor HTML actualizado con colores oscuros" 
echo "   ✅ CSS del frontend actualizado con estilos mejorados"
echo "   ✅ 5 feedbacks regenerados para prueba"
echo ""
echo "🚀 Para aplicar a TODOS los feedbacks:"
echo "   npm run enrich:force"
echo ""
echo "🎯 Para probar:"
echo "   npm start"
echo ""