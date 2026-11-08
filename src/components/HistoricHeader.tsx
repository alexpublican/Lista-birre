import { Link } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { ReactNode } from "react";

export default function HistoricHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#3D3126] bg-[#12100E]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" data-testid="header-home-link">
          <BrandMark className="size-9" iconClassName="size-4.5" testId="header-brand" />
          <span className="font-heading text-base whitespace-nowrap sm:text-lg font-semibold tracking-tight text-[#FAF5EF]">Birreria Cassina</span>
        </Link>
        <div className="flex items-center gap-2">
          {right}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
