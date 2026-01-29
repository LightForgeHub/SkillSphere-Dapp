import Link from "next/link";

interface RightPanelProps {
  formData: {
    email: string;
    password: string;
    confirmPassword: string;
  };
  errors: Record<string, string>;
  agreedToTerms: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTermsChange: (checked: boolean) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignUp: () => void;
}

const RightPanel = ({
  formData,
  errors,
  agreedToTerms,
  onInputChange,
  onTermsChange,
  onSubmit,
  onGoogleSignUp,
}: RightPanelProps) => {
  return (
    <div className="w-full lg:w-1/2 xl:w-[49%] flex items-center justify-center p-6 sm:p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-[#613485] dark:text-white text-4xl sm:text-5xl font-bold mb-3">
            Sign Up
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Create an account on{" "}
            <span className="text-[#613485] dark:text-white font-medium">SkillSphere</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <button
            type="button"
            onClick={onGoogleSignUp}
            className="w-full dark:bg-[#613485] dark:text-white bg-white text-gray-800 font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <path
                d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
                fill="#4285F4"
              />
              <path
                d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
                fill="#34A853"
              />
              <path
                d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
                fill="#FBBC05"
              />
              <path
                d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
                fill="#EA4335"
              />
            </svg>
            Sign up with Google
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-700"></div>
            <span className="text-gray-400 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>

          <div>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onInputChange}
              placeholder="Moses"
              className={`w-full bg-transparent border ${
                errors.email ? "border-red-500" : "border-gray-600"
              } dark:text-white text-dark px-5 py-4 rounded-lg focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-500`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={onInputChange}
              placeholder="Password"
              className={`w-full bg-transparent border ${
                errors.password ? "border-red-500" : "border-gray-600"
              } text-white px-5 py-4 rounded-lg focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-500`}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 ml-1">
                {errors.password}
              </p>
            )}
          </div>

          <div>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={onInputChange}
              placeholder="Confirm Password"
              className={`w-full bg-transparent border ${
                errors.confirmPassword ? "border-red-500" : "border-gray-600"
              } text-white px-5 py-4 rounded-lg focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-500`}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1 ml-1">
                {errors.confirmPassword}
              </p>
            )}
            <p className="text-gray-500 text-xs mt-2 ml-1">
              At least 8 characters
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => onTermsChange(e.target.checked)}
              className="mt-1 w-4 h-4 accent-purple-600 cursor-pointer"
            />
            <label
              htmlFor="terms"
              className="text-gray-400 text-sm cursor-pointer"
            >
              By registering you agree to our{" "}
              <span className="text-[#613485] hover:underline">
                Terms & Conditions
              </span>
            </label>
          </div>
          {errors.terms && (
            <p className="text-red-500 text-xs ml-1 -mt-3">{errors.terms}</p>
          )}

        <Link href="/marketplace">
          <button
            type="submit"
            className="w-full cursor-pointer bg-[#613485] font-semibold py-4 px-6 rounded-lg transition-all hover:opacity-90"
          >
            Sign Up
          </button></Link>

          <p className="text-center text-gray-400 text-sm">
            Already have and account?{" "}
            <a href="#" className="text-[#613485] hover:underline font-medium">
              Sign In
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RightPanel;
