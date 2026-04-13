# MCP MySQL Explorer

Explorador de bases de datos MySQL con IA integrada. Permite realizar consultas en lenguaje natural sobre múltiples bases de datos MySQL con validación estricta de solo lectura.

---

## Características Principales

- **Multi-BD**: Configura y gestiona múltiples conexiones MySQL
- **Consultas en Lenguaje Natural**: Pregunta a la IA sobre tus datos en español
- **Solo Lectura**: Validación estricta — solo permite SELECT, SHOW, DESCRIBE
- **IA Integrada**: Soporte para Ollama (local) o OpenRouter (cloud)
- **Chat con Historial**: Conversaciones persistentes almacenadas en SQLite
- **MCP Server**: Compatible con VS Code, Claude Desktop y otros clientes MCP
- **Interfaz Moderna**: SPA responsive con temas dark/light
- **Seguridad**: Multi-capa de validación SQL, enmascarado de contraseñas

---

## Screenshots

> *Próximamente: Capturas de pantalla de la aplicación*

---

## Stack Tecnológico

### Frontend
| Tecnología | Versión |
|------------|---------|
| Alpine.js | 3.13.3 |
| Bootstrap | 5.3.3 |
| Deep Chat | 2.4.2 |
| Axios | latest |
| SweetAlert2 | 11 |

### Backend
| Tecnología | Versión |
|------------|---------|
| Node.js | 18+ |
| Express.js | latest |
| Sequelize | latest |
| SQLite3 | ^6.0.1 |
| mysql2 | latest |
| @modelcontextprotocol/sdk | latest |

---

## Requisitos Previos

- **Node.js** 18 o superior
- **Ollama** instalado (si usas IA local) o **OpenRouter API key** (si usas IA cloud)
- **MySQL** (servidores a los que quieras conectarte)

### Instalar Ollama (opcional, para IA local)

```bash
# Windows/Mac/Linux
# Descargar desde: https://ollama.com

# Descargar un modelo
ollama pull llama3.1:8b
```

---

## Instalación y Configuración

### Paso 1: Clonar o descargar el proyecto

```bash
cd mcp-mysql
```

### Paso 2: Instalar dependencias del backend

```bash
cd backend
npm install
cd ..
```

### Paso 3: Configurar variables de entorno

```bash
cd backend
copy .env.example .env
# o: cp .env.example .env
```

Edita el archivo `.env` con tu configuración:

```env
PORT=3001
NODE_ENV=development

# Elige tu proveedor de IA: 'ollama' o 'openrouter'
AI_PROVIDER=ollama

# Configuración Ollama (local)
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=llama3.1:8b

# Configuración OpenRouter (cloud)
OPENROUTER_API_KEY=tu_api_key_aqui
OPENROUTER_MODEL=meta-llama/llama-3-70b-instruct

# SQLite (almacenamiento interno)
SQLITE_PATH=./data/mcp_memory.sqlite
```

### Paso 4: Inicializar la base de datos (opcional)

```bash
cd backend
npm run seed
```

### Paso 5: Iniciar el servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

### Paso 6: Acceder a la aplicación

Abre tu navegador en: **http://localhost:3001**

---

## Configuración de .env

| Variable | Descripción | Requerido | Valor por defecto |
|----------|-------------|-----------|-------------------|
| `PORT` | Puerto del servidor | No | 3001 |
| `NODE_ENV` | Entorno | No | development |
| `AI_PROVIDER` | Proveedor de IA (`ollama` o `openrouter`) | Sí | ollama |
| `OLLAMA_URL` | URL de Ollama | Si AI_PROVIDER=ollama | http://localhost:11434/api/chat |
| `OLLAMA_MODEL` | Modelo de Ollama | Si AI_PROVIDER=ollama | llama3.1:8b |
| `OPENROUTER_API_KEY` | API key de OpenRouter | Si AI_PROVIDER=openrouter | - |
| `OPENROUTER_MODEL` | Modelo de OpenRouter | No | meta-llama/llama-3-70b-instruct |
| `SQLITE_PATH` | Ruta a SQLite | No | ./data/mcp_memory.sqlite |

---

## Uso

### Crear una Conexión

1. Haz clic en "Conexiones" en el sidebar
2. Click en "Nueva Conexión"
3. Completa los campos:
   - **Nombre**: Un nombre descriptivo (ej: "Producción")
   - **Host**: IP o dominio del servidor MySQL
   - **Puerto**: Puerto MySQL (default: 3306)
   - **Usuario**: Usuario de la base de datos
   - **Contraseña**: Contraseña del usuario
   - **Base de Datos**: Nombre de la base de datos
   - **Descripción del Esquema** (opcional): Describe las tablas para ayudar a la IA

