// UTEC wordmark. Ships two assets: the dark logo for light surfaces and the
// white one for dark mode (swapped with CSS, so there is no theme flash).

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoUtecProps {
  width: number;
  height: number;
  className?: string;
}

export function LogoUtec({ width, height, className }: LogoUtecProps) {
  return (
    <>
      <Image
        src="/brand/utec-logo.png"
        alt="UTEC"
        width={width}
        height={height}
        priority
        className={cn("dark:hidden", className)}
      />
      <Image
        src="/brand/utec-logo-blanco.png"
        alt="UTEC"
        width={width}
        height={height}
        priority
        className={cn("hidden dark:block", className)}
      />
    </>
  );
}
