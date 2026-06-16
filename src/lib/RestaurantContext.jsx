import React, { createContext, useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

const RestaurantContext = createContext(null);

export function RestaurantProvider({ children }) {
  const { user } = useAuth();

  const { data: allRestaurants = [], refetch: refetchRestaurants } = useQuery({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("restaurants").select("*");
      if (error) throw error;
      return data;
    },
  });

  const [selectedId, setSelectedId] = useState(
    () => localStorage.getItem("selected_restaurant_id") || ""
  );

  const selectRestaurant = (id) => {
    setSelectedId(id);
    localStorage.setItem("selected_restaurant_id", id);
  };

  const isAdmin = user?.role === "admin";
  const restaurants = isAdmin
    ? allRestaurants
    : allRestaurants.filter((r) => r.id === user?.restaurant_id);

  const restaurant =
    restaurants.find((r) => r.id === selectedId) || restaurants[0] || null;

  return (
    <RestaurantContext.Provider
      value={{ restaurants, restaurant, selectRestaurant, refetchRestaurants }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  return useContext(RestaurantContext);
}
