import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth-context";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Movies from "@/pages/movies";
import Series from "@/pages/series";
import Anime from "@/pages/anime";
import AnimeMovies from "@/pages/anime-movies";
import ForeignSeries from "@/pages/foreign-series";
import AsianSeries from "@/pages/asian-series";
import Categories from "@/pages/categories";
import Years from "@/pages/years";
import Favorites from "@/pages/favorites";
import WatchHistory from "@/pages/watch-history";
import Profile from "@/pages/profile";
import MovieDetails from "@/pages/movie-details";
import EpisodeView from "@/pages/episode-view";
import SearchResults from "@/pages/search-results";
import Trending from "@/pages/trending";
import NewReleases from "@/pages/new-releases";
import ContinueWatchingPage from "@/pages/continue-watching";

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/movies" component={Movies} />
        <Route path="/series" component={Series} />
        <Route path="/anime" component={Anime} />
        <Route path="/anime-movies" component={AnimeMovies} />
        <Route path="/foreign-series" component={ForeignSeries} />
        <Route path="/asian-series" component={AsianSeries} />
        <Route path="/categories" component={Categories} />
        <Route path="/years" component={Years} />
        <Route path="/favorites" component={Favorites} />
        <Route path="/watch-history" component={WatchHistory} />
        <Route path="/profile" component={Profile} />
        <Route path="/search" component={SearchResults} />
        <Route path="/trending" component={Trending} />
        <Route path="/new-releases" component={NewReleases} />
        <Route path="/continue-watching" component={ContinueWatchingPage} />
        <Route path="/movie/:id" component={MovieDetails} />
        <Route path="/series/:id" component={MovieDetails} />
        <Route path="/series/:seriesId/episode/:episodeNumber" component={EpisodeView} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
