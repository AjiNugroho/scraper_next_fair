"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState } from "react";


interface TanstackProviderProps {
    children: ReactNode;
    }

export const TanstackProvider = ({children}:TanstackProviderProps) => {
    const [queryClient] = useState(() => new QueryClient());
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    )
}