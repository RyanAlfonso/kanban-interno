"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, Search, Settings } from "lucide-react";

import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { ThemeSwitcher } from "./ThemeSwitcher";
import UserAccountNav from "./UserAccountNav";
import AdvancedFilters from "./AdvancedFilters";

import { useDebounce } from "@/hooks/useDebounce";

const AppHeader = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get("q") || "");

  const debouncedSearchTerm = useDebounce(search, 300);

  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));

    if (debouncedSearchTerm) {
      params.set("q", debouncedSearchTerm);
    } else {
      params.delete("q");
    }

    router.replace(`${pathname}?${params.toString()}`);
    
  }, [debouncedSearchTerm, pathname, router]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 py-3 px-4 flex items-center justify-between gap-4 sticky top-0 z-40">
      <div className="md:hidden invisible">
        <Button variant="ghost" size="icon" disabled>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center gap-2">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar por título ou descrição..."
            className="pl-8 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <AdvancedFilters />
      </div>

      <div className="flex items-center space-x-2">
        <ThemeSwitcher />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Configurações</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {session?.user ? (
          <UserAccountNav user={session.user} />
        ) : (
          <Link className={buttonVariants()} href={"/login"}>
            Entrar
          </Link>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
