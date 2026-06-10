import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Plus, Trash2, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RoomScheduleEditor from "@/components/admin/RoomScheduleEditor";

export default function DiningRooms() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [form, setForm] = useState({ name: "", type: "interno", total_capacity: "" });

  const { data: rooms = [] } = useQuery({
    queryKey: ["dining-rooms"],
    queryFn: () => base44.entities.DiningRoom.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DiningRoom.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dining-rooms"] });
      toast({ title: "Salão criado!" });
      setShowDialog(false);
      setForm({ name: "", type: "interno", total_capacity: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DiningRoom.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dining-rooms"] });
      toast({ title: "Salão atualizado!" });
      setShowDialog(false);
      setEditing(null);
      setForm({ name: "", type: "interno", total_capacity: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DiningRoom.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dining-rooms"] });
      toast({ title: "Salão removido!" });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, total_capacity: Number(form.total_capacity) };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (room) => {
    setEditing(room);
    setForm({ name: room.name, type: room.type || "interno", total_capacity: room.total_capacity });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
            Salões
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os salões e suas grades horárias
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setForm({ name: "", type: "interno", total_capacity: "" });
            setShowDialog(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
        >
          <Plus className="w-4 h-4 mr-1" />
          Novo Salão
        </Button>
      </div>

      <div className="space-y-4">
        {rooms.map((room) => (
          <div key={room.id} className="bg-card rounded-2xl border border-border overflow-hidden">
            <div
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() =>
                setExpandedRoom(expandedRoom === room.id ? null : room.id)
              }
            >
              <div>
                <h3 className="font-semibold text-foreground">{room.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {room.type || "interno"} · Capacidade: {room.total_capacity} pessoas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(room);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(room.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                {expandedRoom === room.id ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
            {expandedRoom === room.id && (
              <div className="border-t border-border p-4">
                <RoomScheduleEditor room={room} />
              </div>
            )}
          </div>
        ))}

        {rooms.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
            <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum salão cadastrado</p>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              {editing ? "Editar Salão" : "Novo Salão"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome do salão *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Salão Principal"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Tipo de salão</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm({ ...form, type: value })}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="externo">Externo</SelectItem>
                  <SelectItem value="varanda">Varanda</SelectItem>
                  <SelectItem value="privativo">Privativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Capacidade total *</Label>
              <Input
                type="number"
                required
                min={1}
                value={form.total_capacity}
                onChange={(e) => setForm({ ...form, total_capacity: e.target.value })}
                placeholder="Ex: 50"
                className="rounded-xl mt-1"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              {editing ? "Salvar Alterações" : "Criar Salão"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}