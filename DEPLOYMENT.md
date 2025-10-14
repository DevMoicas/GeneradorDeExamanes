# 🚀 Instrucciones para Desplegar en Railway

## Paso 1: Preparar el Repositorio

1. **Sube tu código a GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Preparado para Railway"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/tu-repositorio.git
   git push -u origin main
   ```

## Paso 2: Configurar Railway

1. **Ve a [railway.app](https://railway.app)** y crea una cuenta
2. **Conecta GitHub**: Autoriza Railway para acceder a tus repositorios
3. **Nuevo Proyecto**: Haz clic en "New Project" → "Deploy from GitHub repo"
4. **Selecciona tu repositorio**: Elige el repositorio del Generador de Exámenes

## Paso 3: Configurar Variables de Entorno

1. **En Railway Dashboard**:
   - Ve a tu proyecto
   - Haz clic en "Variables"
   - Agrega: `GEMINI_API_KEY` = tu clave de API de Gemini

2. **Obtener clave de Gemini**:
   - Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Crea una nueva API key
   - Copia y pégala en Railway

## Paso 4: Despliegue Automático

1. **Railway detectará automáticamente**:
   - ✅ Es una aplicación Node.js
   - ✅ Usará `npm start` para iniciar
   - ✅ Puerto será asignado automáticamente

2. **El despliegue comenzará automáticamente**

## Paso 5: Acceder a tu Aplicación

1. **Railway te dará una URL** como: `https://tu-app.railway.app`
2. **Abre la URL** en tu navegador
3. **¡Tu aplicación estará funcionando!**

## 🔧 Solución de Problemas

### Error: "Cannot find module"
- Verifica que `package.json` tenga todas las dependencias
- Railway instalará automáticamente con `npm install`

### Error: "Port already in use"
- Railway asigna el puerto automáticamente
- No necesitas configurar nada

### Error: "GEMINI_API_KEY not found"
- Asegúrate de configurar la variable de entorno en Railway
- La clave debe ser válida y activa

## 📱 URLs Importantes

- **Dashboard Profesor**: `https://tu-app.railway.app/dashboard-profesor.html`
- **Dashboard Alumno**: `https://tu-app.railway.app/dashboard-alumno.html`
- **API Health**: `https://tu-app.railway.app/health`

## 🔄 Actualizaciones

Para actualizar tu aplicación:
1. Haz cambios en tu código local
2. Haz commit y push a GitHub
3. Railway desplegará automáticamente la nueva versión

## 💰 Costos

- **Gratis**: 500 horas/mes
- **Después**: $5/mes por servicio activo
- **Base de datos**: Incluida en el plan

## 🎯 Próximos Pasos

1. **Configura un dominio personalizado** (opcional)
2. **Agrega una base de datos PostgreSQL** para persistencia
3. **Configura backups automáticos**
4. **Monitorea el rendimiento** con Railway Analytics
