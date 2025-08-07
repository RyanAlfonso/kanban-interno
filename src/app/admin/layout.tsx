
import AppLayout from '@/components/AppLayout';
import { FC, Suspense } from 'react';

type AdminLayoutProps = {
  children: JSX.Element;
};

const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  const loadingFallback = (
    <div className="flex h-screen w-full items-center justify-center">
      Carregando...
    </div>
  );

  return (
    <Suspense fallback={loadingFallback}>
      <AppLayout>{children}</AppLayout>
    </Suspense>
  );
};

export default AdminLayout;
