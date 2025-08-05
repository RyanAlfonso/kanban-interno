"use client";

import AppLayout from "@/components/AppLayout";
import TimelineComponent from "@/components/Timeline/TimelineComponent";
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

const TimelinePage = () => {
  return (
    <Suspense fallback={<div>Loading timeline...</div>}>
      <AppLayout title="Timeline">
        <TimelineComponent />
      </AppLayout>
    </Suspense>
  );
};

export default TimelinePage;

