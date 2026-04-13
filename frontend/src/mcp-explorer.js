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
                    const lastMessage = body.messages[body.messages.length - 1];
                    const question = lastMessage?.text;

                    if (!question || !this.selectedConnectionId) {
                        signals.onResponse({ 
                            error: this.selectedConnectionId 
                                ? 'Please select a database connection first' 
                                : 'Question cannot be empty' 
                        });
                        return;
                    }

                    try {
                        const res = await axios.post('/api/chat', {
                            question: question,
                            historyId: this.currentChatId,
                            connectionId: parseInt(this.selectedConnectionId)
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

                            // Build response with SQL details
                            let responseText = res.data.reply;
                            
                            signals.onResponse({
                                text: responseText,
                                role: 'ai',
                                custom: {
                                    sqlGenerated: res.data.sqlGenerated,
                                    sqlExecuted: res.data.sqlExecuted,
                                    rowCount: res.data.rowCount
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
            
            // Clear Deep Chat messages
            const chatElement = document.getElementById('deep-chat-element');
            if (chatElement) {
                chatElement.clearMessages(true);
            }
            
            await this.loadChats();
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
