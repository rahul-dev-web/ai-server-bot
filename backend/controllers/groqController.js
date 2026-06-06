const axios = require('axios');
const {
  ALLOWED_ACTIONS,
  isReadOnlyAction,
  buildPromptActionList
} = require('../config/actionRegistry');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

const createStructuredPrompt = (userRequest, serverName) => {
  return `You are a Discord Server Management Assistant for server: "${serverName}".

ALLOWED ACTIONS:
${buildPromptActionList()}

MAPPING HINTS:
- "total roles", "how many roles", "check roles" → list_roles
- "server info", "server stats" → get_server_info
- "list channels" → list_channels
- "create #channel" → create_channel (strip # from name)
- kick/ban/timeout member → use parameters.username with exact Discord username (e.g. "yogi"), NOT display name

RESPOND ONLY WITH VALID JSON:
{
  "action": "action_name",
  "parameters": { },
  "reason": "brief explanation"
}

If request is invalid, respond with:
{ "error": true, "message": "Why this is not allowed" }

RULES:
- Return ONLY valid JSON, no markdown
- Use exact action names from the list above
- parameters must be an object (use {} if none needed)
- For read/info requests, prefer list_roles, get_server_info, list_channels`;
};

const parseAIJson = (raw) => {
  let cleaned = raw.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) cleaned = fenced[1].trim();
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) cleaned = objectMatch[0];
  return JSON.parse(cleaned);
};

const getAIResponse = async (userPrompt, serverName) => {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: createStructuredPrompt(userPrompt, serverName) },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 600,
        top_p: 0.9
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiResponse = response.data.choices[0].message.content;
    const tokensUsed = response.data.usage.total_tokens;

    let parsedResponse;
    try {
      parsedResponse = parseAIJson(aiResponse);
    } catch {
      parsedResponse = {
        error: true,
        message: 'Invalid JSON response from AI',
        raw: aiResponse
      };
    }

    return {
      success: true,
      response: parsedResponse,
      tokensUsed,
      rawResponse: aiResponse
    };
  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
};

const validateAIResponse = (response) => {
  if (response.error) {
    return { valid: false, reason: response.message };
  }

  if (!ALLOWED_ACTIONS.includes(response.action)) {
    return {
      valid: false,
      reason: `Action "${response.action}" is not allowed. Try: list_roles, get_server_info, create_channel, etc.`
    };
  }

  if (response.parameters === undefined || response.parameters === null) {
    response.parameters = {};
  }

  if (typeof response.parameters !== 'object' || Array.isArray(response.parameters)) {
    return { valid: false, reason: 'parameters must be an object' };
  }

  if (!isReadOnlyAction(response.action)) {
    const needsName = [
      'create_role', 'delete_role', 'rename_role', 'update_role',
      'create_channel', 'delete_channel', 'rename_channel',
      'create_category', 'delete_category', 'get_role_info', 'get_channel_info',
      'set_channel_topic', 'set_slowmode', 'purge_messages'
    ];
    if (needsName.includes(response.action) && !response.parameters.name && !response.parameters.role) {
      return { valid: false, reason: `Action "${response.action}" requires a name parameter` };
    }
  }

  return { valid: true };
};

module.exports = {
  getAIResponse,
  createStructuredPrompt,
  validateAIResponse,
  parseAIJson
};
