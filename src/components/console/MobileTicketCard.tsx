import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { HIGHLIGHT_CARD_CLASS } from "@/hooks/useTicketHighlight";

interface Field {
  label: string;
  value: ReactNode;
}

interface MobileTicketCardProps {
  index: number;
  fields: Field[];
  actions?: ReactNode;
  highlight?: boolean;
  highlightActive?: boolean;
  className?: string;
}

export function MobileTicketCard({ index, fields, actions, highlight, highlightActive, className }: MobileTicketCardProps) {
  return (
    <Card className={`animate-fade-in ${highlight ? "border-primary/40 bg-primary/5" : ""} ${highlightActive ? HIGHLIGHT_CARD_CLASS : "transition-all duration-500"} ${className || ""}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-bold shrink-0">
            {index}
          </span>
          <div className="flex-1 min-w-0 space-y-1">
            {fields.map((f, i) => (
              <div key={i} className="flex items-baseline gap-1.5 text-sm">
                <span className="text-muted-foreground text-xs shrink-0">{f.label}:</span>
                <span className="font-medium truncate">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Hook helper: returns true on <768px */
export { useIsMobile };
