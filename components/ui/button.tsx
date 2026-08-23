import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Button specs: height 44px (default), padding 0 16px (lg) / 0 12px (md),
 * radius 12px, Inter Medium 14-16px.
 */

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "text";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 " +
  "disabled:cursor-not-allowed";

const sizes: Record<ButtonSize, string> = {
  md: "px-3 text-body",
  lg: "px-4 text-body-lg",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white hover:bg-[#ea580c] disabled:bg-primary-100 disabled:text-primary-300 disabled:hover:bg-primary-100",
  secondary:
    "border border-primary-500 bg-white text-primary-500 hover:bg-primary-100 " +
    "disabled:border-primary-200 disabled:text-primary-300 disabled:hover:bg-white",
  tertiary:
    "border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-100 " +
    "disabled:border-neutral-100 disabled:text-neutral-300 disabled:hover:bg-white",
  text:
    "px-0 text-primary-500 hover:text-[#ea580c] disabled:text-primary-300",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "lg",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
}
