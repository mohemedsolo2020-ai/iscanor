import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useProfile() {
  return useQuery({
    queryKey: ['/api/profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json() as Promise<User>;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<{ name: string; age: number; avatarUrl: string }>) => {
      try {
        const response = await apiRequest('PATCH', '/api/profile', data);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Profile update failed: ${errorText}`);
        }
        return response.json();
      } catch (error) {
        console.error('Profile update error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    },
    onError: (error) => {
      console.error('Profile mutation error:', error);
    },
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ['/api/favorites'],
    queryFn: async () => {
      const response = await fetch('/api/favorites');
      if (!response.ok) throw new Error('Failed to fetch favorites');
      return response.json();
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ mediaId, action }: { mediaId: string; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        const response = await apiRequest('POST', '/api/favorites', { mediaId });
        return response.json();
      } else {
        const response = await apiRequest('DELETE', `/api/favorites/${mediaId}`);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    },
  });
}

export function useWatchHistory() {
  return useQuery({
    queryKey: ['/api/watch-history'],
    queryFn: async () => {
      const response = await fetch('/api/watch-history');
      if (!response.ok) throw new Error('Failed to fetch watch history');
      return response.json();
    },
  });
}
