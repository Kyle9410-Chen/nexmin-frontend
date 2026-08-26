import { useGravatarUrl } from "@/hooks/useGravatarUrl";
import { cn } from "@/lib/utils";

export interface GravatarAvatarProps {
  email: string;
  /** Used as the alt text; falls back to the address. */
  name?: string;
  /** Rendered size in pixels. */
  size?: number;
  className?: string;
}

export default function GravatarAvatar({
  email,
  name,
  size = 80,
  className,
}: GravatarAvatarProps) {
  const { data: src } = useGravatarUrl(email, size);
  const box = { width: size, height: size };

  // Hashing settles in a microtask, but rendering the same-sized placeholder
  // first keeps the header from jumping.
  if (!src) {
    return (
      <div
        className={cn("bg-muted shrink-0 rounded-full", className)}
        style={box}
      />
    );
  }

  return (
    <img
      src={src}
      alt={name || email}
      loading="lazy"
      className={cn("bg-muted shrink-0 rounded-full", className)}
      style={box}
    />
  );
}
