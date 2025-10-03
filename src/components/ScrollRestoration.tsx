import React from "react";
import { useLocation } from "react-router-dom";

type LocationKey = string;

const STORAGE_KEY = "rootedai:scroll-positions";
const RESTORATION_DELAY = 100; // ms delay to allow DOM to stabilize

const createLocationKey = (location: ReturnType<typeof useLocation>): LocationKey => {
  return `${location.pathname}${location.search}${location.hash}`;
};

const readStoredPositions = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {} as Record<LocationKey, number>;
    }

    const parsed = JSON.parse(raw) as Record<LocationKey, number>;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.warn("Failed to read scroll positions from storage", error);
  }

  return {} as Record<LocationKey, number>;
};

const persistPositions = (positions: Record<LocationKey, number>) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch (error) {
    console.warn("Failed to persist scroll positions", error);
  }
};

export const ScrollRestoration: React.FC = () => {
  const location = useLocation();
  const locationKey = React.useMemo(
    () => createLocationKey(location),
    [location.pathname, location.search, location.hash],
  );
  const positionsRef = React.useRef<Record<LocationKey, number>>({});
  const initializedRef = React.useRef(false);
  const previousKeyRef = React.useRef<LocationKey | null>(null);

  const savePosition = React.useCallback((key: LocationKey, value: number) => {
    positionsRef.current[key] = value;
    persistPositions(positionsRef.current);
  }, []);

  // Hydrate scroll positions from storage once on mount
  React.useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    positionsRef.current = readStoredPositions();
    previousKeyRef.current = locationKey;
    initializedRef.current = true;
  }, [locationKey]);

  // Persist the scroll position when navigating away from the page or closing the tab
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (!initializedRef.current) {
        return;
      }

      savePosition(locationKey, window.scrollY);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [locationKey, savePosition]);

  React.useLayoutEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    const previousKey = previousKeyRef.current;

    if (previousKey && previousKey !== locationKey) {
      savePosition(previousKey, window.scrollY);
    }

    const storedPosition = positionsRef.current[locationKey] ?? 0;

    // Add delay to allow React to finish rendering and auth state to settle
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: storedPosition, behavior: "auto" });
      });
    }, RESTORATION_DELAY);

    previousKeyRef.current = locationKey;

    return () => clearTimeout(timeoutId);
  }, [locationKey, savePosition]);

  return null;
};

export default ScrollRestoration;
