import React, { useState, useEffect, useRef, useMemo } from "react";
import { Phone, MessageCircle, MapPin, Clock, AlertCircle, ChevronUp } from "lucide-react";
import { io } from "socket.io-client";
import { trackingcar } from "../../assets/export";
import { ErrorToast } from "../../components/global/Toaster";
import { useNavigate } from "react-router";
import { baseUrl } from "../../axios";

// GeoJSON coordinates are [longitude, latitude]
const coordsToLatLng = (coordinates) => {
  if (!coordinates || coordinates.length < 2) return null;
  return { lat: coordinates[1], lng: coordinates[0] };
};

/** Map API/socket rideStatus strings to STATUS_CONFIG keys (e.g. arrived, in_progress). */
const normalizeRideStatusKey = (raw) => {
  if (raw == null || raw === "") return "in_progress";
  let s = String(raw).trim().toLowerCase().replace(/[\s-]+/g, "_");

  const aliases = {
    rideinprogress: "in_progress",
    ride_in_progress: "in_progress",
    inprogress: "in_progress",
    enroute: "picked_up",
    en_route: "picked_up",
    ontheway: "picked_up",
    on_the_way: "picked_up",
    coming: "coming",
  };
  if (aliases[s]) return aliases[s];
  return s;
};

// Default ride — shown immediately so map renders before socket responds
// ✅ FIX: Use null as default so map waits for real data
const defaultRide = null;

