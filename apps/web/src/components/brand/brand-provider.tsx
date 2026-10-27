'use client';

import { brands, mersal, type Brand, type BrandId } from '@mersal/brand';
import { createContext, use, type ReactNode } from 'react';

const BrandContext = createContext<Brand>(mersal);

export function BrandProvider({ brandId, children }: { brandId: BrandId; children: ReactNode }) {
  return <BrandContext value={brands[brandId]}>{children}</BrandContext>;
}

export function useBrand(): Brand {
  return use(BrandContext);
}
