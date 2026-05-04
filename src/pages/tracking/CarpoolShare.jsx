import React, { useState, useEffect, useRef, useMemo } from "react";
import { Phone, MessageCircle, MapPin, Clock, Users, ChevronUp } from "lucide-react";
import { io } from "socket.io-client";
import { trackingcar } from "../../assets/export";
import { ErrorToast } from "../../components/global/Toaster";
import { useNavigate } from "react-router";
import { baseUrl } from "../../axios";

// GeoJSON [lng, lat] → { lat, lng }
const coordsToLatLng = (coordinates) => {
  if (!coordinates || coordinates.length < 2) return null;
  return { lat: coordinates[1], lng: coordinates[0] };
};

const normId = (v) => (v == null || v === "" ? "" : String(v).trim());

/** Socket / API status → STATUS_CONFIG key (empty if missing) */
const normalizeCarpoolStatusKey = (s) => {
  if (s == null || s === "") return "";
  const raw = String(s).trim();
  // Support formats like:
  // - "in-progress" / "in progress" -> "in_progress"
  // - "inProgress" -> "in_progress"
  const withSnakeCase = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_");
  return withSnakeCase.toLowerCase();
};

const CARPOOL_STATUS_RANK = {
  open: 0,
  full: 1,
  in_progress: 2,
  completed: 3,
  cancelled: 3,
};

const furtherCarpoolStatus = (prevKey, nextKey) => {
  const a = normalizeCarpoolStatusKey(prevKey);
  const b = normalizeCarpoolStatusKey(nextKey);
  const ra = CARPOOL_STATUS_RANK[a] ?? 0;
  const rb = CARPOOL_STATUS_RANK[b] ?? 0;
  return rb >= ra ? b : a;
};

const STATUS_CONFIG = {
  open: { label: "Carpool Open", dot: "bg-blue-400 animate-pulse", text: "text-blue-300" },
  full: { label: "Carpool Full", dot: "bg-yellow-400 animate-pulse", text: "text-yellow-300" },
  in_progress: { label: "Carpool in Progress", dot: "bg-green-400 animate-pulse", text: "text-white" },
  completed: { label: "Carpool Completed", dot: "bg-gray-400", text: "text-gray-300" },
  cancelled: { label: "Carpool Cancelled", dot: "bg-red-400", text: "text-red-300" },
};

const getPreferredDisplayStatus = (...statuses) => {
  const normalized = statuses
    .map((s) => normalizeCarpoolStatusKey(s))
    .filter(Boolean);

  if (normalized.includes("cancelled")) return "cancelled";
  if (normalized.includes("completed")) return "completed";
  if (normalized.includes("in_progress")) return "in_progress";
  if (normalized.includes("full")) return "full";
  if (normalized.includes("open")) return "open";

  return "open";
};

