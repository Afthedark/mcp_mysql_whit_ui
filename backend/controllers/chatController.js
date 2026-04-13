const { Chat, Message, DatabaseConnection } = require('../models');
const aiService = require('../services/aiService');
const sqlValidator = require('../services/sqlValidator');
const dbManager = require('../services/dbManager');
const promptBuilder = require('../services/promptBuilder');
const agentContext = require('../services/agentContextService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Main chat handler: natural language → SQL → execute → interpret
 * Now with Agent Memory and Context
 */
const handleChat = async (req, res, next) => {
    try {
        const { question, historyId, connectionId, agentMode = true } = req.body;

        if (!question) throw new AppError('Question cannot be empty', 400);
        if (!connectionId) throw new AppError('You must select a database connection', 400);

        const dbConfig = await DatabaseConnection.findByPk(connectionId);
        if (!dbConfig || !dbConfig.isActive) throw new AppError('Invalid or inactive database connection', 400);

        // Create or get chat
        let currentChatId = historyId;
        if (!currentChatId) {
            const title = question.substring(0, 50) + (question.length > 50 ? '...' : '');
            const newChat = await Chat.create({ title, connectionId });
            currentChatId = newChat.id;
        }

        // Build agent context (for memory and follow-up detection)
        const context = await agentContext.buildContext(currentChatId, connectionId);
        
        // Enrich question with context if it's a follow-up
        const enriched = agentContext.enrichQuestionWithContext(question, context);
        const questionToProcess = enriched.question;

        // Save user message
        await Message.create({ 
            chatId: parseInt(currentChatId), 
            role: 'user', 
            content: question,
            contextSnapshot: agentContext.createContextSnapshot(context)
        });

        // Build prompt with agent context if enabled
        let systemPrompt, userPrompt;
        if (agentMode) {
            const promptResult = await promptBuilder.buildAgentQueryPrompt(questionToProcess, {
                ...context,
                enriched
            });
            systemPrompt = promptResult.systemPrompt;
            userPrompt = promptResult.userPrompt;
        } else {
            const promptResult = await promptBuilder.buildNaturalQueryPrompt(questionToProcess, connectionId);
            systemPrompt = promptResult.systemPrompt;
            userPrompt = promptResult.userPrompt;
        }

        // Generate SQL
        let generatedSQL;
        try {
            generatedSQL = await aiService.generateResponse([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]);
            generatedSQL = generatedSQL.trim().replace(/```sql\s*/g, '').replace(/```\s*/g, '').trim();
        } catch (error) {
            throw new AppError('AI failed to generate SQL', 500);
        }

        console.log('=== Generated SQL ===');
        console.log(generatedSQL);
        console.log('=====================');

        // Validate SQL (read-only only)
        const validation = sqlValidator.validateReadOnly(generatedSQL);
        if (!validation.isValid) {
            const reply = `⚠️ No puedo ejecutar: ${validation.error}`;
            await Message.create({ chatId: parseInt(currentChatId), role: 'assistant', content: reply, sqlGenerated: generatedSQL });
            return res.json({ success: true, reply, sqlGenerated: generatedSQL, historyId: parseInt(currentChatId) });
        }

        const cleanSQL = validation.cleanSQL;

        // Execute query
        let queryResults;
        try {
            const executed = await dbManager.executeQuery(connectionId, cleanSQL);
            queryResults = executed.rows;
        } catch (error) {
            const errorMsg = `🔥 Database error: ${error.message}`;
            await Message.create({ chatId: parseInt(currentChatId), role: 'assistant', content: errorMsg, sqlGenerated: cleanSQL, sqlExecuted: cleanSQL, connectionName: dbConfig.name });
            return res.json({ success: true, reply: errorMsg, sqlGenerated: cleanSQL, sqlExecuted: cleanSQL, historyId: parseInt(currentChatId) });
        }

        // Extract metadata for memory
        const metadata = agentContext.extractMetadata(question, cleanSQL, queryResults);

        // Interpret results with AI (using agent mode if enabled)
        let finalReply;
        try {
            let interpretationPrompt;
            if (agentMode) {
                interpretationPrompt = await promptBuilder.buildAgentInterpretationPrompt(question, cleanSQL, queryResults, context);
            } else {
                interpretationPrompt = await promptBuilder.buildResultsInterpretationPrompt(question, cleanSQL, queryResults);
            }
            finalReply = await aiService.generateResponse([
                { role: 'system', content: interpretationPrompt.systemPrompt },
                { role: 'user', content: interpretationPrompt.userPrompt }
            ]);
        } catch (error) {
            finalReply = `Datos recuperados correctamente (${queryResults.length} filas).`;
        }

        // Generate suggestions for next questions
        const suggestions = agentMode ? agentContext.generateSuggestions(context, metadata) : [];

        // Save assistant message with metadata
        await Message.create({
            chatId: parseInt(currentChatId),
            role: 'assistant',
            content: finalReply,
            sqlGenerated: cleanSQL,
            sqlExecuted: cleanSQL,
            connectionName: dbConfig.name,
            metadata: metadata,
            contextSnapshot: agentContext.createContextSnapshot({
                ...context,
                lastTopic: metadata.topic || context.lastTopic
            })
        });

        res.json({
            success: true,
            reply: finalReply,
            sqlGenerated: cleanSQL,
            sqlExecuted: cleanSQL,
            historyId: parseInt(currentChatId),
            rowCount: queryResults.length,
            suggestions: suggestions,
            agentContext: {
                isFollowUp: enriched.isFollowUp,
                topic: metadata.topic,
                enriched: enriched.enriched
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * List all chats
 */
const getChats = async (req, res, next) => {
    try {
        const chats = await Chat.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, data: chats });
    } catch (error) { next(error); }
};

/**
 * Get chat messages
 */
const getChatMessages = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const messages = await Message.findAll({ where: { chatId }, order: [['createdAt', 'ASC']] });
        res.json({ success: true, data: messages });
    } catch (error) { next(error); }
};

/**
 * Delete a chat and its messages
 */
const deleteChat = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat.findByPk(chatId);
        if (!chat) throw new AppError('Chat not found', 404);
        
        // Delete associated messages first (SQLite FK constraint workaround)
        await Message.destroy({ where: { chatId } });
        
        // Now delete the chat
        await chat.destroy();
        res.json({ success: true, message: 'Chat deleted' });
    } catch (error) { next(error); }
};

module.exports = { handleChat, getChats, getChatMessages, deleteChat };
