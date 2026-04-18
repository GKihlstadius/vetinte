'use client';

import { useEffect } from 'react';
import { recordProductView } from '@/lib/client-cache';

export function RecordProductView({ brand, model }: { brand: string; model: string }) {
  useEffect(() => {
    recordProductView(brand, model);
  }, [brand, model]);
  return null;
}
