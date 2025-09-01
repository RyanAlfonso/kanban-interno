"use client";

import dynamic from 'next/dynamic';
import AppSideBar from "@/components/AppSideBar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardProjectSelector = dynamic(
  () => import('@/components/Dashboard/ProjectSelector'),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-10 w-full" /> 
  }
);

const DashboardComponent = dynamic(
  () => import('@/components/Dashboard/DashboardComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="p-6">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-4 w-3/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }
);

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
              Visão geral do progresso e métricas da área.
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
