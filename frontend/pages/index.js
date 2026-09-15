import { useEffect, useRef, useState, useCallback } from "react";
import { useFrictionTracker } from "../hooks/useFrictionTracker";
import { getSocket } from "../lib/socket";
import DynamicRenderer from "../components/DynamicRenderer";
import * as UI from "../components/ui";

/**
 * Demo page wiring together:
 *  - Week 1: useFrictionTracker (Friction Engine) on the form container
 *  - Week 1: backend Code-Gen Agent (triggered server-side via socket)
 *  - Week 2: backend AST safety validation (also server-side)
 *  - Week 2: DynamicRenderer (in-browser compile + render of the result)
 *
 * This is a demo harness, not the final morphing UI (that's Week 3/4).
 */

const FORM_SCHEMA = {
  fields: [
    { name: "annualIncome", label: "Annual income", type: "number", required: true },
    { name: "employmentStatus", label: "Employment status", type: "select", required: true,
      options: [
        { label: "Employed", value: "employed" },
        { label: "Self-employed", value: "self_employed" },
        { label: "Unemployed", value: "unemployed" },
      ] },
    { name: "existingDebt", label: "Existing monthly debt payments", type: "number", required: false },
  ],
};

export default function Home() {
  const containerRef = useRef(null);
  const focusedFieldRef = useRef(null);
  const [formState, setFormState] = useState({});
  const [generated, setGenerated] = useState(null);
  const [genError, setGenError] = useState(null);
  const [status, setStatus] = useState("idle");

  const { cognitiveLoadScore, lastEvent } = useFrictionTracker({
    containerRef,
    formState,
    formSchema: FORM_SCHEMA,
    stuckFieldResolver: () => focusedFieldRef.current,
  });

  useEffect(() => {
    const socket = getSocket();
    socket.on("codegen:started", () => setStatus("generating"));
    socket.on("codegen:success", (payload) => {
      setGenerated(payload.code);
      setGenError(null);
      setStatus("ready");
    });
    socket.on("codegen:error", (payload) => {
      setGenError(payload);
      setStatus("error");
    });
    return () => {
      socket.off("codegen:started");
      socket.off("codegen:success");
      socket.off("codegen:error");
    };
  }, []);

  const handleChange = useCallback((e) => {
    setFormState((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  return (
    <main className="p-6 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold text-slate-900 mb-4">Loan Application</h1>

      <div className="mb-4">
        <UI.Banner variant={cognitiveLoadScore > 70 ? "warning" : "info"}>
          Cognitive Load Score: {cognitiveLoadScore} {lastEvent ? `(${lastEvent.reason})` : ""}
        </UI.Banner>
      </div>

      {status === "ready" && generated ? (
        <DynamicRenderer
          source={generated}
          onNext={(values) => setFormState((prev) => ({ ...prev, ...values }))}
          onBack={() => setGenerated(null)}
          onCompileError={(err) => setGenError({ reason: "render_error", details: err.message })}
        />
      ) : (
        <UI.Card>
          <UI.CardBody>
            <div ref={containerRef}>
              {FORM_SCHEMA.fields.map((field) => (
                <UI.Field key={field.name} label={field.label} required={field.required}>
                  {field.type === "select" ? (
                    <UI.Select
                      name={field.name}
                      value={formState[field.name]}
                      onChange={handleChange}
                      options={field.options}
                    />
                  ) : (
                    <UI.Input
                      type={field.type}
                      name={field.name}
                      value={formState[field.name]}
                      onChange={handleChange}
                      placeholder={field.label}
                    />
                  )}
                </UI.Field>
              ))}
              {/* Wire onFocus/onBlur below to feed the hesitation tracker */}
              <div
                onFocus={(e) => (focusedFieldRef.current = e.target.name || null)}
                onBlur={() => (focusedFieldRef.current = null)}
              >
                <UI.Button variant="primary">Submit</UI.Button>
              </div>
            </div>
          </UI.CardBody>
        </UI.Card>
      )}

      {status === "generating" && <p className="text-sm text-slate-500 mt-2">Simplifying this step…</p>}
      {status === "error" && genError && (
        <p className="text-sm text-red-600 mt-2">Generation blocked: {genError.reason}</p>
      )}
    </main>
  );
}