const RideTracking = ({ ride: rideProp }) => {
  const navigate = useNavigate();

  // Map + markers
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const carMarkerRef = useRef(null);
  const carElementRef = useRef(null);
  const polylineRef = useRef(null);
  const directionsPathRef = useRef([]);

  // Animation refs (for smooth car rotation only)
  const headingRef = useRef(0);
  const smoothAnimRef = useRef(null);

  // Socket / live driver location
  const socketRef = useRef(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const driverPositionRef = useRef(null);
  const prevDriverPositionRef = useRef(null);

  // React state for UI
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [liveRide, setLiveRide] = useState(rideProp || defaultRide);
  const [socketStatus, setSocketStatus] = useState("disconnected");

  const rideStatusDisplay = useMemo(
    () => normalizeRideStatusKey(liveRide?.rideStatus),
    [liveRide?.rideStatus]
  );

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyCWPjMVGKPa7uoz-UhF2o8nvpTpJLtOMKY";

  // ✅ Extract rideId
  const rideId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const search = window.location.search;
    if (!search) return "";

    const params = new URLSearchParams(search);

    const fromKey =
      params.get("ride") ||
      params.get("rideId") ||
      params.get("rideID") ||
      params.get("id");

    if (fromKey) return fromKey;

    const clean = search.startsWith("?") ? search.slice(1) : search;
    if (!clean.includes("=") && clean.trim().length > 0) {
      return clean.trim();
    }

    return "";
  }, []);

  const pickupLatLng = useMemo(
    () => coordsToLatLng(liveRide?.pickupPoint?.location?.coordinates),
    [liveRide]
  );
  const dropoffLatLng = useMemo(
    () => coordsToLatLng(liveRide?.dropOffPointRequested?.location?.coordinates),
    [liveRide]
  );

  const journeyPoints = useMemo(() => {
    const points = liveRide?.rideJourneyPoints ?? [];
    return points
      .map((p) => p?.location?.coordinates && coordsToLatLng(p.location.coordinates))
      .filter(Boolean);
  }, [liveRide]);

  const fallbackRoutePath = useMemo(() => {
    const path = [];
    if (pickupLatLng) path.push(pickupLatLng);
    journeyPoints.forEach((p) => path.push(p));
    if (dropoffLatLng) path.push(dropoffLatLng);
    return path;
  }, [pickupLatLng, dropoffLatLng, journeyPoints]);

  // When ride prop updates externally
  useEffect(() => {
    if (rideProp) setLiveRide(rideProp);
  }, [rideProp]);

  // Keep driverPositionRef in sync
  useEffect(() => {
    driverPositionRef.current = driverPosition;
  }, [driverPosition]);

  // ✅ Socket integration
  useEffect(() => {
    if (!rideId) return;

    const socket = io(baseUrl, {
      transports: ["websocket"],
      query: {
        rideId,
        "origin": "web",
      },
    });

    socketRef.current = socket;

    socket.on("ride:initial_data", (rawPayload) => {
      console.log("📦 ride:initial_data event:", rawPayload);

      const payload = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;

      const ride =
        payload?.data?.ride ||
        payload?.ride ||
        (payload?.success && payload?.data);

      if (ride) {
        // ✅ FIX: Reset mapInitialized so the map re-initializes with correct coordinates
        setMapInitialized(false);
        setLiveRide(ride);
      }
    });

    socket.on("ride:error", (payload) => {
      console.error("❌ ride:error:", payload);
      const message =
        (payload && (payload.message || payload.error || payload.reason)) ||
        "Ride not found or already deleted.";
      ErrorToast(message);
      navigate("/ride-not-found", { replace: true });
    });

    socket.on("ride:status:update", (payload) => {
      console.log("🔄 ride:status:update:", payload);
      if (!payload?.rideStatus && !payload?.type) return;

      const status = normalizeRideStatusKey(payload.rideStatus || payload.type);

      setLiveRide((prev) =>
        prev ? { ...prev, rideStatus: status } : prev
      );

      // If ride is cancelled or completed, redirect to summary screen
      if (status === "cancelled" || status === "completed") {
        navigate("/ride-ended", {
          replace: true,
          state: { status },
        });
      }
    });

    socket.on("driver:location:update", (payload) => {
      console.log("📍 driver:location:update:", payload);
      const coords = payload?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return;

      // ✅ Stop any leftover animation frame
      if (smoothAnimRef.current) {
        cancelAnimationFrame(smoothAnimRef.current);
        smoothAnimRef.current = null;
      }

      const newPos = { lat: coords[1], lng: coords[0] };
      setDriverPosition(newPos);

      // ✅ Directly move car marker right away (don't wait for React re-render)
      if (carMarkerRef.current) {
        carMarkerRef.current.position = newPos;
      }
      // ✅ Pan map to follow driver
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(newPos);
      }
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected! ID:", socket.id);
      setSocketStatus("connected");

      socket.emit("ride:initial_data", { rideId }, (ack) => {
        console.log("📬 ACK response:", ack);
        if (ack) {
          const rideFromAck =
            (Array.isArray(ack) ? ack[0] : ack)?.data?.ride ||
            (Array.isArray(ack) ? ack[0] : ack)?.ride;
          if (rideFromAck) {
            // ✅ FIX: Reset mapInitialized here too (ACK path)
            setMapInitialized(false);
            setLiveRide(rideFromAck);
          }
        }
      });
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connect error:", err.message);
      setSocketStatus("error");
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
      setSocketStatus("disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [rideId, navigate]);

  // ✅ Load Google Maps script once
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setApiError(true);
      return;
    }

    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const interval = setInterval(() => {
        if (window.google?.maps) {
          setMapLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,marker&v=beta`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setApiError(true);
    document.head.appendChild(script);

    return () => {
      // cleanup
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [GOOGLE_MAPS_API_KEY]);

  // ✅ FIX: Initialize map when mapLoaded AND real ride coordinates are ready
  // Also re-initialize when mapInitialized is reset (i.e. new real ride data arrived)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !pickupLatLng || !dropoffLatLng || mapInitialized) return;

    // Destroy old map instance and markers before re-initializing
    if (mapInstanceRef.current) {
      if (smoothAnimRef.current) cancelAnimationFrame(smoothAnimRef.current);
      if (pickupMarkerRef.current) pickupMarkerRef.current.setMap(null);
      if (dropoffMarkerRef.current) dropoffMarkerRef.current.setMap(null);
      if (carMarkerRef.current) {
        if (typeof carMarkerRef.current.setMap === "function") {
          carMarkerRef.current.setMap(null);
        } else {
          carMarkerRef.current.map = null;
        }
      }
      if (polylineRef.current) polylineRef.current.setMap(null);
      mapInstanceRef.current = null;
      directionsPathRef.current = [];
    }

    const timer = setTimeout(() => {
      initializeMap();
      setMapInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, pickupLatLng, dropoffLatLng, mapInitialized]);

  // Initialize map
  const initializeMap = () => {
    if (!window.google?.maps || !mapRef.current || !pickupLatLng || !dropoffLatLng) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 14,
      center: pickupLatLng,
      mapTypeControl: false,
      fullscreenControl: true,
      zoomControl: true,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
      streetViewControl: false,
      scrollwheel: true,
      disableDoubleClickZoom: false,
      gestureHandling: "greedy",
      mapId: import.meta.env.VITE_GOOGLE_MAP_ID || "11130661f8b19fe586125b13",
    });
    mapInstanceRef.current = map;

    // Pickup marker (green)
    pickupMarkerRef.current = new window.google.maps.Marker({
      position: pickupLatLng,
      map,
      title: liveRide?.pickupPoint?.placeName || "Pickup",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#61CB08",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });

    // Dropoff marker (red)
    dropoffMarkerRef.current = new window.google.maps.Marker({
      position: dropoffLatLng,
      map,
      title: liveRide?.dropOffPointRequested?.placeName || "Dropoff",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#FF6B6B",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });

    // ✅ FIX: Polyline initialized with correct coordinates from the start
    polylineRef.current = new window.google.maps.Polyline({
      path: fallbackRoutePath.length >= 2 ? fallbackRoutePath : [pickupLatLng, dropoffLatLng],
      geodesic: true,
      strokeColor: "#61CB08",
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map,
    });

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(pickupLatLng);
    bounds.extend(dropoffLatLng);
    map.fitBounds(bounds, 50);

    // Car AdvancedMarker
    if (window.google.maps.marker?.AdvancedMarkerElement) {
      const { AdvancedMarkerElement } = window.google.maps.marker;

      const carDiv = document.createElement("div");
      carDiv.className = "ride-car-marker";
      const img = document.createElement("img");
      img.src = trackingcar;
      img.alt = "Your ride";
      img.className = "ride-car-marker-image";
      carDiv.appendChild(img);

      carElementRef.current = carDiv;

      carMarkerRef.current = new AdvancedMarkerElement({
        map,
        position: pickupLatLng,
        content: carDiv,
        zIndex: 50,
      });
    }

    // ✅ FIX: Use Routes API (computeRoutes) instead of deprecated DirectionsService
    fetchDirectionsRoute(pickupLatLng, dropoffLatLng);
  };

  // Draw road-following polyline using DirectionsService (step-level detail)
  const fetchDirectionsRoute = (origin, destination) => {
    if (!window.google?.maps) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (status === "OK" && result?.routes?.[0]) {
          const route = result.routes[0];

          // Extract detailed path from every step (full road detail)
          const detailedPath = [];
          route.legs.forEach((leg) => {
            leg.steps.forEach((step) => {
              (step.path || []).forEach((latLng) => detailedPath.push(latLng));
            });
          });

          if (detailedPath.length > 1) {
            console.log(`✅ Route loaded: ${detailedPath.length} road points`);
            directionsPathRef.current = detailedPath;
            if (polylineRef.current) polylineRef.current.setPath(detailedPath);
            return;
          }

          // Fallback to overview_path
          const overviewPath = route.overview_path || [];
          if (overviewPath.length > 1) {
            directionsPathRef.current = overviewPath;
            if (polylineRef.current) polylineRef.current.setPath(overviewPath);
          }
        } else {
          console.warn("⚠️ Directions failed:", status);
        }
      }
    );
  };

  // ✅ FIX: This effect only handles marker position sync, NOT polyline
  // Polyline is already correct from initializeMap + fetchDirectionsRoute
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    if (pickupMarkerRef.current && pickupLatLng) pickupMarkerRef.current.setPosition(pickupLatLng);
    if (dropoffMarkerRef.current && dropoffLatLng) dropoffMarkerRef.current.setPosition(dropoffLatLng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupLatLng?.lat, pickupLatLng?.lng, dropoffLatLng?.lat, dropoffLatLng?.lng]);

  // ✅ Smooth car rotation when socket GPS updates
  // Note: car position is already set directly in the socket handler for instant response
  useEffect(() => {
    if (!driverPosition) return;

    const target = driverPosition;
    const prev = prevDriverPositionRef.current;

    // ✅ Rotate car to face direction of travel
    if (prev && window.google?.maps?.geometry) {
      const fromLatLng = new window.google.maps.LatLng(prev.lat, prev.lng);
      const toLatLng = new window.google.maps.LatLng(target.lat, target.lng);
      const rawHeading = window.google.maps.geometry.spherical.computeHeading(fromLatLng, toLatLng) || 0;

      // Only rotate if car actually moved (avoid jitter from same-position updates)
      const distance = Math.abs(target.lat - prev.lat) + Math.abs(target.lng - prev.lng);
      if (distance > 0.00001) {
        const smoothedHeading = headingRef.current + (rawHeading - headingRef.current) * 0.4;
        headingRef.current = smoothedHeading;
        if (carElementRef.current) {
          carElementRef.current.style.transform = `translate(-50%, -50%) rotate(${smoothedHeading}deg)`;
        }
      }
    }

    // ✅ Smooth interpolation from prev → target (visual polish only)
    if (smoothAnimRef.current) cancelAnimationFrame(smoothAnimRef.current);
    const startPos = prev || target;
    const startTime = performance.now();
    const DURATION = 500;

    const animateToTarget = (now) => {
      const t = Math.min((now - startTime) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const interpLat = startPos.lat + (target.lat - startPos.lat) * eased;
      const interpLng = startPos.lng + (target.lng - startPos.lng) * eased;
      if (carMarkerRef.current) {
        carMarkerRef.current.position = { lat: interpLat, lng: interpLng };
      }
      if (t < 1) smoothAnimRef.current = requestAnimationFrame(animateToTarget);
    };

    smoothAnimRef.current = requestAnimationFrame(animateToTarget);
    prevDriverPositionRef.current = target;

    return () => { if (smoothAnimRef.current) cancelAnimationFrame(smoothAnimRef.current); };
  }, [driverPosition]);

  const driver = liveRide?.driver ?? {};
  const vehicle = driver?.vehicleDetails ?? {};
  const pickupName = liveRide?.pickupPoint?.placeName ?? "Pickup";
  const dropoffName = liveRide?.dropOffPointRequested?.placeName ?? "Dropoff";

  const STATUS_CONFIG = {
    in_progress: { label: "Ride in Progress", dot: "bg-green-400 animate-pulse", text: "text-white" },
    accepted: { label: "Driver Accepted", dot: "bg-blue-400 animate-pulse", text: "text-white" },
    arrived: { label: "Your Driver Has Arrived", dot: "bg-yellow-400 animate-pulse", text: "text-yellow-300" },
    picked_up: { label: "On the Way", dot: "bg-green-400 animate-pulse", text: "text-white" },
    completed: { label: "Ride Completed", dot: "bg-gray-400", text: "text-gray-300" },
    cancelled: { label: "Ride Cancelled", dot: "bg-red-400", text: "text-red-300" },
    coming: { label: "Your Driver Has Arrived", dot: "bg-yellow-400 animate-pulse", text: "text-yellow-300" },
  };

  const currentStatus = STATUS_CONFIG[rideStatusDisplay] || STATUS_CONFIG["in_progress"];

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* Map */}
      <div ref={mapRef} className="flex-1 w-full relative bg-gray-900" />

      {/* API error overlay */}
      {apiError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-red-900/90 backdrop-blur-lg border border-red-500/50 rounded-2xl p-6 max-w-sm text-center">
          <h3 className="text-red-300 font-bold mb-2">⚠️ API Error</h3>
          <p className="text-red-200 text-sm mb-4">
            Set VITE_GOOGLE_MAPS_API_KEY in .env and enable Maps JavaScript API.
          </p>
        </div>
      )}

      {/* Loading overlay — show while waiting for real ride data */}
      {(!mapLoaded || !liveRide) && !apiError && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">
              {!mapLoaded ? "Loading Map..." : "Fetching ride data..."}
            </p>
          </div>
        </div>
      )}

      {/* LIVE badge */}
      <div className="absolute top-6 left-6 z-20">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-lg px-4 py-2 rounded-full border border-green-500/30">
          <div className={`w-2 h-2 rounded-full ${socketStatus === "connected" ? "bg-green-400 animate-pulse"
              : socketStatus === "error" ? "bg-red-400"
                : "bg-yellow-400"
            }`} />
          <span className="text-xs font-semibold text-green-300">
            {socketStatus === "connected" ? "LIVE" : socketStatus === "error" ? "ERROR" : "CONNECTING..."}
          </span>
        </div>
      </div>

      {/* Driver card */}
      <div className="absolute top-6 right-20 z-20 bg-black/60 backdrop-blur-lg border border-white/10 rounded-2xl p-4 w-64 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center shrink-0">
            {driver.profilePicture ? (
              <img src={driver.profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl text-gray-400">
                {(driver.name || "D").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{driver.name || "Driver"}</h3>
          </div>
          <p className="text-xs text-green-400">⭐ {Number(driver.rating ?? 0).toFixed(1)}</p>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black to-black/90 border-t border-white/10 rounded-t-3xl transition-all duration-500 backdrop-blur-xl overflow-y-auto ${isExpanded ? "h-screen" : "h-fit max-h-96"}`}>
        {/* Drag handle */}
        <div onClick={() => setIsExpanded(!isExpanded)} className="flex justify-center items-center py-4 cursor-pointer hover:bg-white/5 transition-colors">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-white/10">
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${currentStatus.text}`}>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentStatus.dot}`} />
            {currentStatus.label}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {vehicle.make} {vehicle.model}{vehicle.color && ` • ${vehicle.color}`}{vehicle.licensePlateNumber && ` • ${vehicle.licensePlateNumber}`}
          </p>
        </div>

        {/* Locations */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 bg-green-400 rounded-full border-2 border-black shadow-lg" />
                <div className="w-0.5 h-12 bg-gradient-to-b from-green-400 to-transparent mt-2" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-semibold uppercase">Pickup</p>
                <p className="text-sm text-white font-medium mt-1 truncate">{pickupName}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-black shadow-lg shadow-red-500/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-semibold uppercase">Dropoff</p>
                <p className="text-sm text-white font-medium mt-1 truncate">{dropoffName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-semibold uppercase">Time</p>
              <p className="text-lg font-bold text-white mt-2 flex items-center gap-1">
                <Clock size={16} className="text-green-400 shrink-0" />
                {liveRide?.averageTime != null
                  ? liveRide.averageTime >= 60
                    ? `${(liveRide.averageTime / 60).toFixed(1)} hrs`
                    : `${liveRide.averageTime} min`
                  : "--"}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-semibold uppercase">Distance</p>
              <p className="text-lg font-bold text-white mt-2 flex items-center gap-1">
                <MapPin size={16} className="text-green-400 shrink-0" />
             {liveRide?.rideDistance != null
  ? `${Number(liveRide.rideDistance).toFixed(2)} miles`
  : "--"}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-semibold uppercase">Fare</p>
              <p className="text-lg font-bold text-green-400 mt-2">
                {liveRide?.rideFare != null ? `$ ${liveRide.rideFare}` : "--"}
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        {/* <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-semibold uppercase">Trip Progress</p>
            <p className="text-sm font-bold text-green-400">
              {journeyPoints.length > 0 ? "Moving" : `${Math.round(progress)}%`}
            </p>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300 shadow-lg shadow-green-500/50"
              style={{
                width: journeyPoints.length > 0
                  ? `${Math.min(100, (journeyPoints.length / Math.max(fallbackRoutePath.length, 1)) * 100)}%`
                  : `${progress}%`,
              }}
            />
          </div>
        </div> */}

        {/* Special request */}
        {liveRide?.specialRequest && (
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex gap-3">
              <AlertCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-white mb-1">Special Request</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{liveRide.specialRequest}</p>
              </div>
            </div>
          </div>
        )}

        {/* Chevron */}
        <div className="flex justify-center pb-4">
          <ChevronUp size={20} className={`text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Car marker styles */}
      <style>{`
        .ride-car-marker {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%) rotate(0deg);
          transform-origin: 50% 50%;
          transition: transform 0.12s linear;
          will-change: transform;
        }
        .ride-car-marker-image {
          width: 48px;
          height: 48px;
          object-fit: contain;
          filter: drop-shadow(0 0 10px rgba(97, 203, 8, 0.9)) drop-shadow(0 0 4px rgba(0,0,0,0.8));
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>
    </div>
  );
};

export default RideTracking;