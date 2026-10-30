import { motion, useReducedMotion, useSpring, type HTMLMotionProps } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLMotionProps<"a"> & {
  /** How far the button follows the cursor, as a share of the offset from its centre. */
  strength?: number;
};

/** Port of EasyUI's MagneticButton for links: spring pull toward a mouse, snap back on leave. */
export function MagneticButton({
  strength = 0.35,
  className,
  onPointerMove,
  onPointerLeave,
  ...props
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const still = useReducedMotion();
  const x = useSpring(0, { stiffness: 280, damping: 20 });
  const y = useSpring(0, { stiffness: 280, damping: 20 });

  return (
    <motion.a
      ref={ref}
      style={{ x, y }}
      whileTap={{ scale: 0.97 }}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (still || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        x.set(0);
        y.set(0);
      }}
      className={cn("is-magnetic", className)}
      {...props}
    />
  );
}
