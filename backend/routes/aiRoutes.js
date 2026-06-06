const express = require('express');
const router = express.Router();
const { getAIResponse, validateAIResponse } = require('../controllers/groqController');
const { logAuditEvent } = require('../controllers/discordController');
const { requiresConfirmation } = require('../middleware/serverSecurity');
const { supabaseAdmin } = require('../supabaseClient');

// POST /api/ai/process
router.post('/process', async (req, res) => {
  const { prompt, guildId, userId } = req.body;

  // Validation
  if (!prompt || !guildId || !userId) {
    return res.status(400).json({
      error: 'Missing required fields: prompt, guildId, userId'
    });
  }

  if (prompt.length > 500) {
    return res.status(400).json({
      error: 'Prompt too long (max 500 characters)'
    });
  }

  try {
    // Get server details
    const { data: server, error: serverError } = await supabaseAdmin
      .from('servers')
      .select('server_name')
      .eq('guild_id', guildId)
      .single();

    if (serverError) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Get AI Response from Groq
    const aiResult = await getAIResponse(prompt, server.server_name);

    if (!aiResult.success) {
      return res.status(500).json({ error: aiResult.error });
    }

    // Validate AI Response
    const validation = validateAIResponse(aiResult.response);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    // Store in database
    const { error: dbError } = await supabaseAdmin
      .from('ai_requests')
      .insert([
        {
          guild_id: guildId,
          user_id: userId,
          prompt: prompt,
          response: aiResult.response,
          tokens_used: aiResult.tokensUsed
        }
      ]);

    if (dbError) {
      console.error('DB Error:', dbError);
    }

    // Log audit
    await logAuditEvent(guildId, userId, 'AI_REQUEST', 'success');

    res.json({
      success: true,
      action: aiResult.response.action,
      parameters: aiResult.response.parameters,
      reason: aiResult.response.reason,
      tokensUsed: aiResult.tokensUsed,
      requiresConfirmation: requiresConfirmation(aiResult.response.action)
    });
  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ai/history/:guildId
router.get('/history/:guildId', async (req, res) => {
  const { guildId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const { data: requests, error, count } = await supabaseAdmin
      .from('ai_requests')
      .select('*', { count: 'exact' })
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      requests: requests,
      total: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;