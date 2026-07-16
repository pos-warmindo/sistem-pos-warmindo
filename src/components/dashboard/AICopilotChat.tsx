"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sparkles,
  X,
  Loader2,
  TrendingUp,
  Package,
  Target,
  ArrowUp,
  DollarSign,
  Brain,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { chatWithCopilot } from "@/app/actions/ai-chat";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "model";
  text: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PRIMARY_ACTIONS = [
  {
    icon: TrendingUp,
    label: "Analisis Penjualan",
    prompt: "Tolong berikan analisis penjualan hari ini secara detail.",
  },
  {
    icon: Package,
    label: "Cek Stok",
    prompt: "Bagaimana kondisi stok bahan baku saat ini? Apakah ada yang menipis?",
  },
  {
    icon: DollarSign,
    label: "Ringkasan Laba",
    prompt: "Berikan ringkasan laba kotor untuk hari ini.",
  },
  {
    icon: Target,
    label: "Target Bisnis",
    prompt: "Buatkan rencana dan target penjualan untuk besok.",
  },
];

const SUGGESTED_QUESTIONS = [
  { label: "Pendapatan Hari Ini", prompt: "Berapa total pendapatan hari ini dan dari berapa transaksi?" },
  { label: "Produk Terlaris", prompt: "Apa saja produk terlaris dalam 7 hari terakhir?" },
  { label: "Stok Menipis", prompt: "Bahan baku apa saja yang stoknya menipis atau kritis saat ini?" },
  { label: "Prediksi Besok", prompt: "Buatkan prediksi pendapatan besok berdasarkan tren penjualan 7 hari terakhir, dan sertakan alasannya secara ringkas." },
  { label: "Laporan Mingguan", prompt: "Buatkan ringkasan laporan penjualan 7 hari terakhir mencakup pendapatan, jumlah transaksi, dan metode pembayaran." },
  { label: "Analisis Profit", prompt: "Berikan analisis profit shift yang sedang berjalan berdasarkan modal awal." },
];

// ─── Animation Variants ──────────────────────────────────────────────────────
const panelVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    y: 16,
    scale: 0.98,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

const messageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 28 },
  },
};

const cardVariants: Variants = {
  rest: { y: 0, boxShadow: "0px 1px 2px rgba(0,0,0,0.05)" },
  hover: { y: -2, boxShadow: "0px 4px 12px rgba(0,0,0,0.08)", transition: { duration: 0.2 } },
  tap: { y: 0, scale: 0.98 },
};

const pillVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
  tap: { scale: 0.96 },
};

// ─── Markdown Components ─────────────────────────────────────────────────────
const markdownComponents = {
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 last:mb-0 leading-[1.6]">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-[1.6]">{children}</li>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="font-bold text-lg mb-2 text-slate-900">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="font-bold text-base mb-2 text-slate-900">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="font-semibold text-sm mb-1 text-slate-800">{children}</h3>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-slate-100 rounded px-1.5 py-0.5 text-[13px] font-mono text-orange-600 border border-slate-200/60">
      {children}
    </code>
  ),
  hr: () => <hr className="border-slate-200 my-4" />,
};

