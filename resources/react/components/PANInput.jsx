import { useState } from "react";
import { validatePAN } from "../validations/validators";

export default function PANInput({ value, onChange }) {
  const [touched, setTouched] = useState(false);
  const error = touched ? validatePAN(value) : null;

  return (
    <div className="field">
      <label htmlFor="pan">PAN</label>
      <input
        id="pan"
        value={value}
        maxLength={10}
        placeholder="ABCDE1234F"
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onBlur={() => setTouched(true)}
        style={{ textTransform: "uppercase" }}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
