"use client";

import { getLabelColor } from "@/lib/color";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Project } from "@prisma/client";
import { useToast } from "./ui/use-toast";
import { useSession } from "next-auth/react";
import { Skeleton } from "./ui/skeleton";
import ProjectForm from "./ProjectForm";

const fetchProjects = async (): Promise<Project[]> => {
  const response = await fetch("/api/projects");
  if (!response.ok) {
    throw new Error("Falha ao buscar áreas");
  }
  return response.json();
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
  {
    title: "Timeline",
    icon: Clock,
    link: "/timeline",
  },
];

const AppSideBar = () => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { md, lg } = useBreakpoint();
  const isSidebarOpen = useSelector<ReduxState, boolean>(
    (state) => state.sidebar.isSidebarOpen
  );
  const dispatch = useDispatch();
  const { data: session } = useSession();

  const { data: projects, isLoading, error } = useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as áreas na barra lateral",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const currentProjectId = searchParams.get("projectId");

  useEffect(() => {
    const handleResize = () => {
      if (lg && !isSidebarOpen) {
        dispatch(openSidebar());
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isSidebarOpen, lg, dispatch]);

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  const handleNavigate = (link: string) => {
    router.push(link);
    if (md) return;
    dispatch(closeSidebar());
  };

  const handleProjectSelect = (projectId: string | null) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (projectId) {
      params.set("projectId", projectId);
    } else {
      params.delete("projectId");
    }
    handleNavigate(`/?${params.toString()}`);
  };

  const handleProjectCreated = () => {
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
            isSidebarOpen && "hidden"
          )}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div
          ref={sidebarRef}
          className={cn(
            "bg-white dark:bg-gray-900 h-full transition-all duration-300 border-r dark:border-gray-800 z-10 fixed md:relative inset-0 flex flex-col",
            isSidebarOpen
              ? "w-full md:w-64"
              : "-translate-x-full md:w-16 md:-translate-x-0"
          )}
        >
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-800 flex-shrink-0">
            {isSidebarOpen && (
              <Link href="/">
                <h1
                  className={cn(
                    "font-bold text-xl text-teal-600 dark:text-teal-400 transition-opacity duration-300",
                    isSidebarOpen ? "opacity-100" : "opacity-0 absolute"
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

          <div className="flex-grow overflow-y-auto p-4">
            <nav className="space-y-2">
              {NAV_CONTENT.map((item) => (
                <Link
                  key={item.link}
                  href={item.link}
                  className="block"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate(item.link);
                  }}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                      pathname === item.link &&
                        "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                      !isSidebarOpen && "justify-center p-0"
                    )}
                  >
                    <item.icon
                      className={cn("h-5 w-5", isSidebarOpen && "mr-2")}
                    />
                    {isSidebarOpen && <span>{item.title}</span>}
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                {isSidebarOpen && (
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Áreas
                  </h3>
                )}
                {session?.user?.role === "ADMIN" && isSidebarOpen && (
                  <ProjectForm
                    onSuccess={handleProjectCreated}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Criar nova área"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    }
                  />
                )}
              </div>

              <div className="space-y-1">
                <Button
                  variant="ghost"
                  onClick={() => handleProjectSelect(null)}
                  className={cn(
                    "w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                    !currentProjectId &&
                      "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                    !isSidebarOpen && "justify-center p-0"
                  )}
                >
                  <Folder className={cn("h-5 w-5", isSidebarOpen && "mr-2")} />
                  {isSidebarOpen && <span>Todas as áreas</span>}
                </Button>

                {isLoading && isSidebarOpen && (
                  <>
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </>
                )}

                {!isLoading &&
                  projects?.map((project) => (
                    <Button
                      key={project.id}
                      variant="ghost"
                      onClick={() => handleProjectSelect(project.id)}
                      className={cn(
                        "w-full justify-start text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                        currentProjectId === project.id &&
                          "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white",
                        !isSidebarOpen && "justify-center p-0"
                      )}
                    >
                      <Folder
                        className={cn("h-5 w-5", isSidebarOpen && "mr-2")}
                      />
                      {isSidebarOpen && <span>{project.name}</span>}
                    </Button>
                  ))}

                {error && isSidebarOpen && (
                  <p className="text-xs text-red-500">
                    Erro ao carregar áreas: {error.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  } catch (error) {
    return <div>Ocorreu um erro na barra lateral.</div>;
  }
};

export default AppSideBar;
