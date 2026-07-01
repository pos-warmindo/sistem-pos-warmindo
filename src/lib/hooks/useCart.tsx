"use client";

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { Database } from "@/types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Modifier = Database["public"]["Tables"]["product_modifiers"]["Row"];

export interface CartItem {
  itemKey: string;
  product: Product;
  modifiers: Modifier[];
  quantity: number;
  lineTotal: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addItem: (product: Product, selectedModifiers: Modifier[]) => void;
  removeItem: (itemKey: string) => void;
  updateQuantity: (itemKey: string, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  total: number;
  itemCount: number;
  isCheckoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const generateItemKey = (productId: string, modifiers: Modifier[]): string => {
  const sortedModifierIds = [...modifiers]
    .map((m) => m.id)
    .sort();
  return sortedModifierIds.length > 0
    ? `${productId}-${sortedModifierIds.join("_")}`
    : productId;
};

const calculateItemPrice = (product: Product, modifiers: Modifier[]): number => {
  const basePrice = product.base_price;
  const modifiersPrice = modifiers.reduce((acc, m) => acc + (m.price_delta || 0), 0);
  return basePrice + modifiersPrice;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);

  const addItem = useCallback((product: Product, selectedModifiers: Modifier[]) => {
    const itemKey = generateItemKey(product.id, selectedModifiers);
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.itemKey === itemKey);
      if (existingIndex > -1) {
        const newItems = [...prevItems];
        const existingItem = newItems[existingIndex];
        const newQuantity = existingItem.quantity + 1;
        const singlePrice = calculateItemPrice(product, selectedModifiers);
        newItems[existingIndex] = {
          ...existingItem,
          quantity: newQuantity,
          lineTotal: singlePrice * newQuantity,
        };
        return newItems;
      } else {
        const singlePrice = calculateItemPrice(product, selectedModifiers);
        const newItem: CartItem = {
          itemKey,
          product,
          modifiers: selectedModifiers,
          quantity: 1,
          lineTotal: singlePrice,
        };
        return [...prevItems, newItem];
      }
    });
  }, []);

  const removeItem = useCallback((itemKey: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.itemKey !== itemKey));
  }, []);

  const updateQuantity = useCallback((itemKey: string, delta: number) => {
    setCartItems((prevItems) => {
      return prevItems.map((item) => {
        if (item.itemKey === itemKey) {
          const newQuantity = Math.max(1, item.quantity + delta);
          const singlePrice = calculateItemPrice(item.product, item.modifiers);
          return {
            ...item,
            quantity: newQuantity,
            lineTotal: singlePrice * newQuantity,
          };
        }
        return item;
      });
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.lineTotal, 0);
  }, [cartItems]);

  const total = subtotal;

  const itemCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        total,
        itemCount,
        isCheckoutOpen,
        setCheckoutOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
