"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Copy, Check } from "lucide-react";

const SUPPORT_EMAIL = "support@skillsphere.com";

export default function ContactInfo() {
  const [copied, setCopied] = useState(false);

  function copyEmail() {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold font-space-grotesk mb-2">Get in Touch</h2>
        <p className="text-gray-400 font-inter text-sm">
          Have a question or need support? Reach out and our team will respond promptly.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Email */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20">
          <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 shrink-0">
            <Mail className="w-5 h-5 text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-400 font-inter mb-1">Support Email</p>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-sm font-medium text-foreground hover:text-purple-400 transition-colors break-all"
              >
                {SUPPORT_EMAIL}
              </a>
              <button
                onClick={copyEmail}
                className="p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-purple-400 shrink-0"
                title="Copy email"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20">
          <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 shrink-0">
            <Phone className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-inter mb-1">Phone</p>
            <p className="text-sm font-medium">+1 (800) 555-0199</p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20">
          <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 shrink-0">
            <MapPin className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-inter mb-1">Location</p>
            <p className="text-sm font-medium">Remote — Worldwide</p>
          </div>
        </div>
      </div>

      {/* Decorative dots */}
      <div className="flex gap-2 mt-4">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
