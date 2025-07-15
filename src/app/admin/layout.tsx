import AppLayout from '@/components/AppLayout';
import { FC } from 'react';

type AdminLayoutProps = {
  children: JSX.Element;
};

const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  return <AppLayout>{children}</AppLayout>;
};

export default AdminLayout;
