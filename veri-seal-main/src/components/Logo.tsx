import { Shield } from "lucide-react";

interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

export function Logo({ variant = "dark", size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  const colorClasses = variant === "light" 
    ? "text-primary-foreground" 
    : "text-primary";

  return (
    <div className={`flex items-center gap-2 ${colorClasses}`}>
      <Shield className={sizeClasses[size]} strokeWidth={2.5} />
      <span className={`font-semibold tracking-tight ${textSizes[size]}`}>
        Sealionyx
      </span>
    </div>
  );
}
