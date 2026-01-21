"use client";

import { useState } from "react";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";

const SkillSphereSignUp = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the Terms & Conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name as keyof typeof errors]: "" }));
    }
  };

  const handleTermsChange = (checked: boolean) => {
    setAgreedToTerms(checked);
    if (errors.terms) setErrors((prev) => ({ ...prev, terms: "" }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateForm()) {
      console.log("Form submitted:", formData);
      alert("Account created successfully!");
    }
  };

  const handleGoogleSignUp = () => {
    console.log("Google sign up clicked");
    alert("Google Sign Up - Integration required");
  };

  return (
    <div
      className="min-h-screen flex"
      style={{
        background:
          "linear-gradient(210.99deg, #1E0333 13.06%, #06010A 59.44%)",
      }}
    >
      <LeftPanel />
      <RightPanel
        formData={formData}
        errors={errors}
        agreedToTerms={agreedToTerms}
        onInputChange={handleInputChange}
        onTermsChange={handleTermsChange}
        onSubmit={handleSubmit}
        onGoogleSignUp={handleGoogleSignUp}
      />
    </div>
  );
};

export default SkillSphereSignUp;
