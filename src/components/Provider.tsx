"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import store from "../redux/store";
import TaskEditFormDialog from "./TaskEditFormDialog";
import { ThemeProvider } from "./ThemeProvider";

type ProvidersProps = {
  children: React.ReactNode;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

export function Providers({ children }: ProvidersProps) {
  console.log("Rendering Providers component...");
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SessionProvider basePath={`${process.env.NEXT_PUBLIC_BASE_PATH}/api/auth`}>{children}</SessionProvider>
            <TaskEditFormDialog />
          </ThemeProvider>
        </Provider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error("Error rendering Providers component:", error);
    return <div>Ocorreu um erro nos providers globais.</div>;
  }
}

