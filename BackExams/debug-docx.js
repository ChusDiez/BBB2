// debug-docx.js - Script para diagnosticar el problema con docx
import fs from 'fs';
import path from 'path';

console.log('🔍 Diagnóstico del módulo docx\n');

// 1. Verificar si existe la carpeta node_modules/docx
const docxPath = './node_modules/docx';
console.log('📁 Verificando carpeta docx...');
if (fs.existsSync(docxPath)) {
    console.log('✅ Carpeta docx existe');
    
    // 2. Listar contenido de la carpeta docx
    console.log('\n📂 Contenido de node_modules/docx:');
    const docxContents = fs.readdirSync(docxPath);
    docxContents.forEach(item => {
        const itemPath = path.join(docxPath, item);
        const isDir = fs.statSync(itemPath).isDirectory();
        console.log(`   ${isDir ? '📁' : '📄'} ${item}`);
    });
    
    // 3. Verificar package.json de docx
    const docxPackageJson = path.join(docxPath, 'package.json');
    if (fs.existsSync(docxPackageJson)) {
        console.log('\n📋 package.json de docx:');
        const packageData = JSON.parse(fs.readFileSync(docxPackageJson, 'utf8'));
        console.log(`   Versión: ${packageData.version}`);
        console.log(`   Main: ${packageData.main || 'no definido'}`);
        console.log(`   Module: ${packageData.module || 'no definido'}`);
        console.log(`   Exports: ${JSON.stringify(packageData.exports, null, 2) || 'no definido'}`);
        console.log(`   Type: ${packageData.type || 'no definido'}`);
    }
    
    // 4. Verificar si existe build/
    const buildPath = path.join(docxPath, 'build');
    if (fs.existsSync(buildPath)) {
        console.log('\n📂 Contenido de node_modules/docx/build:');
        const buildContents = fs.readdirSync(buildPath);
        buildContents.forEach(item => {
            console.log(`   📄 ${item}`);
        });
        
        // 5. Verificar archivos específicos
        const indexMjs = path.join(buildPath, 'index.mjs');
        const indexJs = path.join(buildPath, 'index.js');
        const indexDts = path.join(buildPath, 'index.d.ts');
        
        console.log('\n🎯 Archivos de entrada:');
        console.log(`   index.mjs: ${fs.existsSync(indexMjs) ? '✅ Existe' : '❌ No existe'}`);
        console.log(`   index.js: ${fs.existsSync(indexJs) ? '✅ Existe' : '❌ No existe'}`);
        console.log(`   index.d.ts: ${fs.existsSync(indexDts) ? '✅ Existe' : '❌ No existe'}`);
    } else {
        console.log('\n❌ No existe carpeta build/');
    }
    
    // 6. Verificar otros posibles archivos de entrada
    const possibleEntries = ['index.js', 'index.mjs', 'lib/index.js', 'dist/index.js'];
    console.log('\n🔍 Buscando posibles archivos de entrada:');
    possibleEntries.forEach(entry => {
        const entryPath = path.join(docxPath, entry);
        console.log(`   ${entry}: ${fs.existsSync(entryPath) ? '✅ Existe' : '❌ No existe'}`);
    });
    
} else {
    console.log('❌ Carpeta docx no existe');
    console.log('💡 Ejecuta: npm install docx');
}

// 7. Verificar versión de Node.js
console.log('\n🟢 Información del entorno:');
console.log(`   Node.js: ${process.version}`);
console.log(`   Plataforma: ${process.platform}`);
console.log(`   Arquitectura: ${process.arch}`);

// 8. Intentar diferentes métodos de import
console.log('\n🧪 Probando diferentes métodos de import...');

// Método 1: Import directo
try {
    console.log('   Método 1: import docx...');
    const docx = await import('docx');
    console.log('   ✅ import docx funciona');
    console.log(`   ✅ Packer disponible: ${typeof docx.Packer === 'function'}`);
} catch (error) {
    console.log(`   ❌ import docx falló: ${error.message}`);
}

// Método 2: Import destructurado
try {
    console.log('   Método 2: import { Packer } from docx...');
    const { Packer } = await import('docx');
    console.log('   ✅ import { Packer } funciona');
    console.log(`   ✅ Packer es función: ${typeof Packer === 'function'}`);
} catch (error) {
    console.log(`   ❌ import { Packer } falló: ${error.message}`);
}

// Método 3: Require (si es posible)
try {
    console.log('   Método 3: require(docx)...');
    const docx = await import('docx');
    console.log('   ✅ require docx funciona (simulado con import)');
} catch (error) {
    console.log(`   ❌ require docx falló: ${error.message}`);
}

console.log('\n📋 Diagnóstico completado');
console.log('💡 Si ves errores arriba, ese es el problema específico que hay que solucionar');