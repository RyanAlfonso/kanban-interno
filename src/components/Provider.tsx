"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

export function Providers({ children }: ProvidersProps) {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SessionProvider>{children}</SessionProvider>

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
