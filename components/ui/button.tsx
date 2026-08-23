import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Button specs: height 44px (default), padding 0 16px (lg) / 0 12px (md),
 * radius 12px, Inter Medium 14-16px. `hero` is the taller call to action the
 * home page leads with (60px tall, wider padding).
 */

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "text";
export type ButtonSize = "md" | "lg" | "hero";

const base =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 " +
  "disabled:cursor-not-allowed";

const sizes: Record<ButtonSize, string> = {
  md: "h-11 gap-2 px-3 text-body",
  lg: "h-11 gap-2 px-4 text-body-lg",
  hero: "h-15 gap-6 px-7 text-body-lg",
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

/** Button styling for elements that cannot be a `<button>`, such as a link. */
export function buttonClassName({
  variant = "primary",
  size = "lg",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(base, sizes[size], variants[variant], className);
}

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
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}
