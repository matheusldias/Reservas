import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Store } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function RestaurantSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: restaurants = [] } = useQuery({
    queryKey: ["restaurant"],
    queryFn: () => base44.entities.Restaurant.list(),
  });

  const restaurant = restaurants[0];

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    opening_hours: "",
  });

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name || "",
        address: restaurant.address || "",
        phone: restaurant.phone || "",
        opening_hours: restaurant.opening_hours || "",
      });
    }
  }, [restaurant]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (restaurant) {
        return base44.entities.Restaurant.update(restaurant.id, data);
      } else {
        return base44.entities.Restaurant.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant"] });
      toast({ title: "Configurações salvas com sucesso!" });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <Store className="w-6 h-6 text-primary" />
          Configurações do Restaurante
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Informações básicas do estabelecimento
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
          <div>
            <Label>Nome do restaurante</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Restaurante Bela Vista"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Rua, número, bairro, cidade"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(11) 3333-4444"
              className="rounded-xl mt-1"
            />
          </div>
          <div>
            <Label>Horário de funcionamento</Label>
            <Textarea
              value={form.opening_hours}
              onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
              placeholder="Ex: Seg-Sex 11h-23h, Sáb-Dom 11h-00h"
              className="rounded-xl mt-1"
              rows={2}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
        >
          <Save className="w-4 h-4 mr-2" />
          {mutation.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </form>
    </div>
  );
}