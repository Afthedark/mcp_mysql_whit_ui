const { Chat, Message, DatabaseConnection } = require('../models');
const aiService = require('../services/aiService');
const sqlValidator = require('../services/sqlValidator');
const dbManager = require('../services/dbManager');
const promptBuilder = require('../services/promptBuilder');
const { AppError } = require('../middleware/errorHandler');

/**
 * Main chat handler: natural language → SQL → execute → interpret
 */
const handleChat = async (req, res, next) => {
    try {
        const { question, historyId, connectionId } = req.body;

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

        // Save user message
        await Message.create({ chatId: parseInt(currentChatId), role: 'user', content: question });

        // Get history for context
        const history = await Message.findAll({
            where: { chatId: currentChatId },
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        // Build natural query prompt
        const { systemPrompt, userPrompt } = await promptBuilder.buildNaturalQueryPrompt(question, connectionId);

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

        // Interpret results with AI
        let finalReply;
        try {
            const { systemPrompt: busSystem, userPrompt: busUser } = await promptBuilder.buildResultsInterpretationPrompt(question, cleanSQL, queryResults);
            finalReply = await aiService.generateResponse([
                { role: 'system', content: busSystem },
                { role: 'user', content: busUser }
            ]);
        } catch (error) {
            finalReply = `Datos recuperados correctamente (${queryResults.length} filas).`;
        }

        // Save assistant message
        await Message.create({
            chatId: parseInt(currentChatId),
            role: 'assistant',
            content: finalReply,
            sqlGenerated: cleanSQL,
            sqlExecuted: cleanSQL,
            connectionName: dbConfig.name
        });

        res.json({
            success: true,
            reply: finalReply,
            sqlGenerated: cleanSQL,
            sqlExecuted: cleanSQL,
            historyId: parseInt(currentChatId),
            rowCount: queryResults.length
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
 * Delete a chat
 */
const deleteChat = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat.findByPk(chatId);
        if (!chat) throw new AppError('Chat not found', 404);
        await chat.destroy();
        res.json({ success: true, message: 'Chat deleted' });
    } catch (error) { next(error); }
};

module.exports = { handleChat, getChats, getChatMessages, deleteChat };