4. Click en "Guardar"
5. Opcional: Click en "Probar" para verificar la conexión

### Chatear con la IA

1. Selecciona una base de datos del dropdown en la barra superior
2. Escribe tu pregunta en el chat (ej: "¿Cuántos pedidos hubo esta semana?")
3. La IA generará SQL, lo ejecutará y te responderá en lenguaje natural

### Ver SQL Generado

Las respuestas de la IA incluyen el SQL generado y ejecutado. Puedes ver los detalles expandiendo la información del mensaje.

### Gestionar Chats

- **Nuevo Chat**: Click en "Nuevo Chat" para iniciar una conversación nueva
- **Historial**: Los chats recientes aparecen en el sidebar
- **Eliminar**: Click en el ícono de papelera para eliminar un chat

### Cambiar Tema

- Click en el ícono de sol/luna para alternar entre tema oscuro y claro
- Tu preferencia se guarda automáticamente

---

## Arquitectura General

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend       │────▶│   MySQL DBs     │
│   (Alpine.js)   │◄────│   (Express)     │◄────│   (External)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   SQLite        │
                        │   (Internal)    │
                        └─────────────────┘
```

### Flujo de una Consulta

1. Usuario escribe pregunta en el frontend
2. Frontend envía POST `/api/chat` con la pregunta y connectionId
3. Backend:
   - Construye prompt con el esquema de la BD
   - Llama al servicio de IA (Ollama/OpenRouter)
   - Recibe SQL generado
   - Valida que sea solo lectura
   - Ejecuta el SQL en la BD MySQL
   - Envía resultados a la IA para interpretación
   - Guarda mensajes en SQLite
4. Frontend muestra respuesta con SQL y resultados

---

## Estructura del Proyecto

```
mcp-mysql/
├── README.md                 # Este archivo
├── FIXES.md                  # Registro de correcciones
├── backend/                  # Servidor Express + MCP
│   ├── README_BACKEND.md     # Documentación del backend
│   ├── .env                  # Variables de entorno
│   ├── package.json
│   ├── server.js             # Entry point
│   ├── config/
│   │   └── database.js       # Configuración SQLite
│   ├── controllers/
│   │   ├── chatController.js
│   │   └── connectionController.js
│   ├── mcp/                  # Servidor MCP
│   │   ├── server.js
│   │   ├── handlers/
│   │   └── tools/
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── models/               # Modelos Sequelize
│   │   ├── index.js
│   │   ├── Chat.js
│   │   ├── DatabaseConnection.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── chatRoutes.js
│   │   ├── connectionRoutes.js
│   │   └── mcpGateway.js
│   ├── services/             # Lógica de negocio
│   │   ├── aiService.js
│   │   ├── dbManager.js
│   │   ├── promptBuilder.js
│   │   └── sqlValidator.js
│   └── data/
│       └── mcp_memory.sqlite
│
└── frontend/                 # Aplicación SPA
    ├── README_FRONTEND.md    # Documentación del frontend
    ├── index.html            # Página principal
    ├── package.json
    ├── styles/
    │   ├── base.css          # Estilos base y tema
    │   └── mobile.css        # Responsive
    └── src/
        ├── mcp-explorer.js   # Controlador Alpine.js
        └── utils.js          # Utilidades
```

---

## Documentación Adicional

- [Documentación del Frontend](frontend/README_FRONTEND.md) - Detalles de la interfaz de usuario
- [Documentación del Backend](backend/README_BACKEND.md) - API, modelos y servicios

---

## Seguridad

- **Validación SQL estricta**: Solo permite SELECT, SHOW, DESCRIBE
- **Bloqueo de multi-statements**: Previene inyección SQL
- **Enmascarado de contraseñas**: Las contraseñas nunca se exponen en la API
- **Recomendación**: Usa usuarios MySQL con permisos de solo lectura

```sql
CREATE USER 'readonly'@'%' IDENTIFIED BY 'password';
GRANT SELECT, SHOW DATABASES, SHOW VIEW ON *.* TO 'readonly'@'%';
FLUSH PRIVILEGES;
```

---

## Licencia

MIT License - Libre para uso personal y comercial.

---

## Soporte

Para reportar problemas o sugerir mejoras, por favor crear un issue en el repositorio.
