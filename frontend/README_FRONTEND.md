# Frontend — MCP MySQL Explorer

Interfaz de usuario del explorador MCP MySQL. Aplicación SPA (Single Page Application) construida con Alpine.js, Bootstrap 5 y el componente Deep Chat para interactuar con la IA.

---

## Descripción General

El frontend proporciona una interfaz moderna y responsive para:
- Chatear con IA sobre bases de datos MySQL
- Gestionar múltiples conexiones de base de datos
- Visualizar historial de conversaciones
- Alternar entre temas claro y oscuro

---

## Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Alpine.js | 3.13.3 | Framework reactivo para la lógica de la aplicación |
| Bootstrap | 5.3.3 | Sistema de diseño y componentes UI |
| Bootstrap Icons | 1.11.3 | Iconografía |
| Deep Chat | 2.4.2 | Web component para el chat con IA (ES module via CDN) |
| Axios | latest | Cliente HTTP para llamadas API |
| SweetAlert2 | 11 | Modales y notificaciones toast |
| Inter | Google Fonts | Tipografía principal |

---

## Estructura de Archivos

```
frontend/
├── index.html              # Página principal SPA
├── package.json            # Dependencias npm (deep-chat)
├── README_FRONTEND.md      # Este archivo
├── deepchat_doc.md         # Documentación de Deep Chat
├── styles/
│   ├── base.css           # Variables CSS, tema, layout, componentes
│   └── mobile.css         # Overrides responsive para móviles
└── src/
    ├── mcp-explorer.js    # Controlador Alpine.js principal
    └── utils.js           # Utilidades globales (temas, toasts)
```

### Descripción de Archivos

- **index.html**: Estructura HTML de la aplicación con directivas Alpine.js
- **styles/base.css**: Variables CSS para temas dark/light, estilos de componentes, layout desktop
- **styles/mobile.css**: Media queries para responsive design (mobile, tablet)
- **src/mcp-explorer.js**: Lógica principal de la aplicación (estado, métodos, handlers)
- **src/utils.js**: Utilidades reutilizables (manejo de temas, configuración de SweetAlert2)

---

## Arquitectura

### SPA con Alpine.js

La aplicación utiliza Alpine.js para la reactividad sin necesidad de un framework pesado:

```javascript
// Controlador principal definido en mcp-explorer.js
window.mcpExplorerApp = function() {
    return {
        // Estado reactivo
        isSidebarOpen: false,
        activeTab: 'chat',
        connections: [],
        chats: [],
        theme: 'dark',
        
        // Métodos
        init() { /* inicialización */ },
        async loadConnections() { /* ... */ },
        // ...
    };
};
```

### Web Component Deep Chat

Deep Chat se carga como ES module y se configura programáticamente:

```html
<deep-chat 
    id="deep-chat-element"
    style="width:100%; height:100%; border:none;">
</deep-chat>
```

**Nota importante**: Deep Chat v2.4.2 es un ES module y debe cargarse con `type="module"`:

```html
<script type="module" src="https://unpkg.com/deep-chat@2.4.2/dist/deepChat.bundle.js"></script>
```

La configuración se realiza vía JavaScript (no Alpine bindings):

```javascript
chatElement.connect = {
    handler: async (body, signals) => {
        // Lógica de comunicación con el backend
        const res = await axios.post('/api/chat', { ... });
        signals.onResponse({ text: res.data.reply });
    }
};
```

### Sistema de Temas Dark/Light

Los temas se controlan mediante CSS variables y el atributo `data-bs-theme`:

```css
[data-bs-theme='dark'] {
    --bg-main: #0a0a0a;
    --bg-panel: #111111;
    --c-primary: #3b82f6;
    --c-text-1: #fafafa;
    /* ... */
}

[data-bs-theme='light'] {
    --bg-main: #fafafa;
    --bg-panel: #ffffff;
    --c-primary: #2563eb;
    --c-text-1: #18181b;
    /* ... */
}
```

El tema se persiste en `localStorage` con la clave `app-theme`.

---

## Componentes Principales

### Sidebar

- Logo y título de la aplicación
- Navegación entre tabs (Chat IA, Conexiones)
- Historial de chats recientes
- Botón de nuevo chat
- Toggle de tema

### Top Bar

- Selector de base de datos (dropdown pill)
- Botón de nuevo chat
- Toggle de tema (icono)
- Indicador del proveedor de IA (Ollama/OpenRouter)

### Chat Tab

- Integración con Deep Chat
- Área de mensajes con estilos personalizados
- Input de texto con placeholder "Pregunta sobre tus datos..."
- Visualización de SQL generado y filas afectadas

### Connections Tab

- Grid de tarjetas de conexiones
- Información: nombre, host:puerto/database, estado
- Botones: Probar conexión, Eliminar
- Botón para crear nueva conexión

### Modal de Conexión

Formulario para crear/editar conexiones:
- Nombre (requerido)
- Host (requerido)
- Puerto (default: 3306)
- Usuario (requerido)
- Contraseña
- Base de datos (requerida)
- Descripción del esquema (opcional, para contexto de IA)

---

## Integración con Deep Chat v2

### Carga del Componente

```html
<!-- En index.html -->
<script type="module" src="https://unpkg.com/deep-chat@2.4.2/dist/deepChat.bundle.js"></script>
```

