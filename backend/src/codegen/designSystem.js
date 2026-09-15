/**
 * Week 1 - Code-Gen Prompting
 * ---------------------------
 * This is the "design system contract" fed into every LLM call so the
 * generated React reliably uses YOUR Tailwind tokens + component library
 * instead of inventing arbitrary classes/components.
 *
 * Swap the contents of this file for your real design tokens / component
 * inventory. Keep it short and concrete — long, vague style guides produce
 * worse generations than a tight, example-driven spec.
 */

const DESIGN_SYSTEM_SPEC = `
You generate React functional components for the "Infotact" design system.

ALLOWED COMPONENTS (import from "@/components/ui"):
- <Card>, <CardHeader>, <CardBody>, <CardFooter>
- <Field label required helpText error> wraps a single form field
- <Input type name value onChange placeholder />
- <Select name value onChange options={[{label,value}]} />
- <Button variant="primary|secondary|ghost" onClick>label</Button>
- <StepIndicator step={n} total={m} />
- <Banner variant="info|warning|success">message</Banner>

TAILWIND TOKENS (use ONLY these, no arbitrary hex/px values):
- Spacing: p-2 p-4 p-6 gap-2 gap-4 gap-6
- Text: text-sm text-base text-lg font-medium font-semibold
- Color: text-slate-900 text-slate-500 bg-white bg-slate-50 bg-indigo-600
         text-indigo-600 border-slate-200 ring-indigo-500
- Radius/Shadow: rounded-xl shadow-sm

RULES:
1. Output ONLY a single default-exported React functional component.
2. No class components, no external imports besides React and "@/components/ui".
3. No inline <style>, no <script>, no dangerouslySetInnerHTML, no eval/Function.
4. No network calls inside the component body (fetch/axios) — accept data via props.
5. Component must accept a single "props" object with well-named fields;
   never invent global state or browser APIs (document/window) directly.
6. Keep the component under ~120 lines. Prefer clarity over cleverness.
7. Always include reasonable aria-labels for form fields.
`;

module.exports = { DESIGN_SYSTEM_SPEC };
