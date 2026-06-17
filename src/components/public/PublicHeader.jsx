import React from "react";

export default function PublicHeader({ restaurant, subtitle }) {
  return (
    <div className="text-center mb-6">
      <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center mx-auto mb-3">
        <img
          src="/logo.svg"
          alt={restaurant?.name || "Pizza Bis"}
          className="w-full h-full object-contain"
        />
      </div>
      <h1 className="text-2xl font-bold text-foreground">
        {restaurant?.name || "Restaurante"}
      </h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}