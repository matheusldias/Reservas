import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UtensilsCrossed, MapPin, ChevronRight } from "lucide-react";

export default function ChooseRestaurantPage() {
  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["public-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_list_restaurants");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <UtensilsCrossed className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Fazer Reserva
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha a unidade onde deseja reservar
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => (
              <Link
                key={r.id}
                to={`/reservar/${r.id}`}
                className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{r.name}</p>
                  {r.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0" /> {r.address}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-primary shrink-0" />
              </Link>
            ))}
            {restaurants.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhuma unidade disponível no momento.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
