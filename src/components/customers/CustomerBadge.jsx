import React from "react";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export default function CustomerBadge({ customer }) {
  if (!customer) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <Badge className="bg-accent text-accent-foreground border-0 text-xs">
        Cliente: {customer.name}
      </Badge>
      <Badge variant="outline" className="text-xs">
        {customer.visits_count || 0} visita{(customer.visits_count || 0) !== 1 ? "s" : ""}
      </Badge>
      {(customer.no_show_count || 0) > 0 && (
        <Badge className="bg-red-100 text-red-700 border-0 text-xs">
          {customer.no_show_count} no-show{customer.no_show_count !== 1 ? "s" : ""}
        </Badge>
      )}
      {customer.vip && (
        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs flex items-center gap-1">
          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> VIP
        </Badge>
      )}
    </div>
  );
}