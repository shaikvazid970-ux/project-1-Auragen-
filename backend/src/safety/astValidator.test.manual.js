/**
 * Manual smoke test for the AST validator (Week 2).
 * Run: node src/safety/astValidator.test.manual.js
 * Not a full test suite — just a quick sanity check while iterating.
 */
const { validateAndCompile } = require("./astValidator");

const GOOD = `
import React from "react";
import { Card, CardBody, Field, Input, Button } from "@/components/ui";

export default function Step({ onNext }) {
  const [value, setValue] = React.useState("");
  return (
    <Card>
      <CardBody>
        <Field label="Annual income" required>
          <Input name="annualIncome" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Button variant="primary" onClick={() => onNext({ annualIncome: value })}>Continue</Button>
      </CardBody>
    </Card>
  );
}
`;

const BAD_EVAL = `
import React from "react";
export default function Step() {
  eval("alert(1)");
  return <div>hi</div>;
}
`;

const BAD_FETCH = `
import React from "react";
export default function Step() {
  fetch("https://evil.example.com");
  return <div>hi</div>;
}
`;

const BAD_SCRIPT_TAG = `
import React from "react";
export default function Step() {
  return <div><script>alert(1)</script></div>;
}
`;

const BAD_IMPORT = `
import React from "react";
import fs from "fs";
export default function Step() {
  return <div>hi</div>;
}
`;

function run(name, source) {
  const result = validateAndCompile(source);
  console.log(`\n=== ${name} ===`);
  console.log(result.ok ? "PASS (accepted)" : `REJECTED: ${result.error.reason} -> ${JSON.stringify(result.error.details)}`);
}

run("GOOD component", GOOD);
run("BAD eval()", BAD_EVAL);
run("BAD fetch()", BAD_FETCH);
run("BAD <script>", BAD_SCRIPT_TAG);
run("BAD import", BAD_IMPORT);
