import { base44 } from "@/api/base44Client";
import { normalizePhone } from "./phone";
import { format } from "date-fns";

// Busca ou cria o cliente pelo telefone normalizado e retorna o id.
// Fail-safe: nunca lança erro (a página pública da fila não pode falhar por RLS).
export async function linkCustomer(restaurantId, { name, phone, email }) {
  const normalized = normalizePhone(phone);
  if (!restaurantId || !normalized || normalized.length < 12) return null;
  try {
    const existing = await base44.entities.Customer.filter({
      restaurant_id: restaurantId,
      phone: normalized,
    });
    if (existing.length > 0) {
      const c = existing[0];
      const updates = {};
      if (name && !c.name) updates.name = name;
      if (email && !c.email) updates.email = email;
      if (Object.keys(updates).length > 0) {
        await base44.entities.Customer.update(c.id, updates);
      }
      return c.id;
    }
    const created = await base44.entities.Customer.create({
      name: name || "Cliente",
      phone: normalized,
      ...(email ? { email } : {}),
      restaurant_id: restaurantId,
    });
    return created.id;
  } catch {
    return null;
  }
}

// Vincula o cliente a uma entrada da fila no momento em que a equipe (autenticada)
// interage com ela — cobre entradas criadas pela página pública sem permissão de criar Customer.
export async function ensureWaitlistCustomer(entry) {
  if (!entry) return null;
  if (entry.customer_id) return entry.customer_id;
  if (!entry.customer_phone) return null;
  const customerId = await linkCustomer(entry.restaurant_id, {
    name: entry.customer_name,
    phone: entry.customer_phone,
    email: entry.customer_email,
  });
  if (customerId) {
    await base44.entities.WaitlistEntry.update(entry.id, { customer_id: customerId });
  }
  return customerId;
}

export async function recordVisit(customerId) {
  if (!customerId) return;
  const [c] = await base44.entities.Customer.filter({ id: customerId });
  if (!c) return;
  await base44.entities.Customer.update(customerId, {
    visits_count: (c.visits_count || 0) + 1,
    last_visit_date: format(new Date(), "yyyy-MM-dd"),
  });
}

export async function recordNoShow(customerId) {
  if (!customerId) return;
  const [c] = await base44.entities.Customer.filter({ id: customerId });
  if (!c) return;
  await base44.entities.Customer.update(customerId, {
    no_show_count: (c.no_show_count || 0) + 1,
  });
}