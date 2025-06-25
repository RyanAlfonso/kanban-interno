
"use client";

import { Menu, Search, Settings, User } from "lucide-react"; // Added User icon, removed Users
import { ThemeSwitcher } from "./ThemeSwitcher";
import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // Import useSession
import UserAccountNav from "./UserAccountNav"; // Import UserAccountNav
import { cn } from "@/lib/utils"; // Import cn for conditional classes

const AppHeader = () => {
  console.log("Rendering AppHeader..."); // Added log
  const { data: session } = useSession(); // Get session data
  const [search, setSearch] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  // Removed currentView

  useEffect(() => {
    console.log("AppHeader useEffect for searchParams running...");
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Handling search change:", e.target.value);
    setSearch(e.target.value);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (e.target.value) {
      params.set("q", e.target.value);
    } else {
      params.delete("q");
    }
    router.replace(`/?${params.toString()}`);
  };

  // Removed handleViewChange function

  try {
    return (
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 py-3 px-4 flex items-center justify-between">
        {/* Placeholder for sidebar toggle button on mobile - kept invisible */}
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 w-10 h-10 flex items-center justify-center px-2 mr-2 md:hidden invisible z-0"
          disabled={true}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Search Input */}
        <div className="flex items-center w-full max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="pl-8 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          {/* View Filter Buttons */}
          {/* End View Filter Buttons */}

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
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Conditional rendering based on session */}
          {session?.user ? (
             <UserAccountNav user={session.user} />
          ) : (
            <Link className={buttonVariants()} href={"/login"}>
              Sign In
            </Link>
          )}
        </div>
      </header>
    );
  } catch (error) {
    console.error("Error rendering AppHeader:", error); // Added try-catch
    // Optionally render an error message or fallback UI
    return <div>Ocorreu um erro no cabeçalho.</div>;
  }
};

export default AppHeader;

