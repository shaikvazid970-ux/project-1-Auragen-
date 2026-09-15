const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { DESIGN_SYSTEM_SPEC } = require("./designSystem");

/**
 * Week 1 - Code-Gen Prompting
 * ---------------------------
 * Builds the prompt sent to GPT-4o. Takes the current friction context
 * (what the user is stuck on) and the form's known field state, and asks
 * the model to redesign it as a simplified, step-by-step wizard.
 */
const codeGenPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are AuraGen's Code-Gen Agent, an expert React/Tailwind engineer
embedded inside a live product. A user is showing signs of cognitive
overload on a form. Your job: regenerate ONE simplified React component
that reduces their friction, using ONLY the design system below.

${DESIGN_SYSTEM_SPEC}

Respond with RAW CODE ONLY. No markdown fences, no commentary, no prose
before or after the code.`,
  ],
  [
    "human",
    `FRICTION CONTEXT:
- Cognitive Load Score: {cognitiveLoadScore} (0-100, higher = more stuck)
- Friction signal: {frictionReason}
- Field the user is stuck on: {stuckField}

CURRENT FORM STATE (field name -> value already entered; preserve these):
{formState}

ORIGINAL FORM SCHEMA (fields, types, labels, validation):
{formSchema}

TASK:
Generate a single-step wizard component (just the ONE step covering the
"{stuckField}" field group) that:
1. Shows a <StepIndicator> for progress.
2. Explains the field in plain language via a <Banner variant="info">.
3. Renders only 1-3 fields at a time from the schema, pre-filled from
   CURRENT FORM STATE.
4. Calls props.onNext(values) when the user submits this step.
5. Calls props.onBack() if there is a previous step.
`,
  ],
]);

module.exports = { codeGenPrompt };
