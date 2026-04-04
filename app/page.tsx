'use client';

import { useState } from 'react';
import BootSequence from '@/components/BootSequence';
import JarvisLayout from '@/components/JarvisLayout';

export default function Home() {
  const [bootDone, setBootDone] = useState(false);

  return (
    <>
      {!bootDone && <BootSequence onComplete={() => setBootDone(true)} />}
      <JarvisLayout />
    </>
  );
}
