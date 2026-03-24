"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/components/ui/utils";

type FormData = { name: string; email: string; subject: string; message: string };
type FormErrors = Partial<FormData>;

const INITIAL: FormData = { name: "", email: "", subject: "", message: "" };

export default function ContactForm() {
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.subject.trim()) e.subject = "Subject is required.";
    if (!form.message.trim()) e.message = "Message is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
    setForm(INITIAL);
    setErrors({});
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full blur-xl opacity-40 animate-pulse" />
          <div className="relative bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-full p-5">
            <CheckCircle className="w-12 h-12 text-purple-400" strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-space-grotesk">
          Message Sent!
        </h3>
        <p className="text-gray-400 font-inter max-w-xs">
          Thanks for reaching out. We&apos;ll get back to you as soon as possible.
        </p>
        <Button variant="outline" onClick={() => setSubmitted(false)} className="mt-2">
          Send Another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <Input
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={cn(errors.name && "border-red-500/70 focus:border-red-500/70 focus:ring-red-500/20")}
        />
        {errors.name && <p className="mt-1 text-xs text-red-400 font-inter">{errors.name}</p>}
      </div>

      <div>
        <Input
          type="email"
          placeholder="Email Address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={cn(errors.email && "border-red-500/70 focus:border-red-500/70 focus:ring-red-500/20")}
        />
        {errors.email && <p className="mt-1 text-xs text-red-400 font-inter">{errors.email}</p>}
      </div>

      <div>
        <Input
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className={cn(errors.subject && "border-red-500/70 focus:border-red-500/70 focus:ring-red-500/20")}
        />
        {errors.subject && <p className="mt-1 text-xs text-red-400 font-inter">{errors.subject}</p>}
      </div>

      <div>
        <textarea
          placeholder="Your message..."
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={cn(
            "bg-input border-border w-full rounded-lg border px-3 py-2 text-sm transition-all outline-none resize-none",
            "placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
            errors.message && "border-red-500/70 focus:border-red-500/70 focus:ring-red-500/20"
          )}
        />
        {errors.message && <p className="mt-1 text-xs text-red-400 font-inter">{errors.message}</p>}
      </div>

      <Button type="submit" variant="glow" className="w-full">
        Send Message
      </Button>
    </form>
  );
}
