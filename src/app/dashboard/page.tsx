"use client";

import AppSideBar from "@/components/AppSideBar";
import DashboardComponent from "@/components/Dashboard/DashboardComponent";
import DashboardProjectSelector from "@/components/Dashboard/ProjectSelector";
import { Separator } from "@/components/ui/separator";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full">
      <div className="sticky top-0 h-screen flex-shrink-0">
        <AppSideBar />
      </div>
      <main className="flex-1 w-full min-w-0 flex flex-col">
        <div className="flex items-center justify-between p-6 pb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do progresso e métricas do projeto.
            </p>
          </div>
          <div className="w-64">
            <DashboardProjectSelector />
          </div>
        </div>
        <Separator className="mb-2" />
        <DashboardComponent />
      </main>
    </div>
  );
}

