# Backend — MCP MySQL Explorer

Servidor Express.js con soporte MCP (Model Context Protocol), IA integrada (Ollama/OpenRouter) y base de datos SQLite para almacenamiento interno.

---

## Descripción General

El backend proporciona:
- API REST para gestión de conexiones MySQL y chat con IA
- Servidor MCP con transporte stdio (compatible con VS Code, Claude Desktop)
- Gateway MCP HTTP para uso desde el frontend
- Validación estricta de SQL solo lectura
- Pool de conexiones MySQL dinámico
- Almacenamiento persistente de chats y mensajes en SQLite

---

## Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Node.js | 18+ | Runtime |
| Express.js | latest | Framework web |
| Sequelize | latest | ORM para SQLite |
| SQLite3 | ^6.0.1 | Base de datos interna |
| mysql2 | latest | Driver MySQL con pooling |
| @modelcontextprotocol/sdk | latest | SDK MCP oficial |
| OpenAI SDK | latest | Cliente para OpenRouter |
| Axios | latest | Cliente HTTP para Ollama |
| dotenv | latest | Variables de entorno |
| cors | latest | CORS habilitado |

---

## Estructura de Archivos

```
backend/
├── .env                          # Configuración de entorno
├── .gitignore
├── package.json                  # Dependencias y scripts
├── server.js                     # Entry point de Express
├── README_BACKEND.md             # Este archivo
│
├── config/
│   └── database.js              # Configuración Sequelize (SQLite)
│
├── controllers/
│   ├── chatController.js        # Lógica de chat con IA
│   └── connectionController.js  # CRUD de conexiones
│
├── data/
│   └── mcp_memory.sqlite        # BD SQLite (auto-creada)
│
├── mcp/
│   ├── server.js                # MCP Server (stdio transport)
│   ├── handlers/
│   │   ├── connection.js        # Handlers de conexiones
│   │   ├── query.js             # Ejecución SQL
│   │   └── schema.js            # Inspección de esquema
│   └── tools/
│       ├── definitions.js       # Definiciones de herramientas MCP
│       └── executor.js          # Ejecutor de herramientas
│
├── middleware/
│   └── errorHandler.js          # Manejo centralizado de errores
│
├── models/
│   ├── index.js                 # Registro de modelos y relaciones
│   ├── Chat.js                  # Modelo de chats
│   ├── DatabaseConnection.js    # Modelo de conexiones MySQL
│   └── Message.js               # Modelo de mensajes
│
├── routes/
│   ├── chatRoutes.js            # Rutas /api/chat
│   ├── connectionRoutes.js      # Rutas /api/connections
│   └── mcpGateway.js            # Gateway MCP HTTP /api/mcp
│
├── seeds/
│   └── init.js                  # Inicialización de datos
│
└── services/
    ├── aiService.js             # Servicio de IA (Ollama/OpenRouter)
    ├── dbManager.js             # Gestión de pools MySQL
    ├── promptBuilder.js         # Construcción de prompts
    └── sqlValidator.js          # Validación SQL solo lectura
```

---

## Configuración (.env)

```env
# ============================================
# MCP MySQL - Configuration
# ============================================

# Server Configuration
PORT=3001
NODE_ENV=development

# ============================================
# AI Provider Configuration
# Options: 'ollama' or 'openrouter'
# ============================================
AI_PROVIDER=ollama

# --- OpenRouter Configuration (if AI_PROVIDER=openrouter) ---
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=meta-llama/llama-3-70b-instruct

# --- Ollama Local Configuration (if AI_PROVIDER=ollama) ---
OLLAMA_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=llama3.1:8b

# ============================================
# SQLite Memory Database (almacenamiento interno)
# ============================================
SQLITE_PATH=./data/mcp_memory.sqlite
```

### Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | 3001 |
| `NODE_ENV` | Entorno (development/production) | development |
| `AI_PROVIDER` | Proveedor de IA (ollama/openrouter) | ollama |
| `OPENROUTER_API_KEY` | API key de OpenRouter | - |
| `OPENROUTER_MODEL` | Modelo de OpenRouter | meta-llama/llama-3-70b-instruct |
| `OLLAMA_URL` | URL de Ollama | http://localhost:11434/api/chat |
| `OLLAMA_MODEL` | Modelo de Ollama | llama3.1:8b |
| `SQLITE_PATH` | Ruta a la BD SQLite | ./data/mcp_memory.sqlite |

---

