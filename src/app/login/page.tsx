"use client";

import LoginCard from "./components/LoginCard";
import SocialLogin from "@/components/auth/SocialLogin";

const LoginPage = () => {
  const handleSignIn = (data: { email: string; password: string }) => {
    console.log("Sign in data:", data);
    // TODO: wire up email/password auth when the backend endpoint is ready
  };

  return (
    <div className="min-h-screen bg-background w-full flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Sphere */}
      <img
        src="/Sphere.svg"
        alt=""
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 right-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1200px] h-auto opacity-0 dark:opacity-100 pointer-events-none"
      />

      <LoginCard
        onSignIn={handleSignIn}
        socialLoginSlot={<SocialLogin callbackUrl="/marketplace" />}
      />
    </div>
  );
};

export default LoginPage;
