"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Send, Sparkles, User, X, MessageSquare, Loader2 } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { chatWithCopilot } from "@/app/actions/ai-chat";

interface Message {
  role: "user" | "model";
  text: string;
}

export function AICopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Halo! Saya AI Business Insight Copilot. Ada yang ingin Anda tanyakan tentang performa penjualan atau stok bahan baku hari ini?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message to UI immediately
    const updatedMessages: Message[] = [...messages, { role: "user", text: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const result = await chatWithCopilot(updatedMessages);
      
      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { role: "model", text: `[Error]: ${result.error}` },
        ]);
      } else if (result.text) {
        setMessages((prev) => [
          ...prev,
          { role: "model", text: result.text },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "[Error]: Terjadi kesalahan jaringan saat menghubungi AI." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 h-14 w-14 rounded-full shadow-xl bg-orange-500 hover:bg-orange-600 transition-all duration-300 z-50 p-0"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-[calc(100vw-2rem)] md:w-[400px] h-[500px] max-h-[calc(100vh-6rem)] shadow-2xl flex flex-col z-50 border-orange-200 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-400 p-4 text-white flex flex-row items-center justify-between space-y-0 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="bg-white/20 p-2 rounded-full">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">WP2 AI Copilot</h3>
            <p className="text-xs text-orange-100 opacity-90">Asisten Bisnis Anda</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 hover:text-white rounded-full h-8 w-8"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden relative bg-slate-50">
        <ScrollArea className="h-full w-full p-4">
          <div className="flex flex-col space-y-4 pb-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-end space-x-2 max-w-[85%]",
                  msg.role === "user" ? "self-end flex-row-reverse space-x-reverse" : "self-start"
                )}
              >
                <Avatar className="w-8 h-8 shrink-0 border border-slate-200">
                  {msg.role === "model" ? (
                    <AvatarFallback className="bg-orange-100 text-orange-600"><Bot className="w-4 h-4"/></AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-slate-200 text-slate-700"><User className="w-4 h-4"/></AvatarFallback>
                  )}
                </Avatar>
                
                <div
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap shadow-sm",
                    msg.role === "user"
                      ? "bg-orange-500 text-white rounded-br-sm"
                      : "bg-white text-slate-800 border border-slate-100 rounded-bl-sm"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-end space-x-2 max-w-[85%] self-start">
                <Avatar className="w-8 h-8 shrink-0 border border-slate-200">
                  <AvatarFallback className="bg-orange-100 text-orange-600"><Bot className="w-4 h-4"/></AvatarFallback>
                </Avatar>
                <div className="px-4 py-3 bg-white border border-slate-100 rounded-2xl rounded-bl-sm flex items-center space-x-1 shadow-sm">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-3 bg-white border-t border-slate-100">
        <form 
          className="flex w-full items-center space-x-2"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <Input
            placeholder="Tanya soal performa penjualan..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 rounded-full border-slate-200 focus-visible:ring-orange-500 bg-slate-50 pr-4"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="rounded-full bg-orange-500 hover:bg-orange-600 shrink-0 h-10 w-10 shadow-sm"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