### Configuración Programática

```javascript
setupDeepChatHandler() {
    const chatElement = document.getElementById('deep-chat-element');
    
    // Handler de conexión
    chatElement.connect = {
        handler: async (body, signals) => {
            const lastMessage = body.messages[body.messages.length - 1];
            const question = lastMessage?.text;
            
            const res = await axios.post('/api/chat', {
                question: question,
                historyId: this.currentChatId,
                connectionId: parseInt(this.selectedConnectionId)
            });
            
            signals.onResponse({
                text: res.data.reply,
                role: 'ai',
                custom: {
                    sqlGenerated: res.data.sqlGenerated,
                    sqlExecuted: res.data.sqlExecuted,
                    rowCount: res.data.rowCount
                }
            });
        }
    };
    
    // Estilos dinámicos según tema
    chatElement.messageStyles = this._getChatMessageStyles(isDark);
    chatElement.textInput = this._getChatTextInputConfig(isDark);
}
```

### Actualización Dinámica de Estilos

Al cambiar el tema, los estilos de Deep Chat se actualizan:

```javascript
toggleTheme() { 
    this.theme = UIUtils.toggleTheme(); 
    this.$nextTick(() => {
        const chatElement = document.getElementById('deep-chat-element');
        if (chatElement) {
            const isDark = this.theme === 'dark';
            chatElement.messageStyles = this._getChatMessageStyles(isDark);
            chatElement.textInput = this._getChatTextInputConfig(isDark);
            chatElement.refreshMessages();
        }
    });
}
```

---

## Integración con el Backend

### Endpoints Consumidos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/connections` | Listar conexiones activas |
| POST | `/api/connections` | Crear nueva conexión |
| POST | `/api/connections/:id/test` | Probar conexión |
| DELETE | `/api/connections/:id` | Eliminar conexión |
| GET | `/api/chat` | Listar chats |
| POST | `/api/chat` | Enviar pregunta a la IA |
| GET | `/api/chat/:id/messages` | Obtener mensajes de un chat |
| DELETE | `/api/chat/:id` | Eliminar chat |
| GET | `/api/system/info` | Información del sistema (proveedor IA) |

---

## Sistema de Temas

### Cómo Funciona

1. **Inicialización**: `UIUtils.initTheme()` lee `localStorage` o detecta preferencia del sistema
2. **Aplicación**: Se establece `data-bs-theme` en el elemento `<html>`
3. **CSS**: Las variables CSS responden al atributo para cambiar colores
4. **Persistencia**: `localStorage.setItem('app-theme', theme)`

### API de UIUtils

```javascript
UIUtils.initTheme()          // → 'dark' | 'light'
UIUtils.toggleTheme()        // → 'dark' | 'light'
UIUtils.getSwalConfig()      // → configuración SweetAlert2 según tema
UIUtils.showToast(msg, icon) // → muestra notificación toast
```

### Variables CSS por Tema

| Variable | Dark | Light | Uso |
|----------|------|-------|-----|
| `--bg-main` | `#0a0a0a` | `#fafafa` | Fondo principal |
| `--bg-panel` | `#111111` | `#ffffff` | Sidebar, paneles |
| `--bg-darker` | `#1a1a1a` | `#f4f4f5` | Cards, inputs |
| `--c-primary` | `#3b82f6` | `#2563eb` | Acento principal |
| `--c-text-1` | `#fafafa` | `#18181b` | Texto principal |
| `--c-text-2` | `#a1a1aa` | `#52525b` | Texto secundario |
| `--c-border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Bordes |

---

## Responsive Design

### Breakpoints

| Breakpoint | Ancho | Comportamiento |
|------------|-------|----------------|
| Mobile | `< 768px` | Sidebar oculto, header móvil fijo, botón hamburguesa |
| Tablet | `768px - 991px` | Sidebar 260px, layout adaptativo |
| Desktop | `> 992px` | Sidebar 280px, layout completo |

### Mobile (`< 768px`)

- Header fijo en la parte superior con logo y botón menú
- Sidebar oculto por defecto, se muestra con overlay al hacer clic
- Overlay semitransparente para cerrar al tocar fuera
- Chat ocupa toda la pantalla disponible
- Modal de conexión en pantalla completa

### Tablet (`768px - 991px`)

- Sidebar visible con ancho reducido (260px)
- Contenido principal se adapta al espacio restante
- Selector de BD con ancho máximo limitado

### Desktop (`> 992px`)

- Sidebar de 280px fijo a la izquierda
- Layout de dos columnas optimizado
- Cards de conexiones en grid de 3 columnas
- Máximo aprovechamiento del espacio

---

## Scripts npm

```bash
# Servir frontend (desarrollo independiente)
npm start
```

**Nota**: En producción, el backend sirve el frontend estáticamente desde `../frontend`.

---

## Reglas de Mantenimiento

1. **Siempre usar variables CSS** para colores, nunca valores hex directos
2. **No duplicar lógica** de temas/toasts → Usar `UIUtils`
3. **No agregar `data-bs-theme` fijo** en HTML → Se gestiona vía JS
4. **Deep Chat se configura vía JS**, no con atributos Alpine
5. **Toda propiedad visual** debe usar clases CSS, evitar estilos inline