## Modelos de Datos

### DatabaseConnection

Almacena la configuración de conexiones MySQL externas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador único |
| `name` | STRING UNIQUE | Nombre descriptivo (ej: "Producción") |
| `host` | STRING | Host del servidor MySQL |
| `port` | INTEGER | Puerto (default: 3306) |
| `user` | STRING | Usuario de conexión |
| `password` | STRING | Contraseña (almacenada en texto plano) |
| `database` | STRING | Nombre de la base de datos |
| `isActive` | BOOLEAN | Estado de la conexión |
| `description` | TEXT | Descripción del esquema para contexto de IA |
| `createdAt` | DATETIME | Fecha de creación |
| `updatedAt` | DATETIME | Fecha de actualización |

### Chat

Representa una sesión de conversación con la IA.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador único |
| `title` | STRING | Título del chat (primeras 50 chars de la primera pregunta) |
| `connectionId` | INTEGER FK | Conexión de BD asociada |
| `createdAt` | DATETIME | Fecha de creación |
| `updatedAt` | DATETIME | Fecha de actualización |

### Message

Almacena los mensajes individuales de cada chat.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Identificador único |
| `chatId` | INTEGER FK | Chat al que pertenece |
| `role` | ENUM('user', 'assistant') | Remitente del mensaje |
| `content` | TEXT | Contenido del mensaje |
| `sqlGenerated` | TEXT | SQL generado por la IA (solo mensajes del asistente) |
| `sqlExecuted` | TEXT | SQL realmente ejecutado |
| `connectionName` | STRING | Nombre de la conexión usada |
| `createdAt` | DATETIME | Fecha de creación |

### Relaciones

```
Chat 1:N Message (un chat tiene muchos mensajes)
Message N:1 Chat (un mensaje pertenece a un chat)
```

---

## API Endpoints

### Conexiones (`/api/connections`)

| Método | Ruta | Descripción | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/` | Listar todas las conexiones | - | `{ success: true, data: [...] }` |
| POST | `/` | Crear nueva conexión | `{ name, host, port, user, password, database, description }` | `{ success: true, data: {...} }` |
| PUT | `/:id` | Actualizar conexión | `{ name, host, port, user, password, database, description, isActive }` | `{ success: true, data: {...} }` |
| DELETE | `/:id` | Eliminar conexión | - | `{ success: true, message: '...' }` |
| POST | `/:id/test` | Probar conexión | - | `{ success: true, message: '...' }` |

### Chat (`/api/chat`)

| Método | Ruta | Descripción | Request | Response |
|--------|------|-------------|---------|----------|
| POST | `/` | Enviar pregunta | `{ question, historyId?, connectionId }` | `{ success: true, reply, sqlGenerated, sqlExecuted, historyId, rowCount }` |
| GET | `/` | Listar chats | - | `{ success: true, data: [...] }` |
| GET | `/:chatId/messages` | Obtener mensajes | - | `{ success: true, data: [...] }` |
| DELETE | `/:chatId` | Eliminar chat | - | `{ success: true, message: '...' }` |

### MCP Gateway (`/api/mcp`)

| Método | Ruta | Descripción | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/tools` | Listar herramientas MCP | - | `{ success: true, tools: [...] }` |
| POST | `/call` | Ejecutar herramienta | `{ tool, args }` | `{ success: true, data: {...} }` |

### Sistema (`/api/system`)

| Método | Ruta | Descripción | Response |
|--------|------|-------------|----------|
| GET | `/info` | Información del sistema | `{ success: true, aiProvider, model }` |

---

## Subsistema MCP

### Herramientas Disponibles

| Herramienta | Descripción | Parámetros |
|-------------|-------------|------------|
| `chatdb_list_connections` | Listar conexiones configuradas | - |
| `chatdb_create_connection` | Crear nueva conexión | `name`, `host`, `user`, `database`, `port?`, `password?`, `description?` |
| `chatdb_test_connection` | Probar conexión | `connectionId` |
| `chatdb_delete_connection` | Eliminar conexión | `connectionId` |
| `chatdb_get_connection_schema` | Obtener descripción del esquema | `connectionId` |
| `chatdb_query` | Ejecutar consulta SQL (solo lectura) | `connectionId`, `query`, `parameters?` |
| `chatdb_list_tables` | Listar tablas | `connectionId` |
| `chatdb_describe_table` | Describir estructura de tabla | `connectionId`, `table` |
| `chatdb_show_indexes` | Mostrar índices de tabla | `connectionId`, `table` |
| `chatdb_get_table_stats` | Obtener estadísticas de tabla | `connectionId`, `table` |

