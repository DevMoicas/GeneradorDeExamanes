# Generador de Exámenes - Universidad de Colima

Sistema web para la generación de exámenes con inteligencia artificial para la Universidad de Colima.

## Características

- **Interfaz de inicio de sesión moderna** con diseño responsivo
- **Dos tipos de usuarios**: Alumnos y Profesores
- **Validación en tiempo real** de formularios
- **Recordar sesión** con almacenamiento local
- **Diseño con Tailwind CSS** para una experiencia visual atractiva

## Tecnologías Utilizadas

- **HTML5** - Estructura semántica
- **CSS3** - Estilos personalizados
- **Tailwind CSS** - Framework de utilidades CSS
- **JavaScript (ES6+)** - Funcionalidad interactiva
- **Font Awesome** - Iconografía

## Estructura del Proyecto

```
GeneradorDeExamanes/
├── index.html          # Página principal de inicio de sesión
├── script.js           # Lógica JavaScript para la autenticación
└── README.md           # Documentación del proyecto
```

## Instalación y Uso

1. **Clonar o descargar** el proyecto
2. **Abrir** `index.html` en un navegador web moderno
3. **No requiere servidor** para la funcionalidad básica de la interfaz

## Backend temporal (Node.js + XML)

Este proyecto incluye un backend ligero en Node.js para publicar temporalmente el examen generado por IA como XML y recibir respuestas de alumnos.

### Requisitos
- Node.js 18+

### Instalación
1. Instala dependencias:
   ```bash
   npm install express cors body-parser xmlbuilder2 fast-xml-parser --save
   ```
2. Ejecuta el servidor:
   ```bash
   node server.js
   ```
   El servidor corre en `http://localhost:3001`.

### Endpoints
- `POST /exam`: Publica/actualiza el examen actual. Cuerpo esperado: JSON del examen (título, materia, preguntas, etc.). Persiste `temp/current-exam.xml` y `temp/current-exam.json`.
- `GET /exam/current`: Devuelve el examen actual en XML.
- `GET /exam/current/json`: Devuelve el examen actual en JSON.
- `POST /exam/answers`: Recibe respuestas del alumno y guarda `temp/answers/answers-<timestamp>.xml` y `.json`.

### Frontend
- El panel del profesor publica el examen al backend al presionar "Guardar".
- El panel del alumno consulta el examen actual del backend por código y permite unirse.

## Credenciales de Prueba

Para probar la funcionalidad de inicio de sesión, utiliza estas credenciales:

### Profesor
- **Email**: `profesor@ucol.mx`
- **Contraseña**: `profesor123`

### Alumno
- **Email**: `alumno@ucol.mx`
- **Contraseña**: `alumno123`

### Administrador
- **Email**: `admin@ucol.mx`
- **Contraseña**: `admin123`

## Características de la Interfaz

### Diseño Visual
- **Gradiente de fondo** azul-púrpura moderno
- **Efecto glassmorphism** en el formulario
- **Animaciones suaves** y transiciones
- **Iconografía** de Font Awesome
- **Diseño responsivo** para móviles y desktop

### Funcionalidades
- **Selector de tipo de usuario** (Alumno/Profesor)
- **Validación de email** en tiempo real
- **Mostrar/ocultar contraseña**
- **Recordar sesión** con localStorage
- **Mensajes de estado** dinámicos
- **Validación de formulario** completa

### Validaciones Implementadas
- ✅ Email válido (formato correcto)
- ✅ Contraseña mínima de 6 caracteres
- ✅ Campos obligatorios
- ✅ Tipo de usuario seleccionado

## Próximas Funcionalidades

- [ ] Integración con backend/API
- [ ] Panel de control para profesores
- [ ] Panel de exámenes para alumnos
- [ ] Generación de exámenes con IA
- [ ] Sistema de calificaciones
- [ ] Base de datos de preguntas

## Desarrollo

### Estructura del Código JavaScript

El archivo `script.js` está organizado en las siguientes secciones:

1. **Inicialización** - Configuración inicial de la aplicación
2. **Event Listeners** - Manejo de eventos del DOM
3. **Validaciones** - Funciones de validación de formularios
4. **Autenticación** - Simulación del proceso de login
5. **Almacenamiento** - Gestión de credenciales guardadas
6. **Utilidades** - Funciones auxiliares y mensajes

### Personalización

Para personalizar la interfaz:

1. **Colores**: Modifica las clases de Tailwind en `index.html`
2. **Validaciones**: Ajusta las funciones en `script.js`
3. **Credenciales**: Actualiza el objeto `validCredentials` en `script.js`

## Compatibilidad

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## Licencia

Proyecto desarrollado para la Universidad de Colima.

## Contacto

Para soporte técnico o consultas sobre el proyecto, contactar al equipo de desarrollo.
