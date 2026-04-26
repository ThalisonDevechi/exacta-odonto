import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileSignature } from "lucide-react";

interface DocumentSignatureBadgeProps {
  signed: boolean;
  className?: string;
}

export function DocumentSignatureBadge({ signed, className }: DocumentSignatureBadgeProps) {
  if (signed) {
    return (
      <Badge variant="default" className={className}>
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Assinado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={className}>
      <FileSignature className="mr-1 h-3 w-3" />
      Não assinado
    </Badge>
  );
}
