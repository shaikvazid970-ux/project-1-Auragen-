const { ChatOpenAI } = require("@langchain/openai");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { codeGenPrompt } = require("./prompt");

/**
 * Week 1 - Code-Gen Prompting
 * ---------------------------
 * The actual LangChain pipeline: prompt -> GPT-4o -> raw code string.
 * Kept deliberately simple (LCEL pipe) so Week 2 can slot the Safety
 * Compilation layer directly after it without restructuring anything.
 */

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.2, // low temp: we want reliable, boring, valid code
  maxTokens: 1200,
});

const codeGenChain = codeGenPrompt.pipe(model).pipe(new StringOutputParser());

/**
 * @param {object} params
 * @param {number} params.cognitiveLoadScore
 * @param {string} params.frictionReason  e.g. "rage_click" | "hesitation" | "erratic_cursor"
 * @param {string} params.stuckField
 * @param {object} params.formState   current values already typed by the user
 * @param {object} params.formSchema  field definitions for the full form
 * @returns {Promise<string>} raw generated React component source
 */
async function generateComponent({
  cognitiveLoadScore,
  frictionReason,
  stuckField,
  formState,
  formSchema,
}) {
  const raw = await codeGenChain.invoke({
    cognitiveLoadScore,
    frictionReason,
    stuckField,
    formState: JSON.stringify(formState, null, 2),
    formSchema: JSON.stringify(formSchema, null, 2),
  });

  // Strip accidental markdown fences even though the prompt forbids them —
  // models occasionally add them anyway.
  return raw.replace(/^```(jsx|javascript|js)?\n?/i, "").replace(/```$/i, "").trim();
}

module.exports = { generateComponent, codeGenChain };
