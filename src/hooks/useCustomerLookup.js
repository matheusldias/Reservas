import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { normalizePhone } from "@/lib/phone";

// Busca cliente pelo telefone digitado (após número completo). Fail-safe.
export default function useCustomerLookup(restaurantId, phone) {
  const normalized = normalizePhone(phone);
  const enabled = !!restaurantId && normalized.length >= 12;

  const { data } = useQuery({
    queryKey: ["customer-lookup", restaurantId, normalized],
    queryFn: async () => {
      try {
        return await base44.entities.Customer.filter({
          restaurant_id: restaurantId,
          phone: normalized,
        });
      } catch {
        return [];
      }
    },
    enabled,
  });

  return enabled && data?.length ? data[0] : null;
}