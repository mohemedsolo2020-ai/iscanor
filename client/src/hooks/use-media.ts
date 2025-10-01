import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { Media, WatchHistory } from "@shared/schema";
import type { MediaFilters } from "@/lib/types";

export function useMedia(filters?: MediaFilters) {
  return useQuery({
    queryKey: ['/api/media', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.year) params.append('year', filters.year.toString());
      if (filters?.category) params.append('category', filters.category);
      
      const response = await fetch(`/api/media?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch media');
      return response.json() as Promise<Media[]>;
    },
  });
}

export function useTrendingMedia() {
  return useQuery({
    queryKey: ['/api/media/trending'],
    queryFn: async () => {
      const response = await fetch('/api/media/trending');
      if (!response.ok) throw new Error('Failed to fetch trending media');
      return response.json() as Promise<Media[]>;
    },
  });
}

export function useNewReleases() {
  return useQuery({
    queryKey: ['/api/media/new-releases'],
    queryFn: async () => {
      const response = await fetch('/api/media/new-releases');
      if (!response.ok) throw new Error('Failed to fetch new releases');
      return response.json() as Promise<Media[]>;
    },
  });
}

export function useSearchMedia(query: string, limit?: number) {
  return useQuery({
    queryKey: ['/api/media/search', query, limit],
    queryFn: async () => {
      if (!query.trim()) return [];
      const params = new URLSearchParams({ q: query });
      if (limit) params.append('limit', limit.toString());
      
      const response = await fetch(`/api/media/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to search media');
      return response.json() as Promise<Media[]>;
    },
    enabled: !!query.trim(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Optimized search hook with debouncing and minimum query length
export function useOptimizedSearchMedia(query: string, options: { debounceMs?: number; minLength?: number; limit?: number } = {}) {
  const { debounceMs = 300, minLength = 2, limit = 10 } = options;
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= minLength) {
        setDebouncedQuery(query.trim());
      } else {
        setDebouncedQuery('');
      }
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [query, debounceMs, minLength]);
  
  return useSearchMedia(debouncedQuery, limit);
}

export function useContinueWatching() {
  return useQuery({
    queryKey: ['/api/continue-watching'],
    queryFn: async () => {
      const response = await fetch('/api/continue-watching');
      if (!response.ok) throw new Error('Failed to fetch continue watching');
      return response.json() as Promise<(WatchHistory & { media: Media })[]>;
    },
  });
}

export function useUpdateWatchHistory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { mediaId: string; progress: number; currentEpisode?: number; currentSeason?: number }) => {
      const response = await apiRequest('POST', '/api/watch-history', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/continue-watching'] });
      queryClient.invalidateQueries({ queryKey: ['/api/watch-history'] });
    },
  });
}

// Hook for instant search suggestions (used for real-time UI feedback)
export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ['/api/media/search/suggestions', query],
    queryFn: async () => {
      if (!query.trim() || query.trim().length < 1) return [];
      const response = await fetch(`/api/media/search?q=${encodeURIComponent(query)}&limit=5`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json() as Promise<Media[]>;
    },
    enabled: !!query.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes for suggestions
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
