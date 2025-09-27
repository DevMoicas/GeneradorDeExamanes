// Generador de Exámenes - Universidad de Colima
// Script de inicialización de la base de datos

class DatabaseInitializer {
    constructor() {
        this.dbManager = null;
        this.isReady = false;
    }

    // Inicializar la base de datos completa
    async initialize() {
        try {
            console.log('Inicializando base de datos...');
            
            // Verificar si SQL.js está disponible
            if (typeof SQL === 'undefined') {
                console.error('SQL.js no está cargado');
                return false;
            }

            // Crear el manager de base de datos
            this.dbManager = new DatabaseManager();
            
            // Inicializar la base de datos
            const success = await this.dbManager.init();
            
            if (success) {
                this.isReady = true;
                console.log('✅ Base de datos inicializada correctamente');
                
                // Mostrar estadísticas iniciales
                await this.showInitialStats();
                
                return true;
            } else {
                console.error('❌ Error al inicializar la base de datos');
                return false;
            }
            
        } catch (error) {
            console.error('Error en la inicialización:', error);
            return false;
        }
    }

    // Mostrar estadísticas iniciales
    async showInitialStats() {
        try {
            const stats = await this.dbManager.getUserStats();
            console.log('📊 Estadísticas de usuarios:');
            stats.forEach(stat => {
                console.log(`  ${stat.tipo_usuario}: ${stat.activos}/${stat.total} activos (${stat.activos_semana} activos esta semana)`);
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
        }
    }

    // Verificar si la base de datos está lista
    isDatabaseReady() {
        return this.isReady && this.dbManager && this.dbManager.isInitialized;
    }

    // Obtener el manager de base de datos
    getDatabaseManager() {
        if (this.isDatabaseReady()) {
            return this.dbManager;
        }
        return null;
    }

    // Reinicializar la base de datos (útil para testing)
    async reinitialize() {
        console.log('Reinicializando base de datos...');
        this.isReady = false;
        this.dbManager = null;
        return await this.initialize();
    }

    // Crear usuario de prueba adicional
    async createTestUser(userData) {
        if (!this.isDatabaseReady()) {
            console.error('Base de datos no inicializada');
            return false;
        }

        try {
            const result = await this.dbManager.registerUser(userData);
            if (result.success) {
                console.log(`✅ Usuario de prueba creado: ${userData.email}`);
            } else {
                console.log(`❌ Error al crear usuario: ${result.message}`);
            }
            return result;
        } catch (error) {
            console.error('Error al crear usuario de prueba:', error);
            return false;
        }
    }

    // Limpiar datos de prueba
    async clearTestData() {
        if (!this.isDatabaseReady()) {
            console.error('Base de datos no inicializada');
            return false;
        }

        try {
            // Eliminar sesiones
            this.dbManager.db.exec('DELETE FROM sesiones');
            
            // Eliminar logs
            this.dbManager.db.exec('DELETE FROM logs_autenticacion');
            
            // Resetear usuarios de prueba
            this.dbManager.db.exec(`
                UPDATE usuarios 
                SET intentos_fallidos = 0, 
                    bloqueado_hasta = NULL,
                    ultimo_acceso = NULL
                WHERE email IN ('profesor@ucol.mx', 'alumno@ucol.mx', 'admin@ucol.mx')
            `);
            
            console.log('✅ Datos de prueba limpiados');
            return true;
        } catch (error) {
            console.error('Error al limpiar datos de prueba:', error);
            return false;
        }
    }

    // Exportar configuración de la base de datos
    exportConfig() {
        if (!this.isDatabaseReady()) {
            return null;
        }

        return {
            version: '1.0.0',
            initialized: this.isReady,
            tables: ['usuarios', 'sesiones', 'logs_autenticacion'],
            features: [
                'autenticacion',
                'sesiones',
                'logs',
                'registro_usuarios',
                'bloqueo_temporal'
            ]
        };
    }
}

// Función global para inicializar la base de datos
window.initializeDatabase = async function() {
    const initializer = new DatabaseInitializer();
    const success = await initializer.initialize();
    
    if (success) {
        // Hacer el initializer globalmente disponible
        window.dbInitializer = initializer;
        
        // Mostrar mensaje de éxito en la interfaz
        if (window.GeneradorExamenes && window.GeneradorExamenes.showMessage) {
            window.GeneradorExamenes.showMessage('Base de datos inicializada correctamente', 'success');
        }
        
        return true;
    } else {
        // Mostrar mensaje de error
        if (window.GeneradorExamenes && window.GeneradorExamenes.showMessage) {
            window.GeneradorExamenes.showMessage('Error al inicializar la base de datos', 'error');
        }
        return false;
    }
};

// Función para verificar el estado de la base de datos
window.isDatabaseReady = function() {
    return window.dbInitializer && window.dbInitializer.isDatabaseReady();
};

// Función para obtener el manager de base de datos
window.getDatabaseManager = function() {
    if (window.dbInitializer) {
        return window.dbInitializer.getDatabaseManager();
    }
    return null;
};

// Auto-inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicación...');
    
    // Cargar SQL.js primero
    if (typeof SQL === 'undefined') {
        console.log('📦 Cargando SQL.js...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
        script.onload = function() {
            console.log('✅ SQL.js cargado');
            // Inicializar la base de datos después de cargar SQL.js
            window.initializeDatabase();
        };
        script.onerror = function() {
            console.error('❌ Error al cargar SQL.js');
            if (window.GeneradorExamenes && window.GeneradorExamenes.showMessage) {
                window.GeneradorExamenes.showMessage('Error al cargar la base de datos', 'error');
            }
        };
        document.head.appendChild(script);
    } else {
        // SQL.js ya está cargado
        window.initializeDatabase();
    }
});
