import React from "react";
import { UtensilsCrossed } from "lucide-react";

export default function PublicHeader({ restaurant, subtitle }) {
  return (
    <div className="text-center mb-6">
      <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3">
        <UtensilsCrossed className="w-7 h-7 text-primary-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">
        {restaurant?.name || "Restaurante"}
      </h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}