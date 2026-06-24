"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

type RawMaterial = Database["public"]["Tables"]["raw_materials"]["Row"];
type ProductRecipe = Database["public"]["Tables"]["product_recipes"]["Row"];

export function useStockRealtime() {
  const supabase = createClient();
  
  // Local cache for material stocks: { [material_id]: current_stock }
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  
  // Local cache for product recipes: { [product_id]: Recipe[] }
  const [recipes, setRecipes] = useState<Record<string, ProductRecipe[]>>({});
  
  const [isLoading, setIsLoading] = useState(true);

  // Initialize stocks and recipes
  useEffect(() => {
    let active = true;

    async function initStockAndRecipes() {
      try {
        // Fetch raw materials
        const { data: materialsData, error: materialsError } = await supabase
          .from("raw_materials")
          .select("id, current_stock");

        if (materialsError) {
          console.error("[useStockRealtime] Error loading materials:", materialsError);
        } else if (materialsData && active) {
          const initialStockMap: Record<string, number> = {};
          materialsData.forEach((item) => {
            initialStockMap[item.id] = item.current_stock;
          });
          setStockMap(initialStockMap);
        }

        // Fetch product recipes
        const { data: recipesData, error: recipesError } = await supabase
          .from("product_recipes")
          .select("*");

        if (recipesError) {
          console.error("[useStockRealtime] Error loading recipes:", recipesError);
        } else if (recipesData && active) {
          const recipeGroups: Record<string, ProductRecipe[]> = {};
          recipesData.forEach((recipe) => {
            if (!recipeGroups[recipe.product_id]) {
              recipeGroups[recipe.product_id] = [];
            }
            recipeGroups[recipe.product_id].push(recipe);
          });
          setRecipes(recipeGroups);
        }
      } catch (err) {
        console.error("[useStockRealtime] Initialization failed:", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    initStockAndRecipes();

    // Subscribe to realtime updates on raw_materials table
    const channel = supabase
      .channel("realtime-raw-materials")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "raw_materials",
        },
        (payload) => {
          const updatedMaterial = payload.new as RawMaterial;
          if (updatedMaterial && updatedMaterial.id) {
            setStockMap((prev) => ({
              ...prev,
              [updatedMaterial.id]: updatedMaterial.current_stock,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Helper to check product availability based on recipe constraints
  const isProductAvailable = useCallback(
    (productId: string): boolean => {
      const productRecipes = recipes[productId];
      
      // If product has no defined recipes, it is available by default
      if (!productRecipes || productRecipes.length === 0) {
        return true;
      }

      // Return true if all ingredient constraints are met
      return productRecipes.every((recipe) => {
        const currentStock = stockMap[recipe.material_id] ?? 0;
        
        // Stock must be greater than 0 AND satisfy the recipe quantity requirement
        return currentStock > 0 && currentStock >= recipe.quantity_used;
      });
    },
    [recipes, stockMap]
  );

  return {
    stockMap,
    isLoading,
    isProductAvailable,
  };
}
