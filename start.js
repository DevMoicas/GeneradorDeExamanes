#!/usr/bin/env node

// Script de inicio para Railway
// Maneja errores y configuración inicial

const fs = require('fs');
const path = require('path');

// Crear directorio temp si no existe
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('✅ Directorio temp creado');
}

// Verificar que el servidor principal existe
const serverPath = path.join(__dirname, 'server.js');
if (!fs.existsSync(serverPath)) {
    console.error('❌ Error: server.js no encontrado');
    process.exit(1);
}

// Iniciar el servidor
console.log('🚀 Iniciando Generador de Exámenes...');
require('./server.js');
