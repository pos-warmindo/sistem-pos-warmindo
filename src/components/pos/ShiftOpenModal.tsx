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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(modalAwal);
    if (isNaN(amount) || amount < 0) {
      setError("Modal awal harus berupa angka positif.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onOpenShift(amount);
    } catch (err: any) {
      setError(err.message || "Gagal membuka shift.");
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
              <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted">
                Rp
              </span>
              <Input
                id="modal_awal"
                type="number"
                min="0"
                placeholder="0"
                className="pl-9"
                value={modalAwal}
                onChange={(e) => setModalAwal(e.target.value)}
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
            disabled={isSubmitting}
          >
            {isSubmitting ? "Membuka Shift..." : "Buka Shift"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
