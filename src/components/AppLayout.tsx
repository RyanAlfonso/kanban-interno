import { FC } from "react";
import AppHeader from "./AppHeader";
import AppSideBar from "./AppSideBar";

type AppLayoutProps = {
  children: JSX.Element;
  title?: string;
  action?: JSX.Element;
};

const AppLayout: FC<AppLayoutProps> = ({ children, title, action }) => {
  console.log("Rendering AppLayout...");
  try {
    return (
      <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
        <AppSideBar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AppHeader />

          {title && (
            <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-6 py-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {title}
              </h2>
              {action}
            </div>
          )}

          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error rendering AppLayout:", error);
    return <div>Ocorreu um erro no layout principal.</div>;
  }
};

export default AppLayout;

