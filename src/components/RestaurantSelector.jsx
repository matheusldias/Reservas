import React from "react";
import { useRestaurant } from "@/lib/RestaurantContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store } from "lucide-react";

export default function RestaurantSelector() {
  const { restaurants, restaurant, selectRestaurant } = useRestaurant();

  if (restaurants.length === 0) return null;

  return (
    <Select value={restaurant?.id || ""} onValueChange={selectRestaurant}>
      <SelectTrigger className="rounded-xl bg-muted border-0 h-10">
        <div className="flex items-center gap-2 min-w-0">
          <Store className="w-4 h-4 text-primary flex-shrink-0" />
          <SelectValue placeholder="Selecione o restaurante" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {restaurants.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}