/** Carpool passenger — opened from /share?carpool=…&passengerId=… */
export default function CarpoolShare() {
  const navigate = useNavigate();

  // Map refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const startMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const carMarkerRef = useRef(null);
  const carElementRef = useRef(null);
  const polylineRef = useRef(null);
  const directionsPathRef = useRef([]);

  // Animation
  const headingRef = useRef(0);
  const smoothAnimRef = useRef(null);
  const prevPosRef = useRef(null);

  // Socket
  const socketRef = useRef(null);

  // UI state
  const [liveCarpool, setLiveCarpool] = useState(null);
  const [driverPosition, setDriverPosition] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [socketStatus, setSocketStatus] = useState("disconnected");
  const [isExpanded, setIsExpanded] = useState(false);
  const [carpoolStatus, setCarpoolStatus] = useState("open");

  // ✅ FIX: forcedDisplayStatus ko SIRF ref mein rakho
  // State se hata diya taake socket useEffect re-run NA ho
  const forcedDisplayStatusRef = useRef("");

  const [viewerPickupConfirmed, setViewerPickupConfirmed] = useState(false);
  const carpoolStatusRef = useRef("open");

  const GOOGLE_MAPS_API_KEY =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { carpoolId, passengerId } = useMemo(() => {
    if (typeof window === "undefined") return { carpoolId: "", passengerId: "" };
    const params = new URLSearchParams(window.location.search);
    const cid = (
      params.get("carpool") ||
      params.get("carpoolId") ||
      params.get("id") ||
      ""
    ).trim();
    const pid = (params.get("passengerId") || params.get("passenger") || "").trim();
    return { carpoolId: cid, passengerId: pid };
  }, []);

  useEffect(() => {
    setViewerPickupConfirmed(false);
    forcedDisplayStatusRef.current = "";
    setCarpoolStatus("open");
    carpoolStatusRef.current = "open";
  }, [carpoolId, passengerId]);

  useEffect(() => {
    carpoolStatusRef.current = normalizeCarpoolStatusKey(carpoolStatus) || "open";
  }, [carpoolStatus]);

  // ✅ FIX: Helper function jo ref update kare aur UI bhi force re-render kare
  // Ek alag render trigger state use karte hain
  const [statusRenderKey, setStatusRenderKey] = useState(0);

  const setForcedStatus = (val) => {
    forcedDisplayStatusRef.current = val;
    // Sirf ek counter increment karo taake component re-render ho
    // lekin socket useEffect re-run NA ho
    setStatusRenderKey((k) => k + 1);
  };

  const currentPassenger = useMemo(() => {
    const list = liveCarpool?.passengers ?? [];
    if (!list.length) return null;
    const pid = normId(passengerId);
    if (!pid) return list[0];

    const matchPax = (p) =>
      normId(p.user?._id) === pid ||
      normId(p.bookingId) === pid ||
      normId(p._id) === pid;

    let p = list.find(matchPax);
    if (!p && Array.isArray(liveCarpool?.bookings)) {
      const booking = liveCarpool.bookings.find(
        (b) => normId(b.passenger) === pid || normId(b._id) === pid
      );
      if (booking) {
        p = list.find((x) => normId(x.bookingId) === normId(booking._id));
      }
    }
    if (!p) return null;

    const bookingForPax = Array.isArray(liveCarpool?.bookings)
      ? liveCarpool.bookings.find(
          (b) =>
            normId(b._id) === normId(p.bookingId ?? p.booking?._id) ||
            (normId(p.user?._id) && normId(b.passenger) === normId(p.user?._id))
        )
      : null;

    const bStat = bookingForPax?.status;
    const pStat = p.status;
    const status =
      pStat === "picked_up" || bStat === "picked_up"
        ? "picked_up"
        : pStat ?? bStat;

    return { ...p, status };
  }, [liveCarpool, passengerId]);

  const passengerBadgeStatus =
    viewerPickupConfirmed || currentPassenger?.status === "picked_up"
      ? "picked_up"
      : (currentPassenger?.status ?? "accepted");

  const currentBooking = useMemo(() => {
    const bookings = liveCarpool?.bookings ?? [];
    if (!bookings.length) return null;
    const pid = normId(passengerId);

    if (currentPassenger?.bookingId) {
      const byPaxBooking = bookings.find(
        (b) => normId(b._id) === normId(currentPassenger.bookingId)
      );
      if (byPaxBooking) return byPaxBooking;
    }

    if (pid) {
      return (
        bookings.find((b) => normId(b.passenger) === pid) ||
        bookings.find((b) => normId(b._id) === pid) ||
        null
      );
    }

    return null;
  }, [liveCarpool, passengerId, currentPassenger]);

  const startLatLng = useMemo(
    () => coordsToLatLng(currentPassenger?.pickupStop?.location?.coordinates),
    [currentPassenger]
  );

  const destLatLng = useMemo(
    () => coordsToLatLng(currentPassenger?.dropOffStop?.location?.coordinates),
    [currentPassenger]
  );

  // ✅ FIX: forcedDisplayStatus dependency array se HATA DIYA
  // Ab socket sirf carpoolId aur passengerId change hone par reconnect hoga
  useEffect(() => {
    if (!carpoolId) return;

    const socket = io(baseUrl, {
      transports: ["websocket"],
      query: {
        origin: "web",
        carpoolId,
        passengerId: passengerId || "",
      },
    });

    socketRef.current = socket;

    const normalizeSocketPayload = (raw) => {
      if (!Array.isArray(raw)) return raw;
      if (raw.length >= 2 && raw[1] && typeof raw[1] === "object") return raw[1];
      if (raw.length === 1 && raw[0] && typeof raw[0] === "object") return raw[0];
      return raw;
    };

    const extractCarpool = (raw) => {
      const payload = normalizeSocketPayload(raw);
      if (!payload || typeof payload !== "object") return null;
      return payload?.data?.carpool || payload?.carpool || null;
    };

    // ✅ FIX: forcedDisplayStatusRef.current use karo — stale closure nahi hoga
    const applyCarpoolPayload = (raw) => {
      const cp = extractCarpool(raw);
      if (cp && typeof cp === "object") {
        const cpStatus = normalizeCarpoolStatusKey(cp.status);

        if (cpStatus === "cancelled") {
          navigate("/ride-cancelled", {
            replace: true,
            state: { status: "cancelled", kind: "carpool" },
          });
          return;
        }

        setMapInitialized(false);

        setLiveCarpool((prev) => {
          const nextStatus = getPreferredDisplayStatus(
            forcedDisplayStatusRef.current, // ✅ ref use
            carpoolStatusRef.current,
            prev?.status,
            cp.status
          );

          return {
            ...cp,
            status: nextStatus,
          };
        });

        setCarpoolStatus((prev) => {
          const merged = getPreferredDisplayStatus(
            forcedDisplayStatusRef.current, // ✅ ref use
            prev,
            cp.status
          );
          carpoolStatusRef.current = merged;
          return merged;
        });

        if (["in_progress", "completed", "cancelled"].includes(cpStatus)) {
          setForcedStatus(cpStatus); // ✅ naya helper use
        }
      }
    };

    socket.on("carpool:initial_data", (rawPayload) => {
      console.log("📦 carpool:initial_data:", rawPayload);
      applyCarpoolPayload(rawPayload);
    });

    socket.on("carpool:status:update", (payload) => {
      const p = normalizeSocketPayload(payload);
      const status = normalizeCarpoolStatusKey(p?.status || p?.carpoolStatus || "");
      if (!status) return;

      setForcedStatus(status); // ✅ naya helper

      setCarpoolStatus((prev) => {
        const merged = getPreferredDisplayStatus(prev, status);
        carpoolStatusRef.current = merged;
        return merged;
      });

      setLiveCarpool((prev) =>
        prev ? { ...prev, status: getPreferredDisplayStatus(prev.status, status) } : prev
      );

      if (status === "cancelled") {
        navigate("/ride-cancelled", {
          replace: true,
          state: { status, kind: "carpool" },
        });
        return;
      }

      if (status === "completed") {
        navigate("/ride-ended", {
          replace: true,
          state: { status, kind: "carpool" },
        });
      }
    });

    const handleRouteOrStopPayload = (payload) => {
      const p = normalizeSocketPayload(payload);
      if (p?.carpoolId && carpoolId && normId(p.carpoolId) !== normId(carpoolId)) return;

      const statusRaw = p?.status;
      if (statusRaw != null && statusRaw !== "") {
        const st = normalizeCarpoolStatusKey(statusRaw);

        setForcedStatus(st); // ✅ naya helper

        setCarpoolStatus((prev) => {
          const merged = getPreferredDisplayStatus(prev, st);
          carpoolStatusRef.current = merged;
          return merged;
        });

        setLiveCarpool((prev) =>
          prev ? { ...prev, status: getPreferredDisplayStatus(prev.status, st) } : prev
        );
      }

      const updatedStop = p?.stop;
      if (updatedStop?._id) {
        setLiveCarpool((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            routes: (prev.routes || []).map((r) =>
              r._id === updatedStop._id ? { ...r, status: updatedStop.status } : r
            ),
          };
        });
      }

      const hasNestedCarpool = p?.data?.carpool || p?.carpool;
      if (hasNestedCarpool) {
        applyCarpoolPayload(payload);
      }
    };

    socket.on("carpool:route:update", handleRouteOrStopPayload);

    socket.on("carpool:route_update", (...args) => {
      const raw =
        args.find((a) => a != null && (typeof a === "object" || Array.isArray(a))) ?? args[0];

      const p = normalizeSocketPayload(raw);
      if (!p || typeof p !== "object") return;
      if (p.carpoolId && carpoolId && normId(p.carpoolId) !== normId(carpoolId)) return;

      const status = normalizeCarpoolStatusKey(
        p.status ?? p.carpoolStatus ?? p.carpool_status ?? p.carpool_state ?? ""
      );

      console.log("✅ carpool:route_update received:", p);
      console.log("✅ route_update status:", status);

      if (!status) return;

      if (status === "cancelled") {
        setForcedStatus("cancelled"); // ✅
        setCarpoolStatus("cancelled");
        carpoolStatusRef.current = "cancelled";
        setLiveCarpool((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
        navigate("/ride-cancelled", { replace: true });
        return;
      }

      if (status === "completed") {
        setForcedStatus("completed"); // ✅
        setCarpoolStatus("completed");
        carpoolStatusRef.current = "completed";
        setLiveCarpool((prev) => (prev ? { ...prev, status: "completed" } : prev));
        navigate("/ride-ended", {
          replace: true,
          state: { status: "completed", kind: "carpool" },
        });
        return;
      }

      // ✅ Direct status update (no page reload)
      setForcedStatus(status); // ✅ ensures immediate re-render
      carpoolStatusRef.current = status;
      setCarpoolStatus(status);
      setLiveCarpool((prev) => (prev ? { ...prev, status } : { status }));

      const updatedStop = p.stop;
      if (updatedStop?._id) {
        setLiveCarpool((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            routes: (prev.routes || []).map((r) =>
              r._id === updatedStop._id ? { ...r, status: updatedStop.status } : r
            ),
          };
        });
      }

      const hasNestedCarpool = p?.data?.carpool || p?.carpool;
      if (hasNestedCarpool) {
        applyCarpoolPayload(raw);
      }
    });

    socket.on("carpool:stop_arrived", (payload) => {
      console.log("📍 carpool:stop_arrived:", payload);
      handleRouteOrStopPayload(payload);
    });

    socket.on("carpool:passenger_picked_up", (payload) => {
      console.log("👤 carpool:passenger_picked_up:", payload);
      const p = normalizeSocketPayload(payload);
      if (p?.carpoolId && carpoolId && normId(p.carpoolId) !== normId(carpoolId)) return;

      const eventBookingId = normId(p?.bookingId);
      const eventPassengerId = normId(p?.passengerId);
      const urlPid = normId(passengerId);
      const isForShareViewer =
        !urlPid ||
        eventPassengerId === urlPid ||
        eventBookingId === urlPid;

      const passengerRowMatchesEvent = (px) => {
        if (eventBookingId && normId(px.bookingId ?? px.booking?._id) === eventBookingId) {
          return true;
        }
        if (eventPassengerId) {
          const pxUser = normId(
            typeof px.user === "object" && px.user != null ? px.user._id : px.user
          );
          if (pxUser === eventPassengerId) return true;
        }
        return false;
      };

      const otpVerified = p?.otpVerified === true || p?.otpVerified === "true";

      if (isForShareViewer) {
        if (otpVerified) {
          setViewerPickupConfirmed(true);
          setLiveCarpool((prev) => {
            if (!prev) return prev;
            const next = { ...prev };

            if (prev.passengers?.length) {
              next.passengers = prev.passengers.map((px) =>
                passengerRowMatchesEvent(px)
                  ? {
                      ...px,
                      status: "picked_up",
                      ...(p.pickedUpAt != null && { pickedUpAt: p.pickedUpAt }),
                      ...(typeof p.otpVerified === "boolean" && { otpVerified: p.otpVerified }),
                    }
                  : px
              );
            }

            if (prev.bookings?.length && eventBookingId) {
              next.bookings = prev.bookings.map((b) =>
                normId(b._id) === eventBookingId
                  ? {
                      ...b,
                      status: "picked_up",
                      ...(p.pickedUpAt != null && { pickedUpAt: p.pickedUpAt }),
                      ...(typeof p.otpVerified === "boolean" && { otpVerified: p.otpVerified }),
                    }
                  : b
              );
            }

            return next;
          });
        } else {
          setViewerPickupConfirmed(false);
          setLiveCarpool((prev) => {
            if (!prev) return prev;
            const next = { ...prev };

            if (prev.passengers?.length) {
              next.passengers = prev.passengers.map((px) =>
                passengerRowMatchesEvent(px) ? { ...px, status: "accepted" } : px
              );
            }

            if (prev.bookings?.length && eventBookingId) {
              next.bookings = prev.bookings.map((b) =>
                normId(b._id) === eventBookingId ? { ...b, status: "accepted" } : b
              );
            }

            return next;
          });
        }
      }

      const hasNestedCarpool = p?.data?.carpool || p?.carpool;
      if (hasNestedCarpool) {
        applyCarpoolPayload(payload);
      }
    });

    socket.on("carpool:ride_started", (payload) => {
      console.log("🚗 carpool:ride_started:", payload);

      setForcedStatus("in_progress"); // ✅
      carpoolStatusRef.current = "in_progress";
      setCarpoolStatus("in_progress");

      setLiveCarpool((prev) =>
        prev ? { ...prev, status: "in_progress" } : { status: "in_progress" }
      );

      applyCarpoolPayload(payload);
    });

    socket.on("carpool:ride_completed", (payload) => {
      console.log("✅ carpool:ride_completed:", payload);

      setForcedStatus("completed"); // ✅
      carpoolStatusRef.current = "completed";
      setCarpoolStatus("completed");
      setLiveCarpool((prev) =>
        prev ? { ...prev, status: "completed" } : { status: "completed" }
      );

      applyCarpoolPayload(payload);

      navigate("/ride-ended", {
        replace: true,
        state: { status: "completed", kind: "carpool" },
      });
    });

    socket.on("driver:location:update", (payload) => {
      const coords = payload?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return;

      if (smoothAnimRef.current) {
        cancelAnimationFrame(smoothAnimRef.current);
        smoothAnimRef.current = null;
      }

      const newPos = { lat: coords[1], lng: coords[0] };
      setDriverPosition(newPos);

      if (carMarkerRef.current) carMarkerRef.current.position = newPos;
      if (mapInstanceRef.current) mapInstanceRef.current.panTo(newPos);
    });

    socket.on("carpool:error", (payload) => {
      const msg = payload?.message || payload?.error || "Carpool not found.";
      ErrorToast(msg);
      navigate("/ride-not-found", { replace: true });
    });

    socket.on("connect_error", () => setSocketStatus("error"));
    socket.on("disconnect", () => setSocketStatus("disconnected"));

    socket.on("connect", () => {
      console.log("✅ Carpool socket connected:", socket.id);
      setSocketStatus("connected");

      socket.emit(
        "carpool:initial_data",
        { carpoolId, passengerId: passengerId || undefined },
        (ack) => {
          console.log("📬 carpool:initial_data ack:", ack);
          if (ack) applyCarpoolPayload(ack);
        }
      );
    });

    return () => socket.disconnect();
    // ✅ KEY FIX: forcedDisplayStatus dependency array se HATAYA
    // Pehle yahan forcedDisplayStatus tha jis se socket baar baar reconnect hota tha
  }, [carpoolId, passengerId, navigate]);

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
      const iv = setInterval(() => {
        if (window.google?.maps) {
          setMapLoaded(true);
          clearInterval(iv);
        }
      }, 100);
      return () => clearInterval(iv);
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,marker&v=beta`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setApiError(true);
    document.head.appendChild(script);
  }, [GOOGLE_MAPS_API_KEY]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !startLatLng || !destLatLng || mapInitialized) return;

    if (mapInstanceRef.current) {
      if (smoothAnimRef.current) cancelAnimationFrame(smoothAnimRef.current);
      [startMarkerRef, destMarkerRef].forEach((r) => r.current?.setMap?.(null));

      if (carMarkerRef.current) {
        typeof carMarkerRef.current.setMap === "function"
          ? carMarkerRef.current.setMap(null)
          : (carMarkerRef.current.map = null);
      }

      polylineRef.current?.setMap?.(null);
      mapInstanceRef.current = null;
      directionsPathRef.current = [];
    }

    const timer = setTimeout(() => {
      initializeMap();
      setMapInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [mapLoaded, startLatLng, destLatLng, mapInitialized]);

  const initializeMap = () => {
    if (!window.google?.maps || !mapRef.current || !startLatLng || !destLatLng) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: startLatLng,
      mapTypeControl: false,
      fullscreenControl: true,
      zoomControl: true,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
      streetViewControl: false,
      gestureHandling: "greedy",
      mapId: import.meta.env.VITE_GOOGLE_MAP_ID,
    });

    mapInstanceRef.current = map;

    startMarkerRef.current = new window.google.maps.Marker({
      position: startLatLng,
      map,
      title: currentPassenger?.pickupStop?.placeName || "Pickup",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#61CB08",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });

    destMarkerRef.current = new window.google.maps.Marker({
      position: destLatLng,
      map,
      title: currentPassenger?.dropOffStop?.placeName || "Destination",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#FF6B6B",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });

    polylineRef.current = new window.google.maps.Polyline({
      path: [startLatLng, destLatLng],
      geodesic: true,
      strokeColor: "#61CB08",
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map,
    });

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(startLatLng);
    bounds.extend(destLatLng);
    map.fitBounds(bounds, 60);

    if (window.google.maps.marker?.AdvancedMarkerElement) {
      const carDiv = document.createElement("div");
      carDiv.className = "ride-car-marker";

      const img = document.createElement("img");
      img.src = trackingcar;
      img.alt = "Carpool car";
      img.className = "ride-car-marker-image";

      carDiv.appendChild(img);
      carElementRef.current = carDiv;

      carMarkerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: startLatLng,
        content: carDiv,
        zIndex: 50,
      });
    }

    fetchDirectionsRoute(startLatLng, destLatLng, []);
  };

  const fetchDirectionsRoute = (origin, destination, stops) => {
    if (!window.google?.maps) return;

    const waypoints = stops
      .filter((s) => s.latLng)
      .map((s) => ({
        location: new window.google.maps.LatLng(s.latLng.lat, s.latLng.lng),
        stopover: true,
      }));

    const ds = new window.google.maps.DirectionsService();

    ds.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (status === "OK" && result?.routes?.[0]) {
          const detailed = [];
          result.routes[0].legs.forEach((leg) =>
            leg.steps.forEach((step) =>
              (step.path || []).forEach((pt) => detailed.push(pt))
            )
          );

          if (detailed.length > 1) {
            directionsPathRef.current = detailed;
            polylineRef.current?.setPath(detailed);
            return;
          }

          const overview = result.routes[0].overview_path || [];
          if (overview.length > 1) {
            directionsPathRef.current = overview;
            polylineRef.current?.setPath(overview);
          }
        }
      }
    );
  };

  useEffect(() => {
    if (!driverPosition) return;

    const target = driverPosition;
    const prev = prevPosRef.current;

    if (prev && window.google?.maps?.geometry) {
      const from = new window.google.maps.LatLng(prev.lat, prev.lng);
      const to = new window.google.maps.LatLng(target.lat, target.lng);
      const rawH = window.google.maps.geometry.spherical.computeHeading(from, to) || 0;
      const dist = Math.abs(target.lat - prev.lat) + Math.abs(target.lng - prev.lng);

      if (dist > 0.00001) {
        const smoothH = headingRef.current + (rawH - headingRef.current) * 0.4;
        headingRef.current = smoothH;

        if (carElementRef.current) {
          carElementRef.current.style.transform =
            `translate(-50%, -50%) rotate(${smoothH}deg)`;
        }
      }
    }

    if (smoothAnimRef.current) cancelAnimationFrame(smoothAnimRef.current);

    const startPos = prev || target;
    const startTime = performance.now();
    const DURATION = 500;

    const animate = (now) => {
      const t = Math.min((now - startTime) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const lat = startPos.lat + (target.lat - startPos.lat) * eased;
      const lng = startPos.lng + (target.lng - startPos.lng) * eased;

      if (carMarkerRef.current) carMarkerRef.current.position = { lat, lng };
      if (t < 1) smoothAnimRef.current = requestAnimationFrame(animate);
    };

    smoothAnimRef.current = requestAnimationFrame(animate);
    prevPosRef.current = target;

    return () => {
      if (smoothAnimRef.current) cancelAnimationFrame(smoothAnimRef.current);
    };
  }, [driverPosition]);

  const driver = liveCarpool?.driver ?? {};
  const vehicle = driver?.vehicleDetails ?? {};

  // ✅ FIX: forcedDisplayStatusRef.current use karo state ki jagah
  const displayStatusKey =
    getPreferredDisplayStatus(
      forcedDisplayStatusRef.current,
      carpoolStatus,
      liveCarpool?.status,
      liveCarpool?.availableSeats === 0 ? "full" : "open"
    ) || "open";

  const currentSt = STATUS_CONFIG[displayStatusKey] || STATUS_CONFIG.open;

  const displayAvgTime =
    currentBooking?.avgTime ?? liveCarpool?.avgTime ?? null;
  const displayDistance =
    currentBooking?.distance ?? liveCarpool?.distance ?? null;
  const displayFare = currentBooking?.fareCharged ?? null;
  const passengerMismatch =
    Boolean(liveCarpool && normId(passengerId) && !currentPassenger);

  const formatTime = (minutes) => {
    if (minutes == null) return "--";
    const mins = Number(minutes);
    if (mins >= 60) return `${(mins / 60).toFixed(1)} hrs`;
    return `${Math.round(mins)} min`;
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      <div ref={mapRef} className="flex-1 w-full relative bg-gray-900" />

      {apiError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-red-900/90 backdrop-blur-lg border border-red-500/50 rounded-2xl p-6 max-w-sm text-center">
          <h3 className="text-red-300 font-bold mb-2">⚠️ API Error</h3>
          <p className="text-red-200 text-sm">
            Set VITE_GOOGLE_MAPS_API_KEY in .env
          </p>
        </div>
      )}

      {passengerMismatch && !apiError && (
        <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-amber-300 font-semibold mb-2">Passenger not on this carpool</p>
            <p className="text-gray-400 text-sm">
              No passenger matches <span className="text-white break-all">{passengerId}</span> in
              this trip. Check the link.
            </p>
          </div>
        </div>
      )}

      {!apiError && !passengerMismatch && (!mapLoaded || !liveCarpool) && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">
              {!mapLoaded ? "Loading Map..." : "Fetching carpool data..."}
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-6 left-6 z-20">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-lg px-4 py-2 rounded-full border border-green-500/30">
          <div
            className={`w-2 h-2 rounded-full ${
              socketStatus === "connected"
                ? "bg-green-400 animate-pulse"
                : socketStatus === "error"
                  ? "bg-red-400"
                  : "bg-yellow-400"
            }`}
          />
          <span className="text-xs font-semibold text-green-300">
            {socketStatus === "connected"
              ? "LIVE"
              : socketStatus === "error"
                ? "ERROR"
                : "CONNECTING..."}
          </span>
        </div>
      </div>

      <div className="absolute top-6 right-16 z-20 hidden md:block bg-black/60 backdrop-blur-lg border border-white/10 rounded-2xl p-4 w-64 shadow-2xl">
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
            <h3 className="text-sm font-semibold text-white truncate">
              {driver.name || "Driver"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {vehicle.make} {vehicle.model}
            </p>
          </div>
          <p className="text-xs text-green-400">
            ⭐ {Number(driver.rating ?? 0).toFixed(1)}
          </p>
        </div>
      </div>

      <div className="absolute bottom-[62vh] right-6 z-20">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-lg px-3 py-2 rounded-full border border-white/10">
          <Users size={13} className="text-green-400" />
        </div>
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black to-black/90 border-t border-white/10 rounded-t-3xl transition-all duration-500 backdrop-blur-xl overflow-y-auto ${
          isExpanded ? "h-screen" : "h-fit max-h-[60vh]"
        }`}
      >
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex justify-center items-center py-4 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="px-6 pb-4 border-b border-white/10">
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${currentSt.text}`}>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentSt.dot}`} />
            {currentSt.label}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {vehicle.make} {vehicle.model}
            {vehicle.color && ` • ${vehicle.color}`}
            {vehicle.licensePlateNumber && ` • ${vehicle.licensePlateNumber}`}
          </p>
        </div>

        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4">
            Your trip
          </p>
          <div className="space-y-0">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 bg-green-400 rounded-full border-2 border-black shadow-lg" />
                <div className="w-0.5 h-8 bg-gradient-to-b from-green-400/50 to-transparent mt-1" />
              </div>
              <div className="flex-1 pb-3">
                <p className="text-[10px] font-bold uppercase text-gray-500">Pickup</p>
                <p className="text-sm text-white font-medium mt-0.5 truncate">
                  {currentPassenger?.pickupStop?.placeName || "--"}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-black shadow-lg shadow-red-500/50" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase text-gray-500">Destination</p>
                <p className="text-sm text-white font-medium mt-0.5 truncate">
                  {currentPassenger?.dropOffStop?.placeName || "--"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {currentPassenger && !passengerMismatch && (
          <div className="px-6 py-4 border-b border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
              {normId(passengerId) ? "You" : "Passenger"}
            </p>

            <div className="flex items-center gap-3 bg-white/5 rounded-xl border border-white/8 px-3 py-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center shrink-0">
                {currentPassenger.user?.profilePicture ? (
                  <img
                    src={currentPassenger.user.profilePicture}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-gray-400">
                    {(currentPassenger.user?.name || "P").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {currentPassenger.user?.name || "Passenger"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  ⭐ {Number(currentPassenger.user?.rating ?? 0).toFixed(1)}
                  {currentPassenger.user?.email
                    ? ` · ${currentPassenger.user.email}`
                    : ""}
                </p>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border shrink-0 ${
                  passengerBadgeStatus === "accepted"
                    ? "bg-green-500/15 text-green-400 border-green-500/30"
                    : passengerBadgeStatus === "picked_up"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                }`}
              >
                {passengerBadgeStatus === "picked_up" ? "On board" : passengerBadgeStatus}
              </span>
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-b border-white/10">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/8">
              <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Seats</p>
              <p className="text-base font-bold text-white mt-2 flex items-center gap-1">
                <Users size={14} className="text-green-400 shrink-0" />
                {currentBooking?.requiredSeats ??
                  (liveCarpool?.maxPassengers != null ? `— / ${liveCarpool.maxPassengers}` : "--")}
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/8">
              <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Est. time</p>
              <p className="text-base font-bold text-white mt-2 flex items-center gap-1">
                <Clock size={14} className="text-green-400 shrink-0" />
                {formatTime(displayAvgTime)}
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/8">
              <p className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">
                {displayFare != null ? "Fare" : "Distance"}
              </p>
              <p className="text-base font-bold text-green-400 mt-2 flex items-center gap-1">
                <MapPin size={14} className="shrink-0" />
                {displayFare != null
                  ? `$ ${Number(displayFare).toFixed(2)}`
                  : displayDistance != null
                    ? `${Number(displayDistance).toFixed(1)} km`
                    : "--"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center pb-4">
          <ChevronUp
            size={20}
            className={`text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

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
          filter: drop-shadow(0 0 10px rgba(97,203,8,0.9))
            drop-shadow(0 0 4px rgba(0,0,0,0.8));
        }

        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}