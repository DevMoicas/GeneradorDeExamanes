// Generador de Exámenes - Universidad de Colima
// Módulo de base de datos SQLite

class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    // Inicializar la base de datos
    async init() {
        try {
            // Verificar si SQL.js está disponible
            if (typeof SQL === 'undefined') {
                throw new Error('SQL.js no está cargado. Asegúrate de incluir la librería SQL.js');
            }

            // Crear una nueva base de datos en memoria
            this.db = new SQL.Database();
            
            // Crear las tablas necesarias
            await this.createTables();
            
            // Insertar datos de prueba
            await this.insertTestData();
            
            this.isInitialized = true;
            console.log('Base de datos inicializada correctamente');
            return true;
        } catch (error) {
            console.error('Error al inicializar la base de datos:', error);
            return false;
        }
    }

    // Crear las tablas de la base de datos
    async createTables() {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL,
                tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN ('profesor', 'alumno')),
                activo BOOLEAN DEFAULT 1,
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                ultimo_acceso DATETIME,
                intentos_fallidos INTEGER DEFAULT 0,
                bloqueado_hasta DATETIME
            )
        `;

        const createSesionesTable = `
            CREATE TABLE IF NOT EXISTS sesiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL,
                token_sesion TEXT UNIQUE NOT NULL,
                fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_expiracion DATETIME NOT NULL,
                activa BOOLEAN DEFAULT 1,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
            )
        `;

        const createLogsTable = `
            CREATE TABLE IF NOT EXISTS logs_autenticacion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER,
                email TEXT,
                tipo_evento TEXT NOT NULL,
                fecha_evento DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT,
                exito BOOLEAN,
                mensaje TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
            )
        `;

        const createExamsTable = `
            CREATE TABLE IF NOT EXISTS examenes (
                id TEXT PRIMARY KEY,
                titulo TEXT NOT NULL,
                materia TEXT NOT NULL,
                dificultad TEXT NOT NULL,
                num_preguntas INTEGER NOT NULL,
                profesor_id INTEGER NOT NULL,
                codigo_examen TEXT UNIQUE NOT NULL,
                estado TEXT DEFAULT 'generated',
                contenido_json TEXT NOT NULL,
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (profesor_id) REFERENCES usuarios (id)
            )
        `;

        const createExamSessionsTable = `
            CREATE TABLE IF NOT EXISTS sesiones_examen (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                examen_id TEXT NOT NULL,
                estudiante_nombre TEXT NOT NULL,
                estudiante_id TEXT,
                estado TEXT DEFAULT 'in_progress',
                fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_fin DATETIME,
                respuestas_json TEXT,
                calificacion REAL,
                FOREIGN KEY (examen_id) REFERENCES examenes (id)
            )
        `;

        try {
            this.db.exec(createUsersTable);
            this.db.exec(createSesionesTable);
            this.db.exec(createLogsTable);
            this.db.exec(createExamsTable);
            this.db.exec(createExamSessionsTable);
            console.log('Tablas creadas correctamente');
        } catch (error) {
            console.error('Error al crear tablas:', error);
            throw error;
        }
    }

    // Insertar datos de prueba
    async insertTestData() {
        const insertUsers = `
            INSERT OR IGNORE INTO usuarios (email, password, nombre, apellido, tipo_usuario) VALUES
            ('profesor@ucol.mx', '${this.hashPassword('profesor123')}', 'Juan', 'Pérez', 'profesor'),
            ('alumno@ucol.mx', '${this.hashPassword('alumno123')}', 'María', 'González', 'alumno'),
            ('admin@ucol.mx', '${this.hashPassword('admin123')}', 'Admin', 'Sistema', 'profesor'),
            ('carlos.rodriguez@ucol.mx', '${this.hashPassword('carlos123')}', 'Carlos', 'Rodríguez', 'profesor'),
            ('ana.martinez@ucol.mx', '${this.hashPassword('ana123')}', 'Ana', 'Martínez', 'alumno')
        `;

        try {
            this.db.exec(insertUsers);
            console.log('Datos de prueba insertados correctamente');
        } catch (error) {
            console.error('Error al insertar datos de prueba:', error);
        }
    }

    // Función para hashear contraseñas (simulada)
    hashPassword(password) {
        // En una aplicación real, usarías una librería como bcrypt
        // Por ahora, simulamos un hash simple
        return btoa(password + '_salt_ucol_2024');
    }

    // Verificar contraseña
    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }

    // Autenticar usuario
    async authenticateUser(email, password, tipoUsuario) {
        try {
            const query = `
                SELECT id, email, password, nombre, apellido, tipo_usuario, activo, intentos_fallidos, bloqueado_hasta
                FROM usuarios 
                WHERE email = ? AND tipo_usuario = ? AND activo = 1
            `;
            
            const stmt = this.db.prepare(query);
            const result = stmt.get([email.toLowerCase(), tipoUsuario]);
            
            if (!result) {
                await this.logAuthenticationAttempt(email, 'login_failed', false, 'Usuario no encontrado');
                return { success: false, message: 'Credenciales incorrectas' };
            }

            // Verificar si el usuario está bloqueado
            if (result.bloqueado_hasta && new Date(result.bloqueado_hasta) > new Date()) {
                await this.logAuthenticationAttempt(email, 'login_blocked', false, 'Usuario bloqueado temporalmente');
                return { success: false, message: 'Usuario bloqueado temporalmente' };
            }

            // Verificar contraseña
            if (!this.verifyPassword(password, result.password)) {
                // Incrementar intentos fallidos
                const newAttempts = result.intentos_fallidos + 1;
                const updateAttempts = `
                    UPDATE usuarios 
                    SET intentos_fallidos = ?, 
                        bloqueado_hasta = CASE 
                            WHEN ? >= 5 THEN datetime('now', '+30 minutes')
                            ELSE bloqueado_hasta 
                        END
                    WHERE id = ?
                `;
                
                this.db.exec(updateAttempts, [newAttempts, newAttempts, result.id]);
                
                await this.logAuthenticationAttempt(email, 'login_failed', false, 'Contraseña incorrecta');
                return { success: false, message: 'Credenciales incorrectas' };
            }

            // Resetear intentos fallidos y actualizar último acceso
            const updateUser = `
                UPDATE usuarios 
                SET intentos_fallidos = 0, 
                    ultimo_acceso = CURRENT_TIMESTAMP,
                    bloqueado_hasta = NULL
                WHERE id = ?
            `;
            this.db.exec(updateUser, [result.id]);

            // Crear sesión
            const sessionToken = this.generateSessionToken();
            await this.createSession(result.id, sessionToken);

            await this.logAuthenticationAttempt(email, 'login_success', true, 'Inicio de sesión exitoso');

            return {
                success: true,
                user: {
                    id: result.id,
                    email: result.email,
                    nombre: result.nombre,
                    apellido: result.apellido,
                    tipo_usuario: result.tipo_usuario
                },
                sessionToken: sessionToken
            };

        } catch (error) {
            console.error('Error en autenticación:', error);
            await this.logAuthenticationAttempt(email, 'login_error', false, 'Error del sistema');
            return { success: false, message: 'Error del sistema' };
        }
    }

    // Crear sesión de usuario
    async createSession(userId, sessionToken) {
        try {
            const query = `
                INSERT INTO sesiones (usuario_id, token_sesion, fecha_expiracion)
                VALUES (?, ?, datetime('now', '+24 hours'))
            `;
            
            const stmt = this.db.prepare(query);
            stmt.run([userId, sessionToken]);
            
            // Limpiar sesiones expiradas
            this.cleanExpiredSessions();
            
        } catch (error) {
            console.error('Error al crear sesión:', error);
        }
    }

    // Verificar sesión válida
    async verifySession(sessionToken) {
        try {
            const query = `
                SELECT s.*, u.email, u.nombre, u.apellido, u.tipo_usuario
                FROM sesiones s
                JOIN usuarios u ON s.usuario_id = u.id
                WHERE s.token_sesion = ? AND s.activa = 1 AND s.fecha_expiracion > CURRENT_TIMESTAMP
            `;
            
            const stmt = this.db.prepare(query);
            const result = stmt.get([sessionToken]);
            
            if (result) {
                // Actualizar último acceso
                const updateAccess = `UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?`;
                this.db.exec(updateAccess, [result.usuario_id]);
                
                return {
                    valid: true,
                    user: {
                        id: result.usuario_id,
                        email: result.email,
                        nombre: result.nombre,
                        apellido: result.apellido,
                        tipo_usuario: result.tipo_usuario
                    }
                };
            }
            
            return { valid: false };
        } catch (error) {
            console.error('Error al verificar sesión:', error);
            return { valid: false };
        }
    }

    // Cerrar sesión
    async closeSession(sessionToken) {
        try {
            const query = `UPDATE sesiones SET activa = 0 WHERE token_sesion = ?`;
            const stmt = this.db.prepare(query);
            stmt.run([sessionToken]);
            return true;
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            return false;
        }
    }

    // Registrar nuevo usuario
    async registerUser(userData) {
        try {
            const { email, password, nombre, apellido, tipo_usuario } = userData;
            
            // Verificar si el email ya existe
            const checkEmail = `SELECT id FROM usuarios WHERE email = ?`;
            const stmt = this.db.prepare(checkEmail);
            const existingUser = stmt.get([email.toLowerCase()]);
            
            if (existingUser) {
                return { success: false, message: 'El email ya está registrado' };
            }

            // Insertar nuevo usuario
            const insertUser = `
                INSERT INTO usuarios (email, password, nombre, apellido, tipo_usuario)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const insertStmt = this.db.prepare(insertUser);
            insertStmt.run([
                email.toLowerCase(),
                this.hashPassword(password),
                nombre,
                apellido,
                tipo_usuario
            ]);

            await this.logAuthenticationAttempt(email, 'user_registered', true, 'Usuario registrado exitosamente');

            return { success: true, message: 'Usuario registrado exitosamente' };

        } catch (error) {
            console.error('Error al registrar usuario:', error);
            await this.logAuthenticationAttempt(userData.email, 'registration_error', false, 'Error al registrar usuario');
            return { success: false, message: 'Error al registrar usuario' };
        }
    }

    // Log de eventos de autenticación
    async logAuthenticationAttempt(email, eventType, success, message) {
        try {
            const query = `
                INSERT INTO logs_autenticacion (email, tipo_evento, exito, mensaje)
                VALUES (?, ?, ?, ?)
            `;
            
            const stmt = this.db.prepare(query);
            stmt.run([email, eventType, success ? 1 : 0, message]);
        } catch (error) {
            console.error('Error al registrar log:', error);
        }
    }

    // Limpiar sesiones expiradas
    cleanExpiredSessions() {
        try {
            const query = `UPDATE sesiones SET activa = 0 WHERE fecha_expiracion < CURRENT_TIMESTAMP`;
            this.db.exec(query);
        } catch (error) {
            console.error('Error al limpiar sesiones:', error);
        }
    }

    // Generar token de sesión
    generateSessionToken() {
        return 'ucol_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }

    // Obtener estadísticas de usuarios
    async getUserStats() {
        try {
            const query = `
                SELECT 
                    tipo_usuario,
                    COUNT(*) as total,
                    SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
                    SUM(CASE WHEN ultimo_acceso > datetime('now', '-7 days') THEN 1 ELSE 0 END) as activos_semana
                FROM usuarios 
                GROUP BY tipo_usuario
            `;
            
            const stmt = this.db.prepare(query);
            const results = stmt.all();
            
            return results;
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return [];
        }
    }

    // Exportar base de datos (para respaldo)
    exportDatabase() {
        if (this.db) {
            const data = this.db.export();
            return new Uint8Array(data);
        }
        return null;
    }

    // Importar base de datos (para restaurar)
    importDatabase(data) {
        try {
            this.db = new SQL.Database(data);
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Error al importar base de datos:', error);
            return false;
        }
    }
}

// Crear instancia global de la base de datos
window.DatabaseManager = DatabaseManager;
window.dbManager = new DatabaseManager();
