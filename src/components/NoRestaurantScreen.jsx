import React from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Store, LogOut } from "lucide-react";

export default function NoRestaurantScreen() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card rounded-2xl border border-border shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
          <Store className="w-7 h-7 text-accent-foreground" />
        </div>
        <h1 className="font-heading font-bold text-lg text-foreground mb-2">
          Conta sem restaurante
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sua conta ainda não foi vinculada a um restaurante. Fale com o administrador.
        </p>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="rounded-xl"
        >
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </div>
    </div>
  );
}
