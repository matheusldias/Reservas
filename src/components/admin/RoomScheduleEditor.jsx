import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, CalendarOff, CalendarPlus, Copy, ArrowDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function RoomScheduleEditor({ room }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState(room.schedule || []);
  const [specialDates, setSpecialDates] = useState(room.special_dates || []);
  const [blockedDates, setBlockedDates] = useState(room.blocked_dates || []);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.DiningRoom.update(room.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dining-rooms"] });
      toast({ title: "Grade salva!" });
    },
  });

  const addSlotToDay = (dayIndex) => {
    const existing = schedule.find((s) => s.day_of_week === dayIndex);
    if (existing) {
      setSchedule(
        schedule.map((s) =>
          s.day_of_week === dayIndex
            ? {
                ...s,
                time_slots: [
                  ...s.time_slots,
                  { start_time: "12:00", end_time: "14:00", capacity: room.total_capacity },
                ],
              }
            : s
        )
      );
    } else {
      setSchedule([
        ...schedule,
        {
          day_of_week: dayIndex,
          time_slots: [{ start_time: "12:00", end_time: "14:00", capacity: room.total_capacity }],
        },
      ]);
    }
  };

  const updateSlot = (dayIndex, slotIndex, field, value) => {
    setSchedule(
      schedule.map((s) =>
        s.day_of_week === dayIndex
          ? {
              ...s,
              time_slots: s.time_slots.map((slot, i) =>
                i === slotIndex
                  ? { ...slot, [field]: field === "capacity" ? Number(value) : value }
                  : slot
              ),
            }
          : s
      )
    );
  };

  const copyToAllDays = (dayIndex) => {
    const source = schedule.find((s) => s.day_of_week === dayIndex);
    if (!source) return;
    setSchedule(
      DAYS.map((_, i) => ({
        day_of_week: i,
        time_slots: source.time_slots.map((slot) => ({ ...slot })),
      }))
    );
    toast({ title: `Horários de ${DAYS[dayIndex]} copiados para todos os dias` });
  };

  const copyToNextDay = (dayIndex) => {
    const source = schedule.find((s) => s.day_of_week === dayIndex);
    if (!source) return;
    const next = (dayIndex + 1) % 7;
    setSchedule([
      ...schedule.filter((s) => s.day_of_week !== next),
      { day_of_week: next, time_slots: source.time_slots.map((slot) => ({ ...slot })) },
    ]);
    toast({ title: `Horários copiados para ${DAYS[next]}` });
  };

  const removeSlot = (dayIndex, slotIndex) => {
    setSchedule(
      schedule
        .map((s) =>
          s.day_of_week === dayIndex
            ? { ...s, time_slots: s.time_slots.filter((_, i) => i !== slotIndex) }
            : s
        )
        .filter((s) => s.time_slots.length > 0)
    );
  };

  const addBlockedDate = () => {
    setBlockedDates([...blockedDates, { date: "", reason: "", full_day: true, start_time: "", end_time: "" }]);
  };

  const updateBlockedDate = (i, field, value) => {
    const updated = [...blockedDates];
    updated[i] = { ...updated[i], [field]: value };
    setBlockedDates(updated);
  };

  const addSpecialDate = () => {
    setSpecialDates([
      ...specialDates,
      { date: "", label: "", time_slots: [{ start_time: "12:00", end_time: "14:00", capacity: room.total_capacity }] },
    ]);
  };

  const updateSpecialDate = (i, field, value) => {
    const updated = [...specialDates];
    updated[i] = { ...updated[i], [field]: value };
    setSpecialDates(updated);
  };

  const addSpecialSlot = (i) => {
    const updated = [...specialDates];
    updated[i] = {
      ...updated[i],
      time_slots: [
        ...(updated[i].time_slots || []),
        { start_time: "12:00", end_time: "14:00", capacity: room.total_capacity },
      ],
    };
    setSpecialDates(updated);
  };

  const updateSpecialSlot = (i, slotIndex, field, value) => {
    const updated = [...specialDates];
    updated[i] = {
      ...updated[i],
      time_slots: updated[i].time_slots.map((slot, j) =>
        j === slotIndex
          ? { ...slot, [field]: field === "capacity" ? Number(value) : value }
          : slot
      ),
    };
    setSpecialDates(updated);
  };

  const removeSpecialSlot = (i, slotIndex) => {
    const updated = [...specialDates];
    updated[i] = {
      ...updated[i],
      time_slots: updated[i].time_slots.filter((_, j) => j !== slotIndex),
    };
    setSpecialDates(updated);
  };

  const handleSave = () => {
    saveMutation.mutate({ schedule, special_dates: specialDates, blocked_dates: blockedDates });
  };

  return (
    <Tabs defaultValue="schedule" className="w-full">
      <TabsList className="bg-muted rounded-xl p-1 h-auto mb-4">
        <TabsTrigger value="schedule" className="rounded-lg text-xs px-3 py-1.5">
          Grade Horária
        </TabsTrigger>
        <TabsTrigger value="special" className="rounded-lg text-xs px-3 py-1.5">
          Datas Especiais
        </TabsTrigger>
        <TabsTrigger value="blocked" className="rounded-lg text-xs px-3 py-1.5">
          Bloqueios
        </TabsTrigger>
      </TabsList>

      <TabsContent value="schedule">
        <div className="space-y-4">
          {DAYS.map((day, dayIndex) => {
            const daySchedule = schedule.find((s) => s.day_of_week === dayIndex);
            return (
              <div key={dayIndex} className="bg-muted/50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{day}</span>
                  <div className="flex items-center gap-1">
                    {daySchedule?.time_slots?.length > 0 && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Copiar para o próximo dia"
                          onClick={() => copyToNextDay(dayIndex)}
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Copiar para todos os dias"
                          onClick={() => copyToAllDays(dayIndex)}
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addSlotToDay(dayIndex)}
                      className="text-xs text-primary"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Horário
                    </Button>
                  </div>
                </div>
                {daySchedule?.time_slots?.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-2 mb-2">
                    <Input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) =>
                        updateSlot(dayIndex, slotIndex, "start_time", e.target.value)
                      }
                      className="rounded-lg text-xs h-8 w-24"
                    />
                    <span className="text-muted-foreground text-xs">até</span>
                    <Input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) =>
                        updateSlot(dayIndex, slotIndex, "end_time", e.target.value)
                      }
                      className="rounded-lg text-xs h-8 w-24"
                    />
                    <Input
                      type="number"
                      value={slot.capacity}
                      onChange={(e) =>
                        updateSlot(dayIndex, slotIndex, "capacity", e.target.value)
                      }
                      className="rounded-lg text-xs h-8 w-16"
                      placeholder="Cap."
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeSlot(dayIndex, slotIndex)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {!daySchedule && (
                  <p className="text-xs text-muted-foreground italic">Fechado</p>
                )}
              </div>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="special">
        <div className="space-y-3">
          {specialDates.map((sd, i) => (
            <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={sd.date}
                  onChange={(e) => updateSpecialDate(i, "date", e.target.value)}
                  className="rounded-lg text-xs h-8 w-36"
                />
                <Input
                  value={sd.label || ""}
                  onChange={(e) => updateSpecialDate(i, "label", e.target.value)}
                  placeholder="Ex: Dia dos Namorados"
                  className="rounded-lg text-xs h-8 flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => setSpecialDates(specialDates.filter((_, j) => j !== i))}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              {(sd.time_slots || []).map((slot, slotIndex) => (
                <div key={slotIndex} className="flex items-center gap-2 pl-2">
                  <Input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateSpecialSlot(i, slotIndex, "start_time", e.target.value)}
                    className="rounded-lg text-xs h-8 w-24"
                  />
                  <span className="text-muted-foreground text-xs">até</span>
                  <Input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateSpecialSlot(i, slotIndex, "end_time", e.target.value)}
                    className="rounded-lg text-xs h-8 w-24"
                  />
                  <Input
                    type="number"
                    value={slot.capacity}
                    onChange={(e) => updateSpecialSlot(i, slotIndex, "capacity", e.target.value)}
                    className="rounded-lg text-xs h-8 w-16"
                    placeholder="Cap."
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeSpecialSlot(i, slotIndex)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => addSpecialSlot(i)}
                className="text-xs text-primary"
              >
                <Plus className="w-3 h-3 mr-1" /> Horário
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addSpecialDate} className="text-xs rounded-xl">
            <CalendarPlus className="w-3 h-3 mr-1" /> Adicionar Data Especial
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="blocked">
        <div className="space-y-3">
          {blockedDates.map((bd, i) => (
            <div key={i} className="bg-muted/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={bd.date}
                  onChange={(e) => updateBlockedDate(i, "date", e.target.value)}
                  className="rounded-lg text-xs h-8 w-36"
                />
                <Input
                  value={bd.reason}
                  onChange={(e) => updateBlockedDate(i, "reason", e.target.value)}
                  placeholder="Motivo"
                  className="rounded-lg text-xs h-8 flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => setBlockedDates(blockedDates.filter((_, j) => j !== i))}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-3 pl-2">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bd.full_day !== false}
                    onChange={(e) => updateBlockedDate(i, "full_day", e.target.checked)}
                    className="accent-[#F97316]"
                  />
                  Dia inteiro
                </label>
                {bd.full_day === false && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={bd.start_time || ""}
                      onChange={(e) => updateBlockedDate(i, "start_time", e.target.value)}
                      className="rounded-lg text-xs h-8 w-24"
                    />
                    <span className="text-muted-foreground text-xs">até</span>
                    <Input
                      type="time"
                      value={bd.end_time || ""}
                      onChange={(e) => updateBlockedDate(i, "end_time", e.target.value)}
                      className="rounded-lg text-xs h-8 w-24"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={addBlockedDate} className="text-xs rounded-xl">
            <CalendarOff className="w-3 h-3 mr-1" /> Bloquear Data
          </Button>
        </div>
      </TabsContent>

      <div className="mt-4 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
        >
          <Save className="w-4 h-4 mr-1" />
          Salvar Grade
        </Button>
      </div>
    </Tabs>
  );
}