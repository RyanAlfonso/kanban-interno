"use client";

import { SessionProvider } from "next-auth/react";
// Update import from react-query to @tanstack/react-query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; 
import { Provider } from "react-redux";
import store from "../redux/store";
import TaskEditFormDialog from "./TaskEditFormDialog";
import { ThemeProvider } from "./ThemeProvider";

type ProvidersProps = {
  children: React.ReactNode;
};

// Keep QueryClient instantiation (compatible with v5)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export function Providers({ children }: ProvidersProps) {
  console.log("Rendering Providers component..."); // Added log
  try {
    return (
      // QueryClientProvider usage remains the same
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
    console.error("Error rendering Providers component:", error); // Added try-catch
    return <div>Ocorreu um erro nos providers globais.</div>;
  }
}

