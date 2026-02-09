import { ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

interface TicketSectionProps {
  title: string;
  count: number;
  badge?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  action?: ReactNode;
}

export function TicketSection({
  title,
  count,
  badge,
  collapsible = false,
  defaultOpen = true,
  children,
  action,
}: TicketSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <Card>
      <CardHeader
        className="flex flex-row items-center justify-between py-3 px-4 cursor-pointer"
        onClick={() => collapsible && setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          {collapsible && (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary" className="text-xs">{count}</Badge>
          {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
        </div>
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
      </CardHeader>
      {open && <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>}
    </Card>
  );
}