// ─── Sub-Components ──────────────────────────────────────────────────────────
function AIAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-200 overflow-hidden relative">
      <Image src="/logo.png" alt="AI Logo" fill sizes="64px" className="object-cover" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      className="flex items-start gap-3 max-w-[75%] self-start"
    >
      <AIAvatar />
      <div className="px-4 py-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-1.5 shadow-sm">
        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AICopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  // Start with empty state as requested so the Welcome Section shows first
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);


  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    setInput("");

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", text: messageText.trim() },
    ];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const result = await chatWithCopilot(updatedMessages);

      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { role: "model", text: `[Error]: ${result.error}` },
        ]);
      } else {
        // Selalu tampilkan balasan; jika kosong beri fallback agar tidak
        // ada pesan yang hilang tanpa jejak.
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: result.text?.trim()
              ? result.text
              : "Maaf, saya belum bisa menyusun jawaban untuk permintaan itu. Coba perjelas pertanyaannya.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "[Error]: Terjadi kesalahan jaringan saat menghubungi AI.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    await handleSendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── FAB (closed state) ──────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <motion.div
        className="fixed bottom-24 right-4 md:bottom-10 md:right-10 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg shadow-orange-300/40 bg-white hover:bg-slate-50 transition-all duration-200 p-0 border border-slate-200 relative overflow-hidden"
          aria-label="Buka WP2 Copilot"
        >
          <Image src="/logo.png" alt="AI Logo" fill sizes="64px" className="object-cover p-1" />
        </Button>
      </motion.div>
    );
  }

  // ─── Chat Panel (open state) ─────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        key="copilot-panel"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50"
      >
        <Card className="w-[calc(100vw-2rem)] md:w-[440px] h-[600px] max-h-[calc(100vh-8rem)] shadow-2xl shadow-slate-900/10 flex flex-col border border-slate-200 overflow-hidden rounded-2xl p-0 bg-[#FAFAFA]">
          {/* ── Header ────────────────────────────────────────────────── */}
          <CardHeader className="bg-white h-[64px] px-5 py-5 border-b border-slate-200 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex flex-col justify-center">
                <h3 className="font-semibold text-[16px] text-slate-800 leading-none">
                  Asisten Warmindo
                </h3>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full h-8 w-8 transition-colors duration-200"
              onClick={() => setIsOpen(false)}
              aria-label="Tutup chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          {/* ── Chat Area ──────────────────────────────────────────────── */}
          <CardContent className="flex-1 p-0 overflow-hidden relative">
            <ScrollArea className="h-full w-full">
              <div className="flex flex-col gap-5 p-5 pb-4">
                {/* ── Welcome Area ── */}
                {messages.length === 0 && (
                  <motion.div
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col items-center pt-8 pb-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-lg shadow-slate-200/50 mb-6 relative overflow-hidden">
                      <Image src="/logo.png" alt="AI Logo" fill sizes="64px" className="object-cover" />
                    </div>

                    <h2 className="text-[20px] font-bold text-slate-800 mb-3 text-center tracking-tight">
                      Perkenalkan Saya Asisten Warmindo
                    </h2>

                    <p className="text-[12px] text-slate-500 text-center leading-[1.6] max-w-[320px] mb-8">
                      Saya siap membantu menganalisis penjualan, stok, laba, pelanggan, dan performa bisnis Anda.
                    </p>

                    {/* Suggested Questions */}
                    <div className="w-full">
                      <p className="text-[12px] font-bold text-slate-400 mb-3 tracking-wider">
                        Coba Tanyakan
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTED_QUESTIONS.map((question, idx) => (
                          <motion.button
                            key={idx}
                            variants={pillVariants}
                            initial="rest"
                            whileHover="hover"
                            whileTap="tap"
                            onClick={() => handleSendMessage(question.prompt)}
                            className="px-3.5 py-2 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:border-[#FF7A00] hover:text-[#FF7A00] transition-colors shadow-sm"
                          >
                            {question.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Messages ── */}
                <AnimatePresence>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      variants={messageVariants}
                      initial="hidden"
                      animate="visible"
                      className={cn(
                        "flex items-start gap-3 max-w-[75%]",
                        msg.role === "user"
                          ? "self-end flex-row-reverse"
                          : "self-start"
                      )}
                    >
                      {/* Avatar */}
                      {msg.role === "model" ? (
                        <AIAvatar />
                      ) : (
                        <Avatar className="w-7 h-7 shrink-0 ring-1 ring-orange-200 shadow-sm">
                          <AvatarFallback className="bg-white text-[#FF7A00] text-[11px] font-bold">
                            U
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Bubble */}
                      <div
                        className={cn(
                          "px-4 py-3.5 rounded-2xl text-[15px] leading-[1.6] shadow-sm",
                          msg.role === "user"
                            ? "bg-[#FFF4ED] text-[#9a4a00] border border-[#FFE4CC] rounded-tr-sm whitespace-pre-wrap font-medium"
                            : "bg-white text-[#1F2937] border border-slate-200 rounded-tl-sm"
                        )}
                      >
                        {msg.role === "user" ? (
                          msg.text
                        ) : (
                          <ReactMarkdown components={markdownComponents}>
                            {msg.text}
                          </ReactMarkdown>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing Indicator */}
                {isLoading && <TypingIndicator />}

                {/* Suggested Questions below messages */}
                {messages.length > 0 && (
                  <div className="w-full pt-2">
                    <p className="text-[12px] font-bold text-slate-400 mb-3 tracking-wider">
                      Coba Tanyakan
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_QUESTIONS.map((question, idx) => (
                        <motion.button
                          key={idx}
                          variants={pillVariants}
                          initial="rest"
                          whileHover="hover"
                          whileTap="tap"
                          onClick={() => handleSendMessage(question.prompt)}
                          className="px-3.5 py-2 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:border-[#FF7A00] hover:text-[#FF7A00] transition-colors shadow-sm"
                        >
                          {question.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>

          {/* ── Input Area ─────────────────────────────────────────────── */}
          <CardFooter className="px-5 py-4 bg-[#FAFAFA] border-t border-slate-200 shrink-0">
            <form
              className="flex w-full items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <Input
                placeholder="Tanyakan penjualan, stok, laba..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1 h-12 rounded-full border-slate-300 bg-white text-[14px] placeholder:text-[#9CA3AF] focus-visible:ring-2 focus-visible:ring-[#FF7A00]/20 focus-visible:border-[#FF7A00] px-5 shadow-sm transition-all"
                aria-label="Ketik pertanyaan"
              />
              <motion.div
                variants={pillVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isLoading}
                  className="rounded-full h-12 w-12 bg-gradient-to-br from-[#FF7A00] to-[#FFA94D] hover:from-[#e66e00] hover:to-[#ff9933] shadow-md shadow-orange-200 disabled:opacity-50 disabled:shadow-none transition-all"
                  aria-label="Kirim pesan"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <ArrowUp className="h-5 w-5 text-white" />
                  )}
                </Button>
              </motion.div>
            </form>
          </CardFooter>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
