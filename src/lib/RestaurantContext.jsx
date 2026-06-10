import React, { createContext, useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const RestaurantContext = createContext(null);

export function RestaurantProvider({ children }) {
  const { data: restaurants = [], refetch: refetchRestaurants } = useQuery({
    queryKey: ["restaurants"],
    queryFn: () => base44.entities.Restaurant.list(),
  });

  const [selectedId, setSelectedId] = useState(
    () => localStorage.getItem("selected_restaurant_id") || ""
  );

  const selectRestaurant = (id) => {
    setSelectedId(id);
    localStorage.setItem("selected_restaurant_id", id);
  };

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