"use client";

import AppLayout from "@/components/AppLayout";
import TimelineComponent from "@/components/Timeline/TimelineComponent";
import { Suspense } from 'react';

export const dynamic = 'force-dynamic'; // Force dynamic rendering

const TimelinePage = () => {
  return (
    // Wrap the layout/component using useSearchParams in Suspense
    <Suspense fallback={<div>Loading timeline...</div>}>
      <AppLayout title="Timeline">
        <TimelineComponent />
      </AppLayout>
    </Suspense>
  );
};

export default TimelinePage;

