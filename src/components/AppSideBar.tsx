"use client";

import { getLabelColor } from "@/lib/color"; // Keep for potential future use or remove if labels are fully replaced
import { cn } from "@/lib/utils";
import { BarChart2, Clock, Folder, Menu, Plus, Tag } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ForwardRefExoticComponent, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import useBreakpoint from "@/hooks/useBreakpoint";
import { useDispatch, useSelector } from "react-redux";
import { ReduxState } from "@/redux/store";
import {
  closeSidebar,
  openSidebar,
  toggleSidebar,
} from "@/redux/actions/sidebarAction";
// Update import from react-query to @tanstack/react-query
import { useQuery, useQueryClient } from "@tanstack/react-query"; 
import { Project } from "@prisma/client";
import { useToast } from "./ui/use-toast";
import { useSession } from 'next-auth/react'; // Import useSession
import { Skeleton } from "./ui/skeleton"; // Import Skeleton for loading state
import ProjectForm from "./ProjectForm"; // Import ProjectForm

const fetchUserAreas = async (): Promise<any[]> => {
  const response = await fetch("/api/user/areas");
  if (!response.ok) {
    throw new Error("Failed to fetch user areas");
  }
  return response.json();
};

const fetchProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch("/api/projects");
    if (!response.ok) {
      throw new Error("Falha ao buscar áreas");
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};

type NavContent = {
  title: string;
  icon: ForwardRefExoticComponent<any>;
  link: string;
};

const NAV_CONTENT: NavContent[] = [
  {
    title: "Board",
    icon: Tag,
    link: "/",
  },
  {
    title: "Dashboard",
    icon: BarChart2,
    link: "/dashboard",
  },
  // {
  //   title: "List",
  //   icon: ListIcon,
  //   link: "/list",
  // },
  {
    title: "Timeline",
    icon: Clock,
    link: "/timeline",
  },
];

