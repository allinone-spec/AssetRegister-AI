import { useEffect, useState } from "react";

const defaultBreakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export default function useResize(customBreakpoints = {}) {
  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints };
  const [currentBreakpoint, setCurrentBreakpoint] = useState("2xl");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      if (width <= breakpoints.xs) {
        setCurrentBreakpoint("xs");
      } else if (width <= breakpoints.sm) {
        setCurrentBreakpoint("sm");
      } else if (width <= breakpoints.md) {
        setCurrentBreakpoint("md");
      } else if (width <= breakpoints.lg) {
        setCurrentBreakpoint("lg");
      } else if (width <= breakpoints.xl) {
        setCurrentBreakpoint("xl");
      } else {
        setCurrentBreakpoint("2xl");
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    breakpoints.xs,
    breakpoints.sm,
    breakpoints.md,
    breakpoints.lg,
    breakpoints.xl,
  ]);

  return {
    breakpoint: currentBreakpoint,
    // Individual breakpoint checks
    isXs: currentBreakpoint === "xs",
    isSm: currentBreakpoint === "sm",
    isMd: currentBreakpoint === "md",
    isLg: currentBreakpoint === "lg",
    isXl: currentBreakpoint === "xl",
    is2Xl: currentBreakpoint === "2xl",
    // Semantic helpers
    isMobile: currentBreakpoint === "xs" || currentBreakpoint === "sm",
    isTablet: currentBreakpoint === "md",
    isDesktop: ["xl", "2xl"].includes(currentBreakpoint),
    // Min-width helpers (useful for responsive design)
    isSmUp: ["sm", "md", "lg", "xl", "2xl"].includes(currentBreakpoint),
    isMdUp: ["md", "lg", "xl", "2xl"].includes(currentBreakpoint),
    isLgUp: ["lg", "xl", "2xl"].includes(currentBreakpoint),
    isXlUp: ["xl", "2xl"].includes(currentBreakpoint),
    // Screen width value
    screenWidth: typeof window !== "undefined" ? window.innerWidth : 0,
  };
}