### Handlers

- **connection.js**: Gestión de conexiones (CRUD, test)
- **query.js**: Ejecución de consultas con validación
- **schema.js**: Inspección de esquema (tablas, columnas, índices)

### Dual Transport

1. **stdio**: Para clientes MCP nativos (VS Code, Claude Desktop)
   ```bash
   node backend/mcp/server.js
   ```

2. **HTTP Gateway**: Para uso desde el frontend web
   ```
   POST /api/mcp/call
   { "tool": "chatdb_list_tables", "args": { "connectionId": 1 } }
   ```

---

## Servicios

### aiService.js

Genera respuestas de IA usando el proveedor configurado.

```javascript
const aiService = require('./services/aiService');

const response = await aiService.generateResponse([
    { role: 'system', content: 'Eres un experto en MySQL...' },
    { role: 'user', content: '¿Cuántas ventas hubo hoy?' }
]);
```

**Soporta**:
- Ollama (local): Usa Axios para POST a `OLLAMA_URL`
- OpenRouter (cloud): Usa OpenAI SDK con `baseURL` de OpenRouter

### promptBuilder.js

Construye prompts para la IA.

| Método | Descripción |
|--------|-------------|
| `buildNaturalQueryPrompt(question, connectionId)` | Prompt para convertir lenguaje natural a SQL |
| `buildResultsInterpretationPrompt(question, sql, results)` | Prompt para interpretar resultados SQL |
| `buildGeneralChatPrompt(question, history)` | Prompt para chat general |

### sqlValidator.js

Validación estricta de SQL solo lectura.

```javascript
const validation = sqlValidator.validateReadOnly(sql);
// { isValid: true, cleanSQL: '...' }
// o
// { isValid: false, error: '...' }
```

**Permitido**: SELECT, SHOW, DESCRIBE, EXPLAIN, WITH
**Bloqueado**: INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE, REPLACE, multi-statements

### dbManager.js

Gestión de pools de conexiones MySQL.

```javascript
// Obtener o crear pool
const pool = await dbManager.getConnection(connectionId);

// Ejecutar query
const { rows, fields } = await dbManager.executeQuery(connectionId, sql);

// Probar conexión
const result = await dbManager.testConnection(dbConfig);

// Listar tablas
const tables = await dbManager.listTables(connectionId);

// Describir tabla
const columns = await dbManager.describeTable(connectionId, tableName);

// Limpiar pool
await dbManager.removePool(connectionId);
await dbManager.closeAll();
```

---

## Seguridad

### Validación SQL Multicapa

1. **Keyword inicial**: Solo SELECT, SHOW, DESCRIBE, EXPLAIN, WITH
2. **Bloqueo de escritura**: Detecta INSERT, UPDATE, DELETE, DROP, etc.
3. **Bloqueo multi-statement**: Solo una sentencia por query

### Enmascarado de Passwords

Las contraseñas nunca se devuelven en las respuestas API:

```javascript
const safeData = connections.map(c => {
    const data = c.toJSON();
    if (data.password) data.password = '********';
    return data;
});
```

### Solo Lectura

- Todas las consultas pasan por `sqlValidator.validateReadOnly()`
- MySQL pools se configuran con `multipleStatements: false`
- Se recomienda usar usuarios MySQL con permisos READ ONLY:

```sql
CREATE USER 'readonly'@'%' IDENTIFIED BY 'password';
GRANT SELECT, SHOW DATABASES, SHOW VIEW ON *.* TO 'readonly'@'%';
FLUSH PRIVILEGES;
```

---

## Scripts npm

```bash
# Iniciar servidor (producción)
npm start

# Iniciar con auto-reload (desarrollo)
npm run dev

# Inicializar base de datos
npm run seed
```

---

## Cómo Ejecutar

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tu configuración
```

### 3. Inicializar base de datos (opcional)

```bash
npm run seed
```

### 4. Iniciar servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

### 5. Acceder

- Aplicación web: http://localhost:3001
- API: http://localhost:3001/api/...

---

## Servidor MCP Standalone

Para usar con clientes MCP compatibles (VS Code, Claude Desktop):

```bash
node backend/mcp/server.js
```

El servidor se comunica via stdio siguiendo el protocolo MCP.
