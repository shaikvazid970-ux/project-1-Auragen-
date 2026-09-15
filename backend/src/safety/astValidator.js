const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;

/**
 * Week 2 - Safety & Compilation
 * -----------------------------
 * Parses the LLM's generated code into an AST, rejects anything that
 * looks unsafe or malformed, and (if valid) returns clean, re-generated
 * source ready to ship to the client.
 *
 * This is a defense-in-depth allowlist check, not a full sandbox — the
 * compiled component still renders inside the Dynamic Renderer's
 * restricted scope (see frontend/components/DynamicRenderer.jsx), which
 * only exposes React + the approved UI component library.
 */

const DISALLOWED_IDENTIFIERS = new Set([
  "eval",
  "Function",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "document",
  "window",
  "localStorage",
  "sessionStorage",
  "importScripts",
  "require",
  "process",
  "globalThis",
]);

const DISALLOWED_JSX_TAGS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "link",
  "style",
]);

const ALLOWED_IMPORT_SOURCES = new Set(["react", "@/components/ui"]);

class UnsafeGenerationError extends Error {
  constructor(reason, details) {
    super(`AuraGen safety check failed: ${reason}`);
    this.name = "UnsafeGenerationError";
    this.reason = reason;
    this.details = details;
  }
}

/**
 * @param {string} code raw JSX/JS source string from the LLM
 * @returns {{ ok: true, code: string } | { ok: false, error: UnsafeGenerationError }}
 */
function validateAndCompile(code) {
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["jsx"],
      errorRecovery: false,
    });
  } catch (err) {
    return {
      ok: false,
      error: new UnsafeGenerationError("syntax_error", err.message),
    };
  }

  const violations = [];
  let hasDefaultExport = false;

  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;
      if (!ALLOWED_IMPORT_SOURCES.has(source)) {
        violations.push(`disallowed import source: "${source}"`);
      }
    },

    ExportDefaultDeclaration() {
      hasDefaultExport = true;
    },

    Identifier(path) {
      if (DISALLOWED_IDENTIFIERS.has(path.node.name)) {
        violations.push(`disallowed identifier: "${path.node.name}"`);
      }
    },

    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type === "Identifier" && DISALLOWED_IDENTIFIERS.has(callee.name)) {
        violations.push(`disallowed call: "${callee.name}(...)"`);
      }
      // Block dynamic property calls like window["eval"]
      if (
        callee.type === "MemberExpression" &&
        callee.object.type === "Identifier" &&
        DISALLOWED_IDENTIFIERS.has(callee.object.name)
      ) {
        violations.push(`disallowed call on: "${callee.object.name}"`);
      }
    },

    JSXOpeningElement(path) {
      const nameNode = path.node.name;
      if (nameNode.type === "JSXIdentifier") {
        const tag = nameNode.name.toLowerCase();
        if (DISALLOWED_JSX_TAGS.has(tag)) {
          violations.push(`disallowed JSX tag: "<${tag}>"`);
        }
      }
      // Block dangerouslySetInnerHTML
      for (const attr of path.node.attributes) {
        if (
          attr.type === "JSXAttribute" &&
          attr.name.name === "dangerouslySetInnerHTML"
        ) {
          violations.push("disallowed prop: dangerouslySetInnerHTML");
        }
      }
    },

    // Catch `new Function(...)` style construction too
    NewExpression(path) {
      if (path.node.callee.type === "Identifier" && path.node.callee.name === "Function") {
        violations.push('disallowed construct: "new Function(...)"');
      }
    },
  });

  if (!hasDefaultExport) {
    violations.push("missing a default export");
  }

  if (violations.length > 0) {
    return {
      ok: false,
      error: new UnsafeGenerationError("policy_violation", violations),
    };
  }

  // Re-generate clean source from the validated AST rather than trusting
  // the raw string byte-for-byte — this normalizes formatting and strips
  // any comments that slipped through.
  const { code: cleanCode } = generate(ast, { comments: false });

  return { ok: true, code: cleanCode };
}

module.exports = { validateAndCompile, UnsafeGenerationError };
