# Documentación de Base de Datos - Generador de Exámenes UCOL

## 📊 Estructura de la Base de Datos

### Tecnologías Utilizadas
- **SQLite** - Base de datos local en el navegador
- **SQL.js** - Librería JavaScript para ejecutar SQLite en el navegador
- **JavaScript ES6+** - Lógica de aplicación

### Tablas de la Base de Datos

#### 1. Tabla `usuarios`
```sql
CREATE TABLE usuarios (
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
);
```

**Campos:**
- `id`: Identificador único del usuario
- `email`: Correo electrónico (único)
- `password`: Contraseña hasheada
- `nombre`: Nombre del usuario
- `apellido`: Apellido del usuario
- `tipo_usuario`: Tipo de usuario (profesor/alumno)
- `activo`: Estado del usuario (activo/inactivo)
- `fecha_registro`: Fecha de registro
- `ultimo_acceso`: Último acceso del usuario
- `intentos_fallidos`: Contador de intentos fallidos
- `bloqueado_hasta`: Fecha hasta la cual está bloqueado

#### 2. Tabla `sesiones`
```sql
CREATE TABLE sesiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    token_sesion TEXT UNIQUE NOT NULL,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,
    activa BOOLEAN DEFAULT 1,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);
```

**Campos:**
- `id`: Identificador único de la sesión
- `usuario_id`: ID del usuario (clave foránea)
- `token_sesion`: Token único de la sesión
- `fecha_inicio`: Fecha de inicio de la sesión
- `fecha_expiracion`: Fecha de expiración de la sesión
- `activa`: Estado de la sesión
- `ip_address`: Dirección IP del usuario
- `user_agent`: Información del navegador

#### 3. Tabla `logs_autenticacion`
```sql
CREATE TABLE logs_autenticacion (
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
);
```

**Campos:**
- `id`: Identificador único del log
- `usuario_id`: ID del usuario (clave foránea)
- `email`: Email del usuario
- `tipo_evento`: Tipo de evento (login_success, login_failed, etc.)
- `fecha_evento`: Fecha del evento
- `ip_address`: Dirección IP
- `user_agent`: Información del navegador
- `exito`: Si el evento fue exitoso
- `mensaje`: Mensaje descriptivo

## 🔧 Funcionalidades Implementadas

### 1. Autenticación de Usuarios
```javascript
// Autenticar usuario
const result = await dbManager.authenticateUser(email, password, userType);
```

**Características:**
- Validación de credenciales
- Verificación de tipo de usuario
- Control de intentos fallidos
- Bloqueo temporal por intentos excesivos
- Generación de tokens de sesión

### 2. Gestión de Sesiones
```javascript
// Crear sesión
await dbManager.createSession(userId, sessionToken);

// Verificar sesión
const sessionResult = await dbManager.verifySession(sessionToken);

// Cerrar sesión
await dbManager.closeSession(sessionToken);
```

**Características:**
- Tokens únicos de sesión
- Expiración automática (24 horas)
- Limpieza de sesiones expiradas
- Verificación de validez

### 3. Registro de Usuarios
```javascript
// Registrar nuevo usuario
const result = await dbManager.registerUser(userData);
```

**Características:**
- Validación de datos
- Verificación de email único
- Hash de contraseñas
- Registro de eventos

### 4. Sistema de Logs
```javascript
// Registrar evento
await dbManager.logAuthenticationAttempt(email, eventType, success, message);
```

**Tipos de eventos:**
- `login_success`: Inicio de sesión exitoso
- `login_failed`: Intento de inicio de sesión fallido
- `login_blocked`: Usuario bloqueado
- `user_registered`: Usuario registrado
- `login_error`: Error del sistema

## 🚀 Inicialización de la Base de Datos

