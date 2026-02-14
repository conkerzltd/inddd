import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TicketSectionProps {
  title: string;
  count: number;
  badge?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  action?: ReactNode;
  alwaysShow?: boolean;
}

export function TicketSection({
  title,
  count,
  badge,
  children,
  action,
  alwaysShow = false,
}: TicketSectionProps) {
  if (count === 0 && !alwaysShow) return null;

  return (
    <Card className="animate-fade-in">
      <CardHeader
        className="flex flex-row items-center justify-between py-3 px-4 pb-2 mb-1 sticky top-0 z-10 bg-card rounded-t-lg border-b border-border"
      >
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
          <Badge variant="secondary" className="text-xs">{count}</Badge>
          {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
        </div>
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-2 md:px-4 md:pb-4 md:pt-0">{children}</CardContent>
    </Card>
  );
}
