import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeEgTo10 } from "@/utils/phoneEG";

interface Props {
  label?: string;
  value10: string;
  onChange10: (v: string) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

export const EgyptPhoneInput = forwardRef<HTMLDivElement, Props>(function EgyptPhoneInput({
  label,
  value10,
  onChange10,
  required = false,
  error,
  helperText,
  disabled = false,
}, ref) {
  return (
    <div className="space-y-1">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-md border border-input bg-muted px-3 h-10 text-sm text-muted-foreground select-none">
          +20
        </span>
        <Input
          value={value10}
          onChange={(e) =>
            onChange10(normalizeEgTo10(e.target.value).slice(0, 10))
          }
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            onChange10(normalizeEgTo10(pasted).slice(0, 10));
            e.preventDefault();
          }}
          placeholder="1XXXXXXXXX"
          dir="ltr"
          disabled={disabled}
          className="flex-1"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {helperText || "You can paste 01XXXXXXXXX — we auto-remove the leading 0."}
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
});
