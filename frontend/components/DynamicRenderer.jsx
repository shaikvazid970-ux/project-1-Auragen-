import { useEffect, useMemo, useState } from "react";
import * as React from "react";
import * as UI from "./ui"; // your approved component library, see ./ui/index.js

/**
 * Week 2 - Dynamic Injection
 * --------------------------
 * Takes a raw, already-safety-validated (see backend/src/safety/astValidator.js)
 * component source string and compiles + renders it live in the browser
 * using Babel Standalone. No eval() of arbitrary scope — the generated
 * component only ever receives React + the whitelisted UI library, both
 * passed explicitly via `scope`.
 *
 * This is intentionally the ONLY place in the app allowed to turn a
 * string into a live component.
 */

let babelPromise = null;
function loadBabelStandalone() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.Babel) return Promise.resolve(window.Babel);
  if (!babelPromise) {
    babelPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@babel/standalone/babel.min.js";
      script.async = true;
      script.onload = () => resolve(window.Babel);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return babelPromise;
}

/**
 * Compiles a JSX source string (must have a `export default` component)
 * into a live React component function, using only the provided scope.
 */
function compileToComponent(source, Babel) {
  const transformed = Babel.transform(source, {
    presets: ["react"],
    filename: "GeneratedComponent.jsx",
  }).code;

  // Rewrite `export default X` -> `return X` so we can wrap it in a
  // function body and get the component back without a module system.
  const body = transformed
    .replace(/^"use strict";?/, "")
    .replace(/export default\s+/m, "return ");

  // The generated function receives React + UI explicitly as arguments —
  // it has no closure over window/document/fetch/etc.
  // eslint-disable-next-line no-new-func
  const factory = new Function("React", "UI", `${body}`);
  return factory(React, UI);
}

export default function DynamicRenderer({ source, fallback, onCompileError, ...componentProps }) {
  const [Comp, setComp] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setComp(null);

    if (!source) return;

    loadBabelStandalone()
      .then((Babel) => {
        if (cancelled || !Babel) return;
        const compiled = compileToComponent(source, Babel);
        setComp(() => compiled);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[DynamicRenderer] compile failed:", err);
        setError(err);
        onCompileError?.(err);
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  const ErrorBoundary = useMemo(() => makeErrorBoundary(), []);

  if (error) {
    return fallback ?? <UI.Banner variant="warning">Couldn't render the simplified view.</UI.Banner>;
  }

  if (!Comp) {
    return fallback ?? <UI.Banner variant="info">Simplifying this step…</UI.Banner>;
  }

  return (
    <React.Suspense fallback={fallback ?? <UI.Banner variant="info">Loading…</UI.Banner>}>
      <ErrorBoundary onError={onCompileError} fallback={fallback}>
        <Comp {...componentProps} />
      </ErrorBoundary>
    </React.Suspense>
  );
}

// Minimal class-based error boundary (required — hooks can't catch render errors)
function makeErrorBoundary() {
  return class GeneratedComponentBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
      return { hasError: true };
    }
    componentDidCatch(err, info) {
      console.error("[DynamicRenderer] runtime error in generated component:", err, info);
      this.props.onError?.(err);
    }
    render() {
      if (this.state.hasError) {
        return this.props.fallback ?? <UI.Banner variant="warning">Something went wrong rendering this step.</UI.Banner>;
      }
      return this.props.children;
    }
  };
}
