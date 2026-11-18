import type { ReactNode } from 'react';
import { Box } from '@mui/material';

export function PageLoading({ children }: { children: ReactNode }) {
 return <Box data-motion-page="ready">{children}</Box>;
}
