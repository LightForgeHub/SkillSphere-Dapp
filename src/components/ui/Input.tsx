import * as React from "react";

import { cn } from "./utils";

interface InputProps extends React.ComponentProps<"input"> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

function Input({ className, type, leftIcon, rightIcon, ...props }: InputProps) {
  return (
    <div className="relative flex items-center w-full group">
      {leftIcon && (
        <div className="absolute left-3 text-muted-foreground group-focus-within:text-primary transition-colors">
          {leftIcon}
        </div>
      )}
      <input
        type={type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
          "bg-input border-border flex h-11 w-full rounded-lg border px-3 py-2 text-sm transition-all outline-none",
          "focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          leftIcon && "pl-10",
          rightIcon && "pr-10",
          className,
        )}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3 text-muted-foreground group-focus-within:text-primary transition-colors">
          {rightIcon}
        </div>
      )}
    </div>
  );
}

export { Input };
