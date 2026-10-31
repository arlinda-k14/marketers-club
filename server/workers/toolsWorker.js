const OpenAI = require('openai');

// Adapter interface - reads key from environment
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }
  return new OpenAI({ apiKey });
}

function validateNoInventedNumbers(input, output) {
  // Extract numbers from input
  const inputNumbers = new Set((input.match(/\d+(?:\.\d+)?/g) || []));
  // Extract numbers from output
  const outputNumbers = (output.match(/\d+(?:\.\d+)?/g) || []);
  for (const num of outputNumbers) {
    if (!inputNumbers.has(num)) {
      throw new Error('Tool refused to invent figures. Numbers in output must appear in input.');
    }
  }
}

async function generateOutput(type, input) {
  if (!input || input.trim() === '') {
    throw new Error('Input is missing. Tool stopped and asks for input.');
  }
  
  const client = getClient();
  let prompt, systemPrompt;
  
  if (type === 'headline') {
    systemPrompt = 'You are a headline generator. Generate headline ideas using ONLY information from the input. Do not invent numbers, statistics, or figures. Every number in your output must appear in the input. If asked for numbers not in input, do not add them.';
    prompt = `Generate headlines based on this input: ${input}`;
  } else if (type === 'email_brief') {
    systemPrompt = 'You are an email brief builder. Build an email brief using ONLY information from the input. Do not invent numbers, statistics, or figures. Every number in your output must appear in the input.';
    prompt = `Build an email brief based on this input: ${input}`;
  } else if (type === 'social_post') {
    systemPrompt = 'You are a social post formatter. Format a social post using ONLY information from the input. Do not invent numbers, statistics, or figures. Every number in your output must appear in the input.';
    prompt = `Format a social post based on this input: ${input}`;
  } else {
    throw new Error('Unknown tool type');
  }
  
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7
  });
  
  const output = response.choices[0].message.content;
  validateNoInventedNumbers(input, output);
  return output;
}

module.exports = { generateOutput };
