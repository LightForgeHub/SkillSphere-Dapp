"use client";

import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

interface LoginCardProps {
  onSignIn: (data: { email: string; password: string }) => void;
  /**
   * Optional slot for social login buttons (e.g. <SocialLogin />).
   * When provided, replaces the old inline Google icon button.
   */
  socialLoginSlot?: ReactNode;
}

const LoginCard = ({ onSignIn, socialLoginSlot }: LoginCardProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignIn(formData);
  };

  return (
    <div
      className="w-full max-w-[600px] rounded-[32px] p-8 sm:p-12 relative overflow-hidden h-fit"
      style={{
        background:
          "linear-gradient(180deg, #674284 0%, #603186 12.68%, #311745 47.53%, #09020F 67.16%)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        borderBottom: "7px solid #634D74",
      }}
    >
      {/* Background Sphere Glow */}
      <img
        src="/sphere-glass.svg"
        alt=""
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[548px] max-h-[548px] object-cover opacity-30 pointer-events-none z-0"
      />

      <div className="relative z-10 flex flex-col items-center">
        <h2 className="text-white text-2xl font-bold mb-12 tracking-wide">
          SkillSphere
        </h2>

        <div className="text-center mb-8">
          <h1 className="text-white text-4xl font-bold mb-2">
            Sign In With Email
          </h1>
          <p className="text-gray-300 text-sm max-w-[250px] mx-auto leading-relaxed">
            Continue your journey in our NFT marketplace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-[399px] space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Mail size={20} />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-card border border-white rounded-xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock size={20} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-card border border-white rounded-xl py-4 pl-12 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="text-right">
            <a
              href="#"
              className="text-gray-400 text-xs hover:text-white transition-colors"
            >
              Forgot Password
            </a>
          </div>

          <Link href="/marketplace">
            <button
              type="submit"
              className="w-full cursor-pointer bg-[#613485] hover:bg-[#723e9c] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-900/20 mt-4 active:scale-[0.98]"
            >
              Sign In
            </button>
          </Link>

          {/* ── Social login ─────────────────────────────────────────── */}
          {socialLoginSlot && (
            <>
              <div className="flex items-center gap-3 pt-4 pb-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-gray-400 text-sm">or sign in with</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {socialLoginSlot}
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginCard;
