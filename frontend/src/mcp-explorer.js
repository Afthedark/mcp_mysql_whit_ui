
window.mcpExplorerApp = function() {
    return {
        // UI State
        isSidebarOpen: false,
        isLoading: false,
        currentChatId: null,
        theme: 'dark',
        activeTab: 'chat',
        showConnModal: false,

        // Data
        connections: [],
        chats: [],
        messages: [],
        systemInfo: { aiProvider: '...', model: '...' },
        
        // Agent Context
        agentContext: {
            isActive: true,
            lastTopic: null,
            recentTables: [],
            suggestions: []
        },
        
        // Agent Config
        agentConfigTab: 'schema',
        agentConfigData: {
            connectionIds: [],  // Ahora es un array
            schemaDescription: '',
            tables: [],
            personality: {
                name: 'DataBot',
                tone: 'professional',
                responseStyle: 'detailed',
                greeting: '',
                specialInstructions: ''
            },
            businessContext: {
                description: '',
                terms: '',
                kpis: '',
                commonQueries: ''
            },
            mcpPreferences: {
                preferredTools: ['chatdb_query'],
                autoSuggest: true
            },
            sqlExamples: []  // Nuevo: ejemplos SQL
        },

        // SQL Examples Form
        newSqlExample: {
            description: '',
            question: '',
            sql: '',
            explanation: ''
        },
        editingSqlIndex: null,
        editingSqlExample: {
            description: '',
            question: '',
            sql: '',
            explanation: ''
        },

        // Form
        selectedConnectionId: '',
        newConn: { name: '', host: 'localhost', port: 3306, user: '', password: '', database: '', description: '' },



        _getChatMessageStyles(isDark) {
            return {
                default: {
                    user: {
                        bubble: {
                            backgroundColor: isDark ? '#3b82f6' : '#2563eb',
                            color: '#ffffff',
                            borderRadius: '1rem',
                            padding: '0.75rem 1rem',
                            maxWidth: '85%'
                        },
                        outerContainer: {
                            justifyContent: 'flex-end'
                        }
                    },
                    ai: {
                        bubble: {
                            backgroundColor: isDark ? '#1a1a1a' : '#f4f4f5',
                            color: isDark ? '#fafafa' : '#18181b',
                            borderRadius: '1rem',
                            padding: '0.75rem 1rem',
                            maxWidth: '85%'
                        },
                        outerContainer: {
                            justifyContent: 'flex-start'
                        }
                    }
                }
            };
        },

        _getChatTextInputConfig(isDark) {
            return {
                styles: {
                    container: {
                        backgroundColor: isDark ? '#1a1a1a' : '#f4f4f5',
                        border: `1px solid ${isDark ? '#333' : '#d4d4d8'}`,
                        borderRadius: '10px'
                    },
                    text: {
                        color: isDark ? '#fafafa' : '#18181b',
                        fontSize: '0.9375rem'
                    }
                },
                placeholder: {
                    text: 'Pregunta sobre tus datos...'
                }
            };
        },

        async init() {
            console.log('🚀 MCP MySQL Explorer Initialized');
            
            // Ensure modal is closed on init
            this.showConnModal = false;
            
            await this.loadConnections();
            await this.loadChats();
            await this.loadSystemInfo();
            this.theme = UIUtils.initTheme();

            // Setup Deep Chat handler after component is ready
            this.$nextTick(() => {
                // Wait for Deep Chat custom element to be defined
                const initDeepChat = () => {
                    this.setupDeepChatHandler();
                    const lastChat = localStorage.getItem('last_chat_id');
                    if (lastChat) this.loadMessages(parseInt(lastChat));
                };
                
                // Check if custom element is already defined
                if (customElements.get('deep-chat')) {
                    initDeepChat();
                } else {
                    // Wait for custom element to be defined
                    customElements.whenDefined('deep-chat').then(initDeepChat);
                }
            });
        },

        setupDeepChatHandler() {
            const chatElement = document.getElementById('deep-chat-element');
            if (!chatElement) {
                console.error('Deep Chat element not found');
                return;
            }

            const isDark = this.theme === 'dark';

            // Set connect handler
            chatElement.connect = {
                handler: async (body, signals) => {
                    console.log('Deep Chat body:', body);
                    console.log('Deep Chat messages:', body.messages);
                    
                    // Handle different message formats
                    let lastMessage = null;
                    let question = null;
                    
                    if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
                        lastMessage = body.messages[body.messages.length - 1];
                        // Deep Chat may use 'text' or 'content' property
                        question = lastMessage?.text || lastMessage?.content;
                    }
                    
                    console.log('Extracted question:', question);
                    console.log('Selected connection:', this.selectedConnectionId);

                    if (!question || !this.selectedConnectionId) {
                        signals.onResponse({ 
                            error: !this.selectedConnectionId 
                                ? 'Please select a database connection first' 
                                : 'Question cannot be empty' 
                        });
                        return;
                    }

                    // Trim and validate question
                    const trimmedQuestion = question.trim();
                    if (!trimmedQuestion) {
                        signals.onResponse({ error: 'Question cannot be empty' });
                        return;
                    }

                    try {
                        console.log('Sending to API:', {
                            question: trimmedQuestion,
                            connectionId: this.selectedConnectionId,
                            agentMode: this.agentContext.isActive
                        });
                        
                        const res = await axios.post('/api/chat', {
                            question: trimmedQuestion,
                            historyId: this.currentChatId,
                            connectionId: parseInt(this.selectedConnectionId),
                            agentMode: this.agentContext.isActive
                        });

                        if (res.data.success) {
                            if (!this.currentChatId) {
                                this.currentChatId = res.data.historyId;
                                localStorage.setItem('last_chat_id', this.currentChatId);
                                this.chats.unshift({ 
                                    id: this.currentChatId, 
                                    title: question.substring(0, 50), 
                                    connectionId: parseInt(this.selectedConnectionId) 
                                });
                            }

                            // Update agent context
                            if (res.data.agentContext) {
                                this.agentContext.lastTopic = res.data.agentContext.topic || this.agentContext.lastTopic;
                            }
                            if (res.data.suggestions) {
                                this.agentContext.suggestions = res.data.suggestions;
                            }

                            // Build response with SQL details and suggestions
                            let responseText = res.data.reply;
                            
                            // Add suggestions if available
                            if (res.data.suggestions && res.data.suggestions.length > 0) {
                                responseText += '\n\n💡 *Sugerencias:*\n';
                                res.data.suggestions.forEach((suggestion, index) => {
                                    responseText += `${index + 1}. ${suggestion}\n`;
                                });
                            }
                            
                            signals.onResponse({
                                text: responseText,
                                role: 'ai',
                                custom: {
                                    sqlGenerated: res.data.sqlGenerated,
                                    sqlExecuted: res.data.sqlExecuted,
                                    rowCount: res.data.rowCount,
                                    suggestions: res.data.suggestions,
                                    isFollowUp: res.data.agentContext?.isFollowUp
                                }
                            });

                            await this.loadChats();
                        }
                    } catch (error) {
                        const errMsg = error.response?.data?.message || 'Error processing query';
                        signals.onResponse({ error: errMsg });
                        UIUtils.showToast(errMsg, 'error');
                    }
                }
            };

            // Set message styles
            chatElement.messageStyles = this._getChatMessageStyles(isDark);

            // Set text input styles
            chatElement.textInput = this._getChatTextInputConfig(isDark);

            console.log('Deep Chat handler configured successfully');
        },

        toggleTheme() { 
            this.theme = UIUtils.toggleTheme(); 
            // Update Deep Chat styles dynamically
            this.$nextTick(() => {
                const chatElement = document.getElementById('deep-chat-element');
                if (chatElement) {
                    const isDark = this.theme === 'dark';
                    chatElement.messageStyles = this._getChatMessageStyles(isDark);
                    chatElement.textInput = this._getChatTextInputConfig(isDark);
                    chatElement.refreshMessages();
                }
            });
        },

        // --- Connections ---
        async loadConnections() {
            try {
                const res = await axios.get('/api/connections');
                if (res.data.success) this.connections = res.data.data.filter(c => c.isActive);
            } catch (e) { console.error('Error loading connections:', e); }
        },

        openConnModal() {
            console.log('Opening connection modal...');
            // Reset form with default values
            this.newConn = { name: '', host: 'localhost', port: 3306, user: '', password: '', database: '', description: '' };
            this.showConnModal = true;
            console.log('Modal should be visible now:', this.showConnModal);
        },

        async saveConnection() {
            console.log('Saving connection:', this.newConn);
            
            if (!this.newConn.name || !this.newConn.host || !this.newConn.user || !this.newConn.database) {
                return UIUtils.showToast('Completa los campos requeridos', 'warning');
            }
            
            // Validate port number
            const portNum = parseInt(this.newConn.port) || 3306;
            if (portNum < 1 || portNum > 65535) {
                return UIUtils.showToast('El puerto debe estar entre 1 y 65535', 'warning');
            }
            
            // Ensure port is a number
            const payload = {
                ...this.newConn,
                port: portNum
            };
            
            try {
                console.log('Sending POST to /api/connections...');
                const res = await axios.post('/api/connections', payload);
                console.log('Response:', res.data);
                
                if (res.data.success) {
                    this.showConnModal = false;
                    await this.$nextTick();
                    this.newConn = { name: '', host: 'localhost', port: 3306, user: '', password: '', database: '', description: '' };
                    await this.loadConnections();
                    UIUtils.showToast('Conexión creada exitosamente', 'success');
                }
            } catch (e) { 
                console.error('Error saving connection:', e);
                console.error('Response:', e.response);
                UIUtils.showToast(e.response?.data?.message || 'Error creando conexión', 'error'); 
            }
        },

        async testConnection(id) {
            try {
                const res = await axios.post(`/api/connections/${id}/test`);
                UIUtils.showToast(res.data.message || 'Conexión exitosa', 'success');
            } catch (e) { UIUtils.showToast(e.response?.data?.message || 'Error de conexión', 'error'); }
        },

        async deleteConnection(id) {
            const confirmed = await Swal.fire({ title: '¿Eliminar conexión?', icon: 'warning', showCancelButton: true, ...UIUtils.getSwalConfig() });
            if (!confirmed.isConfirmed) return;
            try {
                await axios.delete(`/api/connections/${id}`);
                await this.loadConnections();
                UIUtils.showToast('Conexión eliminada', 'success');
            } catch (e) { UIUtils.showToast('Error eliminando conexión', 'error'); }
        },

        // --- Chat ---
        async loadChats() {
            try {
                const res = await axios.get('/api/chat');
                if (res.data.success) this.chats = res.data.data;
            } catch (e) { console.error('Error loading chats:', e); }
        },

        async loadMessages(chatId) {
            try {
                this.currentChatId = chatId;
                localStorage.setItem('last_chat_id', chatId);
                const res = await axios.get(`/api/chat/${chatId}/messages`);
                if (res.data.success) {
                    this.messages = res.data.data;
                    
                    // Load messages into Deep Chat
                    const chatElement = document.getElementById('deep-chat-element');
                    if (chatElement) {
                        const history = res.data.data.map(msg => ({
                            role: msg.role === 'user' ? 'user' : 'ai',
                            text: msg.content
                        }));
                        // Clear and reload
                        chatElement.clearMessages(true);
                        history.forEach(msg => chatElement.addMessage(msg));
                    }
                }

                const chatObj = this.chats.find(c => c.id == chatId);
                if (chatObj && chatObj.connectionId) this.selectedConnectionId = chatObj.connectionId.toString();
            } catch (e) { console.error('Error loading messages:', e); }
        },

        async newChat() {
            this.currentChatId = null;
            this.messages = [];
            localStorage.removeItem('last_chat_id');
            this.selectedConnectionId = '';
            this.isLoading = false;
            
            // Reset agent context
            this.agentContext = {
                isActive: true,
                lastTopic: null,
                recentTables: [],
                suggestions: []
            };
            
            // Clear Deep Chat messages
            const chatElement = document.getElementById('deep-chat-element');
            if (chatElement) {
                chatElement.clearMessages(true);
            }
            
            await this.loadChats();
        },

        toggleAgentMode() {
            this.agentContext.isActive = !this.agentContext.isActive;
            const status = this.agentContext.isActive ? 'activado' : 'desactivado';
            UIUtils.showToast(`Modo Agente ${status}`, 'info');
        },

        useSuggestion(suggestion) {
            const chatElement = document.getElementById('deep-chat-element');
            if (chatElement) {
                // Add suggestion as user message
                chatElement.addMessage({
                    role: 'user',
                    text: suggestion
                });
                // Trigger send
                chatElement.sendMessage();
            }
        },

        // --- Agent Config ---
        async loadAgentConfig() {
            // Cargar usando la primera conexión seleccionada
            const primaryConnectionId = this.agentConfigData.connectionIds[0];
            if (!primaryConnectionId) return;
            
            try {
                const res = await axios.get(`/api/agent-config/connection/${primaryConnectionId}/default`);
                if (res.data.success) {
                    if (res.data.data) {
                        // Load existing config
                        const config = res.data.data;
                        // Actualizar connectionIds con los de la config encontrada
                        this.agentConfigData.connectionIds = config.connectionIds || [primaryConnectionId];
                        this.agentConfigData.schemaDescription = config.schemaDefinition?.description || '';
                        this.agentConfigData.tables = config.schemaDefinition?.tables || [];
                        this.agentConfigData.personality = config.personality || this.agentConfigData.personality;
                        this.agentConfigData.sqlExamples = config.sqlExamples || [];
                        this.agentConfigData.businessContext = {
                            description: config.businessContext || '',
                            terms: '',
                            kpis: '',
                            commonQueries: ''
                        };
                        if (config.businessContext) {
                            // Try to parse structured business context
                            const lines = config.businessContext.split('\n');
                            let currentSection = 'description';
                            lines.forEach(line => {
                                if (line.includes('Términos:')) currentSection = 'terms';
                                else if (line.includes('KPIs:')) currentSection = 'kpis';
                                else if (line.includes('Consultas:')) currentSection = 'commonQueries';
                                else if (line.trim()) {
                                    this.agentConfigData.businessContext[currentSection] += line + '\n';
                                }
                            });
                        }
                    } else if (res.data.defaultTemplate) {
                        // Load default template
                        const defaultConfig = res.data.defaultTemplate;
                        this.agentConfigData.tables = defaultConfig.schemaDefinition?.tables || [];
                        this.agentConfigData.personality = defaultConfig.personality;
                        this.agentConfigData.businessContext = {
                            description: '',
                            terms: '',
                            kpis: '',
                            commonQueries: ''
                        };
                        // Set greeting with connection name
                        const conn = this.connections.find(c => c.id == primaryConnectionId);
                        if (conn) {
                            this.agentConfigData.personality.greeting = `¡Hola! Soy tu asistente de datos para ${conn.name}.`;
                        }
                    }
                }
            } catch (e) {
                console.error('Error loading agent config:', e);
                UIUtils.showToast('Error cargando configuración', 'error');
            }
        },

        async saveAgentConfig() {
            if (this.agentConfigData.connectionIds.length === 0) {
                UIUtils.showToast('Selecciona al menos una conexión primero', 'warning');
                return;
            }

            try {
                // Build business context string
                const businessContextStr = [
                    this.agentConfigData.businessContext.description,
                    '\nTérminos:\n',
                    this.agentConfigData.businessContext.terms,
                    '\nKPIs:\n',
                    this.agentConfigData.businessContext.kpis,
                    '\nConsultas:\n',
                    this.agentConfigData.businessContext.commonQueries
                ].join('');

                const configData = {
                    connectionIds: this.agentConfigData.connectionIds,
                    schemaDefinition: {
                        description: this.agentConfigData.schemaDescription,
                        tables: this.agentConfigData.tables
                    },
                    personality: this.agentConfigData.personality,
                    businessContext: businessContextStr,
                    mcpPreferences: this.agentConfigData.mcpPreferences,
                    sqlExamples: this.agentConfigData.sqlExamples
                };

                // Check if config exists (usando la primera conexión)
                const primaryConnectionId = this.agentConfigData.connectionIds[0];
                const existingRes = await axios.get(`/api/agent-config/connection/${primaryConnectionId}`);
                let res;
                
                if (existingRes.data.data) {
                    // Update existing
                    res = await axios.put(`/api/agent-config/${existingRes.data.data.id}`, configData);
                } else {
                    // Create new
                    res = await axios.post('/api/agent-config', configData);
                }

                if (res.data.success) {
                    UIUtils.showToast(`Configuración guardada para ${this.agentConfigData.connectionIds.length} conexion(es)`, 'success');
                }
            } catch (e) {
                console.error('Error saving agent config:', e);
                UIUtils.showToast(e.response?.data?.message || 'Error guardando configuración', 'error');
            }
        },

        addTable() {
            this.agentConfigData.tables.push({
                name: '',
                description: '',
                columns: []
            });
        },

        removeTable(index) {
            this.agentConfigData.tables.splice(index, 1);
        },

        addColumn(tableIndex) {
            this.agentConfigData.tables[tableIndex].columns.push({
                name: '',
                type: '',
                description: '',
                pk: false
            });
        },

        removeColumn(tableIndex, colIndex) {
            this.agentConfigData.tables[tableIndex].columns.splice(colIndex, 1);
        },

        // --- Multi-DB Config Functions ---
        
        // Agregar conexión a la lista de seleccionadas
        addConnection(connectionId) {
            if (!connectionId) return;
            const id = parseInt(connectionId);
            if (!this.agentConfigData.connectionIds.includes(id)) {
                this.agentConfigData.connectionIds.push(id);
                // Si es la primera conexión, cargar su config
                if (this.agentConfigData.connectionIds.length === 1) {
                    this.loadAgentConfig();
                }
            }
        },
        
        // Quitar conexión de la lista
        removeConnection(connectionId) {
            this.agentConfigData.connectionIds = this.agentConfigData.connectionIds.filter(id => id !== connectionId);
        },
        
        // Obtener nombre de conexión por ID
        getConnectionName(connectionId) {
            const conn = this.connections.find(c => c.id === connectionId);
            return conn ? conn.name : 'Desconocida';
        },
        
        // Obtener nombre de BD de la primera conexión seleccionada
        getCurrentDatabaseName() {
            const firstId = this.agentConfigData.connectionIds[0];
            if (!firstId) return '';
            const conn = this.connections.find(c => c.id === firstId);
            return conn ? conn.database : '';
        },
        
        // Conexiones disponibles (no seleccionadas y sin config existente)
        get availableConnectionsForConfig() {
            return this.connections.filter(conn => {
                // No mostrar si ya está seleccionada
                if (this.agentConfigData.connectionIds.includes(conn.id)) return false;
                // No mostrar si ya tiene otra config asignada
                return true;
            });
        },
        
        // Conexiones con el mismo nombre de BD que la primera seleccionada
        get connectionsWithSameDatabase() {
            const firstId = this.agentConfigData.connectionIds[0];
            if (!firstId) return [];
            const firstConn = this.connections.find(c => c.id === firstId);
            if (!firstConn) return [];
            return this.connections.filter(c => c.database === firstConn.database);
        },
        
        // Seleccionar todas las conexiones con el mismo nombre de BD
        selectAllSameDatabase() {
            const dbName = this.getCurrentDatabaseName();
            if (!dbName) return;
            
            this.connections.forEach(conn => {
                if (conn.database === dbName && !this.agentConfigData.connectionIds.includes(conn.id)) {
                    this.agentConfigData.connectionIds.push(conn.id);
                }
            });
        },

        async deleteChat(id) {
            const confirmed = await Swal.fire({ title: '¿Eliminar chat?', icon: 'warning', showCancelButton: true, ...UIUtils.getSwalConfig() });
            if (!confirmed.isConfirmed) return;
            try {
                await axios.delete(`/api/chat/${id}`);
                if (this.currentChatId === id) this.newChat();
                await this.loadChats();
                UIUtils.showToast('Chat eliminado', 'success');
            } catch (e) { UIUtils.showToast('Error eliminando chat', 'error'); }
        },

        // --- SQL Examples Functions ---
        
        addSqlExample() {
            if (!this.newSqlExample.description || !this.newSqlExample.question || !this.newSqlExample.sql) {
                UIUtils.showToast('Completa todos los campos requeridos', 'warning');
                return;
            }
            
            this.agentConfigData.sqlExamples.push({
                description: this.newSqlExample.description,
                question: this.newSqlExample.question,
                sql: this.newSqlExample.sql,
                explanation: this.newSqlExample.explanation,
                expanded: false
            });
            
            // Limpiar formulario
            this.newSqlExample = {
                description: '',
                question: '',
                sql: '',
                explanation: ''
            };
            
            UIUtils.showToast('Ejemplo agregado', 'success');
        },
        
        editSqlExample(index) {
            this.editingSqlIndex = index;
            const example = this.agentConfigData.sqlExamples[index];
            this.editingSqlExample = {
                description: example.description,
                question: example.question,
                sql: example.sql,
                explanation: example.explanation || ''
            };
        },
        
        updateSqlExample() {
            if (this.editingSqlIndex === null) return;
            
            if (!this.editingSqlExample.description || !this.editingSqlExample.question || !this.editingSqlExample.sql) {
                UIUtils.showToast('Completa todos los campos requeridos', 'warning');
                return;
            }
            
            this.agentConfigData.sqlExamples[this.editingSqlIndex] = {
                ...this.agentConfigData.sqlExamples[this.editingSqlIndex],
                description: this.editingSqlExample.description,
                question: this.editingSqlExample.question,
                sql: this.editingSqlExample.sql,
                explanation: this.editingSqlExample.explanation
            };
            
            this.editingSqlIndex = null;
            this.editingSqlExample = {
                description: '',
                question: '',
                sql: '',
                explanation: ''
            };
            
            UIUtils.showToast('Ejemplo actualizado', 'success');
        },
        
        cancelEditSqlExample() {
            this.editingSqlIndex = null;
            this.editingSqlExample = {
                description: '',
                question: '',
                sql: '',
                explanation: ''
            };
        },
        
        deleteSqlExample(index) {
            Swal.fire({
                title: '¿Eliminar ejemplo?',
                text: 'Esta acción no se puede deshacer',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                ...UIUtils.getSwalConfig()
            }).then((result) => {
                if (result.isConfirmed) {
                    this.agentConfigData.sqlExamples.splice(index, 1);
                    UIUtils.showToast('Ejemplo eliminado', 'success');
                }
            });
        },
        
        clearAllSqlExamples() {
            Swal.fire({
                title: '¿Eliminar todos los ejemplos?',
                text: `Se eliminarán ${this.agentConfigData.sqlExamples.length} ejemplos. Esta acción no se puede deshacer.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar todos',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#dc3545',
                ...UIUtils.getSwalConfig()
            }).then((result) => {
                if (result.isConfirmed) {
                    this.agentConfigData.sqlExamples = [];
                    UIUtils.showToast('Todos los ejemplos han sido eliminados', 'success');
                }
            });
        },

        async loadSystemInfo() {
            try {
                const res = await axios.get('/api/system/info');
                if (res.data.success) this.systemInfo = res.data;
            } catch (e) { /* ignore */ }
        },

        scrollToBottom() {
            const chatElement = document.getElementById('deep-chat-element');
            if (chatElement) {
                chatElement.scrollToBottom();
            }
        }
    };
};
