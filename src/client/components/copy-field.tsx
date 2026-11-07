import { useEffect, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

const COPIED_MS = 1500;

/** Read-only mono value with a copy button that briefly reads "Copied". */
function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), COPIED_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => setCopied(true));
  };

  return (
    <InputGroup data-slot="copy-field">
      <InputGroupInput readOnly value={value} aria-label={label} className="font-mono text-xs" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton onClick={copy}>{copied ? "Copied" : "Copy link"}</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export { CopyField };
