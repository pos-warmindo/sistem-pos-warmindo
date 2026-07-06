"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi } from "@/lib/icons";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial check
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Koneksi internet pulih.", {
        icon: <Wifi className="size-4" />,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Koneksi internet terputus. Beberapa fitur mungkin tidak berfungsi.", {
        icon: <WifiOff className="size-4" />,
        duration: 10000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null; // This is a logic-only component
}
