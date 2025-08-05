
'use client';

import AppLayout from "@/components/AppLayout";
import TodoColumnManager from "@/components/Home/TodoColumnManager";
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

function HomePageContent() {
  return (
    <AppLayout title="Board">
      <div className="h-full flex flex-col">
        <TodoColumnManager />
      </div>
    </AppLayout>
  );
}

const Home = () => {
  return (
    <Suspense fallback={<div>Loading home...</div>}>
      <HomePageContent />
    </Suspense>
  );
};

export default Home;

