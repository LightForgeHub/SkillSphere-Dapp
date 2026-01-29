"use client";

import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface LoginCardProps {
  onSignIn: (data: any) => void;
  onGoogleSignIn: () => void;
}

const LoginCard = ({ onSignIn, onGoogleSignIn }: LoginCardProps) => {
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
       background: "linear-gradient(180deg, #674284 0%, #603186 12.68%, #311745 47.53%, #09020F 67.16%)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        borderBottom: "7px solid #634D74" 
      }}
    >
      {/* Background Sphere Glow */}
      <img 
        src="/sphere-glass.svg" 
        alt="background sphere" 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[548px] max-h-[548px] object-cover opacity-30 pointer-events-none z-0"
      />

      <div className="relative z-10 flex flex-col items-center">
        <h2 className="text-white text-2xl font-bold mb-12 tracking-wide">SkillSphere</h2>

        <div className="text-center mb-8">
          <h1 className="text-white text-4xl font-bold mb-2">Sign In With Email</h1>
          <p className="text-gray-300 text-sm max-w-[250px] mx-auto leading-relaxed">
            Continue your journey in our NFT marketplace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-[399px] space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail size={20} />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-[#10041A] border border-white rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock size={20} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-[#10041A] border border-white rounded-xl py-4 pl-12 pr-12 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="text-right">
            <a href="#" className="text-gray-400 text-xs hover:text-white transition-colors">
              Forgot Password
            </a>
          </div>
      <Link href="/marketplace">          <button
            type="submit"
            className="w-full cursor-pointer bg-[#613485] hover:bg-[#723e9c] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-900/20 mt-4 active:scale-[0.98]"
          >
            Sign In
          </button> </Link>
 

          <div className="text-center pt-6 pb-2">
            <span className="text-gray-400 text-sm">or Sign in with</span>
          </div>

          <div className="flex justify-center">
             <Link href="/marketplace">   <button
              type="button"
              onClick={onGoogleSignIn}
              className="w-12 h-12 flex items-center justify-center bg-[#1a0b2e] rounded-xl border border-white/10 hover:border-white/20 transition-all active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </button></Link>
          
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginCard;
