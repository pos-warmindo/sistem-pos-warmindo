"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Banknote } from "@/lib/icons";
import { getErrorMessage } from "@/lib/utils/error";

interface ShiftOpenModalProps {
  isOpen: boolean;
  onOpenShift: (modalAwal: number) => Promise<any>;
  onOpenChange?: (open: boolean) => void;
}

export default function ShiftOpenModal({
  isOpen,
  onOpenShift,
  onOpenChange,
}: ShiftOpenModalProps) {
  const [modalAwal, setModalAwal] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (val: string) => {
    setModalAwal(val);
    if (val === "") {
      setError(null);
      return;
    }
    const amount = parseFloat(val);
    if (isNaN(amount) || amount < 50000) {
      setError("Modal awal minimal harus Rp 50.000.");
    } else {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(modalAwal);
    if (isNaN(amount) || amount < 50000) {
      setError("Modal awal minimal harus Rp 50.000.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onOpenShift(amount);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-heading">
            <Banknote className="size-5 text-primary" />
            Buka Shift Baru
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modal_awal">Modal Awal (Rp)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                Rp
              </span>
              <Input
                id="modal_awal"
                type="number"
                min="50000"
                placeholder="50000"
                className="pl-9"
                value={modalAwal}
                onChange={(e) => handleInputChange(e.target.value)}
                required
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover text-white"
            disabled={isSubmitting || !!error || !modalAwal || parseFloat(modalAwal) < 50000}
          >
            {isSubmitting ? "Membuka Shift..." : "Buka Shift"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