const AppSideBar = () => {
  // console.log("Rendering AppSideBar..."); // Log removido
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // Initialize queryClient

  const { md, lg } = useBreakpoint();
  const isSidebarOpen = useSelector<ReduxState, boolean>(
    (state) => state.sidebar.isSidebarOpen,
  );
  const dispatch = useDispatch();
  const { data: session } = useSession();

  const { data: userAreas } = useQuery<any[], Error>({
    queryKey: ["userAreas"],
    queryFn: fetchUserAreas,
    enabled: !!session,
  });

  const { data: projects, isLoading, error } = useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const filteredProjects = projects?.filter(project => {
    if (!userAreas || userAreas.length === 0) {
      return true;
    }
    const hasFinanceiro = userAreas.some(area => area.name === "Financeiro");
    if (hasFinanceiro) {
      return project.name === "Financeiro";
    }
    return userAreas.some(area => area.name === project.name);
  });

  // Get current project ID from URL for highlighting
  const currentProjectId = searchParams.get("projectId");
  // console.log("Current Project ID from URL:", currentProjectId); // Log removido

  useEffect(() => {
    // console.log("AppSideBar useEffect for resize running..."); // Log removido
    const handleResize = () => {
      if (lg && !isSidebarOpen) {
        // console.log("Opening sidebar due to resize (lg)"); // Log removido
        dispatch(openSidebar());
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      // console.log("Cleaning up AppSideBar resize listener..."); // Log removido
      window.removeEventListener("resize", handleResize);
    };
  }, [isSidebarOpen, lg, dispatch]);

  const handleToggleSidebar = () => {
    // console.log("Toggling sidebar"); // Log removido
    dispatch(toggleSidebar());
  };

  const handleNavigate = (link: string) => {
    // console.log("Navigating to:", link); // Log removido
    router.push(link);
    // Close sidebar on navigation on smaller screens
    if (md) return;
    // console.log("Closing sidebar due to navigation (small screen)"); // Log removido
    dispatch(closeSidebar());
  };

  // Function to handle project selection
  const handleProjectSelect = (projectId: string | null) => {
    // console.log("Selecting project:", projectId); // Log removido
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (projectId) {
      params.set("projectId", projectId);
    } else {
      // If null, go to "All Projects" view (remove projectId)
      params.delete("projectId");
    }
    // Navigate to the main board page with the new filter
    handleNavigate(`/?${params.toString()}`);
  };

  // Callback function for successful project creation
  const handleProjectCreated = () => {
    // console.log("Project created, invalidating projects query..."); // Log removido
    // Update invalidateQueries syntax for v4+
    queryClient.invalidateQueries({ queryKey: ["projects"] }); 
  };

  try {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleSidebar}
          className={cn(
            "fixed md:hidden z-10 left-4 top-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 w-10 h-10 flex items-center justify-center px-2 mr-2",
            isSidebarOpen && "hidden",
          )}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div
          ref={sidebarRef}
          className={cn(
            "bg-white dark:bg-gray-900 h-full transition-all duration-300 border-r dark:border-gray-800 z-10 fixed md:relative inset-0 flex flex-col", // Added flex flex-col
            isSidebarOpen
              ? "w-full md:w-64"
              : "-translate-x-full md:w-16 md:-translate-x-0",
          )}
        >
          {/* Header */} 
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 flex-shrink-0">
            {isSidebarOpen && (
              <Link href="/">
                <h1
                  className={cn(
                    "font-bold text-xl text-teal-600 dark:text-teal-400 transition-opacity duration-300",
                    isSidebarOpen ? "opacity-100" : "opacity-0 absolute",
                  )}
                >
                  Kanban
                </h1>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleSidebar}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 w-8 h-8 flex items-center justify-center"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation and Projects - Scrollable Area */} 
          <div className="flex-grow overflow-y-auto p-4">
            {/* Main Navigation */}
            <nav className="space-y-2">
              {NAV_CONTENT.map((item) => (
                <Link
                  key={item.link}
                  href={item.link}
                  className="block"
                  onClick={(e) => { e.preventDefault(); handleNavigate(item.link); }}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                      pathname === item.link &&
                        "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                      !isSidebarOpen && "justify-center p-0",
                    )}
                  >
                    <item.icon
                      className={cn("h-5 w-5", isSidebarOpen && "mr-2")}
                    />
                    {isSidebarOpen && <span>{item.title}</span>}
                  </Button>
                </Link>
              ))}
              {session?.user?.role === 'ADMIN' && (
                <Link
                  href="/admin/users"
                  className="block"
                  onClick={(e) => { e.preventDefault(); handleNavigate("/admin/users"); }}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                      pathname === "/admin/users" &&
                        "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                      !isSidebarOpen && "justify-center p-0",
                    )}
                  >
                    <Folder className={cn("h-5 w-5", isSidebarOpen && "mr-2")} />
                    {isSidebarOpen && <span>Usuários</span>}
                  </Button>
                </Link>
              )}
            </nav>

            {/* Projects Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                {isSidebarOpen && (
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Áreas
                  </h3>
                )}
                {/* Add Project Button integrated with ProjectForm */} 
                {session?.user?.role === 'ADMIN' && isSidebarOpen && (
                  <ProjectForm 
                    onSuccess={handleProjectCreated} 
                    trigger={
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Criar nova área">
                        <Plus className="h-4 w-4" />
                      </Button>
                    }
                  />
                )}
              </div>
              
              {/* Project List */} 
              <div className="space-y-1">
                {(!userAreas?.some(area => area.name === "Financeiro")) && (
                  <Button
                    variant="ghost"
                    onClick={() => handleProjectSelect(null)} // Pass null for "All Projects"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                      !currentProjectId && // Highlight if no projectId is in URL
                        "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                      !isSidebarOpen && "justify-center p-0",
                    )}
                  >
                    <Folder className={cn("h-5 w-5", isSidebarOpen && "mr-2")} />
                    {isSidebarOpen && <span>Todas as áreas</span>}
                  </Button>
                )}

                {/* Loading Skeletons */}
                {isLoading && isSidebarOpen && (
                  <>
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </>
                )}

                {/* Actual Project List */}
                {!isLoading && filteredProjects?.map((project) => (
                  <Button
                    key={project.id}
                    variant="ghost"
                    onClick={() => handleProjectSelect(project.id)}
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                      currentProjectId === project.id && // Highlight if this project is selected
                        "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                      !isSidebarOpen && "justify-center p-0",
                    )}
                  >
                    <Folder className={cn("h-5 w-5", isSidebarOpen && "mr-2")} />
                    {isSidebarOpen && <span>{project.name}</span>}
                  </Button>
                ))}

                {/* Error Message */} 
                {/* Display error message using the 'error' object from useQuery */}
                {error && isSidebarOpen && (
                  <p className="text-xs text-red-500">Erro ao carregar áreas: {error.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  } catch (error) {
    // console.error("Error rendering AppSideBar:", error); // Log removido
    // Optionally render an error message or fallback UI
    return <div>Ocorreu um erro na barra lateral.</div>;
  }
};

export default AppSideBar;

