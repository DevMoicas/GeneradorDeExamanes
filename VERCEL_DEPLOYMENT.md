# 🚀 Instrucciones para Desplegar en Vercel

## ✅ Tu aplicación ya está preparada para Vercel!

He creado una versión compatible con Vercel que incluye:

- ✅ **Funciones API serverless** en `/api/`
- ✅ **Configuración de rutas** en `vercel.json`
- ✅ **Archivos estáticos** servidos correctamente
- ✅ **CORS configurado** para todas las rutas

## 📋 Pasos para Desplegar

### 1. **Sube tu código a GitHub**
```bash
git init
git add .
git commit -m "Preparado para Vercel"
git branch -M main
git remote add origin https://github.com/tu-usuario/tu-repositorio.git
git push -u origin main
```

### 2. **Conecta con Vercel**
1. Ve a [vercel.com](https://vercel.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en **"New Project"**
4. Conecta tu repositorio de GitHub
5. Selecciona tu repositorio del Generador de Exámenes

### 3. **Configura Variables de Entorno**
En Vercel Dashboard:
1. Ve a tu proyecto
2. Haz clic en **"Settings"** → **"Environment Variables"**
3. Agrega: `GEMINI_API_KEY` = tu clave de API de Gemini

### 4. **Despliegue Automático**
- Vercel detectará automáticamente la configuración
- El despliegue comenzará automáticamente
- ¡Tu aplicación estará disponible en minutos!

## 🔗 URLs de tu Aplicación

Una vez desplegada, tendrás URLs como:
- **Aplicación principal**: `https://tu-app.vercel.app`
- **Dashboard Profesor**: `https://tu-app.vercel.app/dashboard-profesor.html`
- **Dashboard Alumno**: `https://tu-app.vercel.app/dashboard-alumno.html`

## 🔧 API Endpoints Disponibles

- `POST /api/exam` - Publicar examen
- `GET /api/exam/code/[code]/public` - Obtener examen público
- `POST /api/exam/code/[code]/grade` - Calificar respuestas
- `GET /api/exams/active/public` - Listar exámenes activos

## ⚠️ Notas Importantes

### **Almacenamiento Temporal**
- Los archivos se guardan en `/tmp` (temporal)
- **Se pierden al reiniciar** (comportamiento normal de Vercel)
- Para persistencia permanente, considera usar una base de datos

### **Límites de Vercel**
- **Plan Gratuito**: 100GB bandwidth/mes
- **Funciones**: 10 segundos de ejecución máximo
- **Archivos**: Hasta 50MB por función

## 🎯 Ventajas de Vercel

- ✅ **Despliegue súper rápido**
- ✅ **CDN global** (muy rápido en todo el mundo)
- ✅ **SSL automático**
- ✅ **Despliegue automático** desde GitHub
- ✅ **Escalado automático**

## 🔄 Actualizaciones

Para actualizar tu aplicación:
1. Haz cambios en tu código local
2. Haz commit y push a GitHub
3. Vercel desplegará automáticamente la nueva versión

## 🆘 Solución de Problemas

### **Error: "Cannot GET /dashboard-alumno.html"**
- ✅ **Solucionado**: Ahora las rutas están configuradas correctamente

### **Error: "Function timeout"**
- Las funciones tienen límite de 10 segundos
- Si necesitas más tiempo, considera usar Vercel Pro

### **Error: "Module not found"**
- Verifica que `package.json` tenga todas las dependencias
- Vercel instalará automáticamente con `npm install`

## 🎉 ¡Listo para Usar!

Tu aplicación ahora funcionará perfectamente en Vercel. Los dashboards se cargarán correctamente y todas las funciones API estarán disponibles.
