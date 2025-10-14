# Generador de Exámenes con IA

Sistema completo para generar y gestionar exámenes usando inteligencia artificial.

## Características

- 🎯 Generación automática de exámenes con IA (Gemini)
- 👨‍🏫 Dashboard para profesores
- 👨‍🎓 Dashboard para estudiantes
- 📝 Sistema de respuestas y calificación automática
- 💾 Almacenamiento temporal de exámenes
- 🔗 Códigos únicos para acceso a exámenes

## Tecnologías

- **Backend**: Node.js + Express
- **Frontend**: HTML5 + CSS3 + JavaScript
- **IA**: Google Gemini API
- **Almacenamiento**: Archivos temporales (XML/JSON)

## Instalación Local

```bash
# Instalar dependencias
npm install

# Ejecutar servidor
npm start
```

## Despliegue en Railway

1. Conecta tu repositorio de GitHub a Railway
2. Railway detectará automáticamente la configuración
3. La aplicación estará disponible en la URL proporcionada

## Uso

1. **Profesor**: Genera exámenes usando el dashboard
2. **Publica**: Obtén un código único para el examen
3. **Estudiante**: Ingresa el código para acceder al examen
4. **Respuesta**: Completa el examen y recibe calificación automática

## API Endpoints

- `POST /exam` - Publicar examen
- `GET /exam/code/:code/public` - Obtener examen público
- `POST /exam/code/:code/grade` - Calificar respuestas
- `GET /exams/active/public` - Listar exámenes activos

## Variables de Entorno

- `PORT` - Puerto del servidor (Railway lo asigna automáticamente)
- `GEMINI_API_KEY` - Clave de API de Gemini (configurar en Railway)

## Estructura del Proyecto

```
├── server.js              # Servidor principal
├── xml-utils.js           # Utilidades XML
├── dashboard-profesor.html # Dashboard del profesor
├── dashboard-alumno.html  # Dashboard del estudiante
├── package.json           # Configuración del proyecto
└── Procfile              # Configuración para Railway
```