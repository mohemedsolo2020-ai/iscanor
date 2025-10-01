import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getCurrentUserToken } from "./firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get Firebase ID token for authentication - but don't fail if it's not available
  let token: string | null = null;
  try {
    token = await getCurrentUserToken();
  } catch (error) {
    console.debug('Could not get Firebase token, continuing without auth:', error);
  }
  
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    // Only add Authorization header if we have a valid token
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get Firebase ID token for authentication - but don't fail if it's not available
    let token: string | null = null;
    try {
      token = await getCurrentUserToken();
    } catch (error) {
      console.debug('Could not get Firebase token, continuing without auth:', error);
    }
    
    const headers: Record<string, string> = {
      // Only add Authorization header if we have a valid token
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };
    
    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});