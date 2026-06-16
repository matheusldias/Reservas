import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/phone";

// Busca cliente pelo telefone digitado (após número completo). Fail-safe.
export default function useCustomerLookup(restaurantId, phone) {
  const normalized = normalizePhone(phone);
  const enabled = !!restaurantId && normalized.length >= 12;

  const { data } = useQuery({
    queryKey: ["customer-lookup", restaurantId, normalized],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("customers")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("phone", normalized)
          .limit(1);
        return data || [];
      } catch {
        return [];
      }
    },
    enabled,
  });

  return enabled && data?.length ? data[0] : null;
}