### 1. Carga de SQL.js
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js"></script>
```

### 2. Inicialización Automática
```javascript
// Se ejecuta automáticamente al cargar la página
window.initializeDatabase();
```

### 3. Datos de Prueba
La base de datos se inicializa con usuarios de prueba:

**Profesores:**
- `profesor@ucol.mx` / `profesor123`
- `admin@ucol.mx` / `admin123`
- `carlos.rodriguez@ucol.mx` / `carlos123`

**Alumnos:**
- `alumno@ucol.mx` / `alumno123`
- `ana.martinez@ucol.mx` / `ana123`

## 🔒 Seguridad Implementada

### 1. Hash de Contraseñas
```javascript
hashPassword(password) {
    return btoa(password + '_salt_ucol_2024');
}
```

### 2. Control de Intentos Fallidos
- Máximo 5 intentos fallidos
- Bloqueo temporal de 30 minutos
- Reset automático al iniciar sesión exitosamente

### 3. Tokens de Sesión
- Tokens únicos generados aleatoriamente
- Formato: `ucol_[random]_[timestamp]`
- Expiración automática

### 4. Validaciones
- Email único en la base de datos
- Validación de formato de email
- Contraseña mínima de 6 caracteres
- Verificación de tipo de usuario

## 📁 Archivos de la Base de Datos

### 1. `database.js`
- Clase `DatabaseManager`
- Funciones de base de datos
- Operaciones CRUD
- Gestión de sesiones

### 2. `init-db.js`
- Clase `DatabaseInitializer`
- Inicialización automática
- Carga de SQL.js
- Configuración inicial

### 3. `script.js` (modificado)
- Integración con base de datos
- Autenticación real
- Gestión de sesiones
- Validaciones

### 4. `register.js`
- Página de registro
- Validaciones de formulario
- Integración con base de datos

## 🛠️ Uso de la Base de Datos

### Verificar Estado
```javascript
if (window.isDatabaseReady()) {
    // Base de datos lista
}
```

### Obtener Manager
```javascript
const dbManager = window.getDatabaseManager();
```

### Operaciones Comunes
```javascript
// Autenticar
const authResult = await dbManager.authenticateUser(email, password, type);

// Registrar
const registerResult = await dbManager.registerUser(userData);

// Verificar sesión
const sessionResult = await dbManager.verifySession(token);

// Obtener estadísticas
const stats = await dbManager.getUserStats();
```

## 🔄 Flujo de Autenticación

1. **Carga de página** → Inicialización de base de datos
2. **Ingreso de credenciales** → Validación de formulario
3. **Autenticación** → Verificación en base de datos
4. **Creación de sesión** → Generación de token
5. **Almacenamiento** → Guardado en sessionStorage
6. **Redirección** → Acceso al panel correspondiente

## 📊 Monitoreo y Logs

### Eventos Registrados
- Inicios de sesión exitosos/fallidos
- Registros de usuarios
- Errores del sistema
- Bloqueos de usuarios

### Estadísticas Disponibles
- Total de usuarios por tipo
- Usuarios activos
- Actividad semanal
- Intentos fallidos

## 🚨 Consideraciones Importantes

### Limitaciones
- Base de datos local (no persistente entre navegadores)
- Sin encriptación real de contraseñas
- Sin validación de servidor

### Recomendaciones para Producción
1. Implementar servidor backend
2. Usar bcrypt para hash de contraseñas
3. Implementar HTTPS
4. Validación de servidor
5. Base de datos persistente (PostgreSQL/MySQL)

## 🔧 Mantenimiento

### Limpieza de Datos
```javascript
// Limpiar sesiones expiradas
dbManager.cleanExpiredSessions();

// Limpiar datos de prueba
await dbInitializer.clearTestData();
```

### Respaldo y Restauración
```javascript
// Exportar base de datos
const data = dbManager.exportDatabase();

// Importar base de datos
dbManager.importDatabase(data);
```

## 📞 Soporte

Para problemas con la base de datos:
1. Verificar consola del navegador
2. Comprobar carga de SQL.js
3. Verificar inicialización
4. Revisar logs de autenticación

---

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2024  
**Desarrollado para:** Universidad de Colima
