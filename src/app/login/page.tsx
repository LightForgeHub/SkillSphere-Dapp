"use client";

import LoginCard from "./components/LoginCard";

const LoginPage = () => {
  const handleSignIn = (data: any) => {
    console.log("Sign in data:", data);
    alert("Sign In - Integration required");
  };

  const handleGoogleSignIn = () => {
    console.log("Google sign in clicked");
    alert("Google Sign In - Integration required");
  };

  return (
    <div
      className="min-h-screen bg-background w-full flex items-center justify-center p-6 relative overflow-hidden"
     
    >
      {/* Background Sphere */}
      <img 
        src="/Sphere.svg" 
        alt="background" 
        className="absolute top-1/2 left-1/2 right-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1200px] h-auto opacity-0 dark:opacity-100 pointer-events-none"
      />
      
      <LoginCard onSignIn={handleSignIn} onGoogleSignIn={handleGoogleSignIn} />
    </div>
  );
};

export default LoginPage;
