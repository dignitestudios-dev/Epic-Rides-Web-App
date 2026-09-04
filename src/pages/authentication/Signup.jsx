import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { onboard } from "../../redux/slices/auth.slice";
import { Plus } from "lucide-react";
import Cookies from "js-cookie";
import flagUs from "../../assets/login/flag-us-3310bc.png";
import { ErrorToast } from "../../components/global/Toaster";
import TermsAndConditionsModal from "../../components/global/TermsAndConditionsModal";
import PrivacyPolicyModal from "../../components/global/PrivacyPolicyModal";
import SignupSidebar from "../../components/authentication/SignupSidebar";
import SignupBackground from "../../components/authentication/SignupBackground";
import LogoutModal from "../../components/global/LogoutModal";
import {
  markStepCompleted,
  STEPS,
  clearAllSteps,
  isStepCompleted,
  getFirstIncompleteStep,
} from "../../utils/stepValidation";
import {
  ImageFileInputs,
  MobileTakePhotoButton,
} from "../../components/global/ImageFileInputs";
import { loadGoogleMapsPlaces } from "../../utils/loadGoogleMapsPlaces";
import TopRightLogoutButton from "../../components/global/TopRightLogoutButton";

const NAME_MAX_LENGTH = 15;
const NAME_ALPHA_REGEX = /^[A-Za-z]+$/;
const ADDRESS_MIN_LENGTH = 5;
const ADDRESS_MAX_LENGTH = 255;
const ADDRESS_ALLOWED_REGEX = /^[\p{L}\p{N}\s.,\-\/#'()&:]+$/u;
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
// Florida as US state — supports ", FL, USA" and ", FL 32839, USA" (zip in between)
const FLORIDA_STATE_IN_ADDRESS_REGEX =
  /,\s*(?:FL|Florida)\b(?:\s+\d{5}(?:-\d{4})?)?(?:\s*,\s*USA)?\s*$/i;
const FLORIDA_CITY_OTHER_STATE_REGEX = /^Florida\s*,\s*(?!FL\b|Florida\b)/i;
// Approximate geographic bounds for Florida (SW → NE)
const FLORIDA_BOUNDS = {
  south: 24.396308,
  west: -87.634938,
  north: 31.000968,
  east: -79.974306,
};

const sanitizeNameInput = (value) =>
  value.replace(/[^A-Za-z]/g, "").slice(0, NAME_MAX_LENGTH);

const sanitizeAddressInput = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(EMOJI_REGEX, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ADDRESS_MAX_LENGTH);

/** True only when FL/Florida is the state, not a city name in another state (e.g. Florida, NY). */
const isFloridaAddress = (value = "") => {
  const text = String(value || "").trim();
  if (!text) return false;
  if (FLORIDA_CITY_OTHER_STATE_REGEX.test(text)) return false;
  // Reject "Florida, NY" style — but allow when state is clearly FL (with optional zip)
  if (
    /Florida\s*,\s*(?!FL\b)[A-Z]{2}\b/i.test(text) &&
    !/,\s*FL\b(?:\s+\d{5}(?:-\d{4})?)?(?:\s*,|\s*$)/i.test(text)
  ) {
    return false;
  }
  return FLORIDA_STATE_IN_ADDRESS_REGEX.test(text);
};

/** Prefer structured secondary_text (usually "City, FL, USA") for prediction filtering. */
const isFloridaStatePrediction = (prediction) => {
  const description = prediction?.description || "";
  const secondary = prediction?.structured_formatting?.secondary_text || "";

  if (secondary) {
    if (/^Florida\s*,\s*(?!FL\b|Florida\b)/i.test(description)) return false;
    if (
      /(?:^|,\s*)FL\b(?:\s+\d{5}(?:-\d{4})?)?(?:\s*,\s*USA)?\s*$/i.test(
        secondary,
      )
    ) {
      return true;
    }
    if (
      /(?:^|,\s*)Florida\b(?:\s+\d{5}(?:-\d{4})?)?(?:\s*,\s*USA)?\s*$/i.test(
        secondary,
      )
    ) {
      return true;
    }
    // Another state in secondary (NY, CA, ...) → not Florida state
    if (/,\s*(?!FL\b)[A-Z]{2}(?:\s+\d{5})?(?:\s*,\s*USA)?\s*$/i.test(secondary))
      return false;
    if (
      /^(?!FL\b|Florida\b)[A-Z]{2}(?:\s+\d{5})?(?:\s*,\s*USA)?\s*$/i.test(
        secondary,
      )
    )
      return false;
  }

  return isFloridaAddress(description);
};

/** Every typed token must appear in the prediction text (supports "ikea east" → Eastgate). */
const predictionMatchesQueryTokens = (prediction, tokens = []) => {
  if (!tokens.length) return true;
  const haystack = [
    prediction?.description,
    prediction?.structured_formatting?.main_text,
    prediction?.structured_formatting?.secondary_text,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return tokens.every((token) => haystack.includes(token));
};

const isFloridaPlace = (place) => {
  const components = place?.address_components || [];
  return components.some(
    (component) =>
      component.types?.includes("administrative_area_level_1") &&
      (component.short_name === "FL" ||
        component.long_name?.toLowerCase() === "florida"),
  );
};

const isLatLngInFlorida = (latLng) => {
  if (!latLng) return false;
  const lat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
  const lng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  return (
    lat >= FLORIDA_BOUNDS.south &&
    lat <= FLORIDA_BOUNDS.north &&
    lng >= FLORIDA_BOUNDS.west &&
    lng <= FLORIDA_BOUNDS.east
  );
};

const isConfirmedFloridaSelection = (place, prediction) => {
  if (isFloridaPlace(place)) return true;
  if (isLatLngInFlorida(place?.geometry?.location)) return true;
  if (isFloridaAddress(place?.formatted_address || "")) return true;
  if (isFloridaAddress(prediction?.description || "")) return true;
  if (isFloridaStatePrediction(prediction)) return true;
  return false;
};

const getComponentByType = (components = [], type) =>
  components.find((component) => component.types?.includes(type));

const extractCityAndState = (place) => {
  const components = place?.address_components || [];
  const cityComponent =
    getComponentByType(components, "locality") ||
    getComponentByType(components, "postal_town") ||
    getComponentByType(components, "sublocality") ||
    getComponentByType(components, "sublocality_level_1") ||
    getComponentByType(components, "administrative_area_level_2");
  const stateComponent = getComponentByType(
    components,
    "administrative_area_level_1",
  );

  return {
    city: (cityComponent?.long_name || "").trim(),
    state: (
      stateComponent?.long_name ||
      stateComponent?.short_name ||
      ""
    ).trim(),
  };
};

/** Manual entry keeps the Florida-only rule alive through the State field. */
const FLORIDA_STATE_VALUE_REGEX = /^(?:fl|florida)$/i;

const getCityStateValidationError = (value, label, isAutofilled = true) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return isAutofilled
      ? `Select an address to autofill ${label.toLowerCase()}`
      : "This field is required";
  }
  if (trimmed.length < 2) {
    return `${label} must be at least 2 characters`;
  }
  if (label === "State" && !FLORIDA_STATE_VALUE_REGEX.test(trimmed)) {
    return "Only Florida (FL) addresses are supported";
  }
  return "";
};

/**
 * Autofilled (picked from Google) addresses must read as Florida; manually typed
 * addresses are validated as free text and the State field carries the FL check.
 */
const getAddressValidationError = (value, isAutofilled = true) => {
  const sanitized = sanitizeAddressInput(value);

  if (!sanitized) {
    return "This field is required";
  }
  if (sanitized.length < ADDRESS_MIN_LENGTH) {
    return `Minimum ${ADDRESS_MIN_LENGTH} characters required`;
  }
  if (sanitized.length > ADDRESS_MAX_LENGTH) {
    return `Maximum ${ADDRESS_MAX_LENGTH} characters allowed`;
  }
  if (!ADDRESS_ALLOWED_REGEX.test(sanitized)) {
    return "Address contains invalid characters";
  }
  if (!/\p{L}/u.test(sanitized)) {
    if (/^\d+$/.test(sanitized.replace(/\s/g, ""))) {
      return "Address cannot contain only numbers";
    }
    return "Address cannot contain only special characters";
  }
  if (isAutofilled && !isFloridaAddress(sanitized)) {
    return "Please select a Florida address";
  }

  return "";
};

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const SignupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isLoading, phone } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    ssn: "",
    address: "",
    city: "",
    state: "",
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  // true → address came from the Google list (city/state autofilled + locked)
  // false → address typed manually (city/state editable and user-entered)
  const [addressAutofilled, setAddressAutofilled] = useState(false);
  const [addressHint, setAddressHint] = useState("");
  const addressAutofilledRef = useRef(false);
  const addressInputRef = useRef(null);
  const addressSuggestionsRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const addressSearchTimeoutRef = useRef(null);
  const skipAddressBlurSanitizeRef = useRef(false);
  const addressSearchRequestIdRef = useRef(0);

  const searchParams = new URLSearchParams(location.search);
  const referredByFromQuery = searchParams.get("referredBy") || "";
  const referredBy = referredByFromQuery || Cookies.get("referredBy") || "";

  // Field-level error states
  const [fieldErrors, setFieldErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    ssn: "",
    address: "",
    city: "",
    state: "",
    profilePicture: "",
  });

  const { user } = useSelector((state) => state.auth);

  console.log(user, "userprofiledata");

  // Format phone number as (123) 456-7890
  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/\D/g, "");
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) {
      return phoneNumber;
    } else if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  // Check if phone number is verified (stored in localStorage)
  React.useEffect(() => {
    const verifiedPhone = localStorage.getItem("verifiedPhone");

    // If no verified phone number in localStorage, redirect to home page
    if (!verifiedPhone) {
      navigate("/");
      return;
    }
  }, [navigate]);

  // Prevent going back to completed signup step via browser back button.
  React.useEffect(() => {
    if (isStepCompleted(STEPS.SIGNUP)) {
      navigate(getFirstIncompleteStep(), { replace: true });
    }
  }, [navigate]);

  React.useEffect(() => {
    if (referredByFromQuery) {
      Cookies.set("referredBy", referredByFromQuery, { expires: 30 });
    }
  }, [referredByFromQuery]);

  // Auto-fill phone number on component mount from Redux, user profile, or verifiedPhone in localStorage
  React.useEffect(() => {
    const p = phone || user?.phone || localStorage.getItem("verifiedPhone");
    if (p) {
      // Get raw phone number (digits only)
      const rawPhone = String(p).replace(/\D/g, "");
      const localPhone =
        rawPhone.length === 11 && rawPhone.startsWith("1")
          ? rawPhone.slice(1)
          : rawPhone;
      // Format it and set in formData
      const formatted = formatPhoneNumber(localPhone);
      setFormData((prev) => ({
        ...prev,
        phone: formatted,
      }));
    }
  }, [phone, user?.phone]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem("verifiedPhone");
    clearAllSteps();
    Cookies.remove("token");
    Cookies.remove("user");
    localStorage.removeItem("persist:root");
    window.location.replace("/");
  };

  /** Ref mirrors the state so validation inside stable callbacks never reads a stale mode. */
  const setAddressMode = useCallback((isAutofilled) => {
    addressAutofilledRef.current = isAutofilled;
    setAddressAutofilled(isAutofilled);
  }, []);

  // Validate individual field
  const validateField = (fieldName, value) => {
    let error = "";
    const isAutofilled = addressAutofilledRef.current;

    if (fieldName === "firstName" || fieldName === "lastName") {
      if (!value) {
        error = "This field is required";
      } else if (/\s/.test(value)) {
        error = "Spaces are not allowed";
      } else if (!NAME_ALPHA_REGEX.test(value)) {
        error = "Only alphabets are allowed";
      } else if (value.length > NAME_MAX_LENGTH) {
        error = `Maximum ${NAME_MAX_LENGTH} characters allowed`;
      }
    } else if (fieldName === "email") {
      if (!value.trim()) {
        error = "This field is required";
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          error = "Please enter a valid email address";
        }
      }
    } else if (fieldName === "phone") {
      const rawPhone = value.replace(/\D/g, "");
      if (rawPhone.length !== 10) {
        error = "This field is required";
      }
    } else if (fieldName === "ssn") {
      const rawSsn = value.replace(/\D/g, "");
      if (rawSsn.length !== 9) {
        error = "This field is required";
      }
    } else if (fieldName === "address") {
      error = getAddressValidationError(value, isAutofilled);
    } else if (fieldName === "city") {
      error = getCityStateValidationError(value, "City", isAutofilled);
    } else if (fieldName === "state") {
      error = getCityStateValidationError(value, "State", isAutofilled);
    }

    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: error,
    }));

    return error === "";
  };

  // Load Google Places and prepare Florida-biased suggestion search
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;

    let isMounted = true;

    loadGoogleMapsPlaces(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (!isMounted) return;
        autocompleteServiceRef.current =
          new window.google.maps.places.AutocompleteService();
        // PlacesService needs a DOM node (can be hidden)
        const attributionNode = document.createElement("div");
        placesServiceRef.current = new window.google.maps.places.PlacesService(
          attributionNode,
        );
      })
      .catch(() => {
        console.warn(
          "Address autocomplete unavailable: Google Places failed to load",
        );
      });

    return () => {
      isMounted = false;
      if (addressSearchTimeoutRef.current) {
        clearTimeout(addressSearchTimeoutRef.current);
      }
    };
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        addressInputRef.current?.contains(e.target) ||
        addressSuggestionsRef.current?.contains(e.target)
      ) {
        return;
      }
      setShowAddressSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchFloridaAddressSuggestions = useCallback((input) => {
    const query = String(input || "").trim();
    const requestId = ++addressSearchRequestIdRef.current;

    if (!autocompleteServiceRef.current || query.length < 2) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setAddressHint("");
      // Clear "No address found" while query is too short
      setFieldErrors((prev) =>
        prev.address === "No address found" ? { ...prev, address: "" } : prev,
      );
      return;
    }

    const floridaBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(FLORIDA_BOUNDS.south, FLORIDA_BOUNDS.west),
      new window.google.maps.LatLng(FLORIDA_BOUNDS.north, FLORIDA_BOUNDS.east),
    );
    const floridaCenter = floridaBounds.getCenter();
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const primaryToken = tokens[0];

    const runSearch = (searchInput) =>
      new Promise((resolve) => {
        autocompleteServiceRef.current.getPlacePredictions(
          {
            // Do NOT append ", FL" here — it breaks partial street matches like "ikea east"
            input: searchInput,
            componentRestrictions: { country: "us" },
            location: floridaCenter,
            radius: 450000,
            bounds: floridaBounds,
          },
          (predictions, status) => {
            if (
              status !== window.google.maps.places.PlacesServiceStatus.OK ||
              !predictions
            ) {
              resolve([]);
              return;
            }
            resolve(
              predictions.filter((prediction) =>
                isFloridaStatePrediction(prediction),
              ),
            );
          },
        );
      });

    // Full query + first-token search, then keep items matching every typed token
    // so "ikea east" still finds "IKEA, Eastgate Drive, Orlando, FL"
    Promise.all([
      runSearch(query),
      tokens.length > 1 ? runSearch(primaryToken) : Promise.resolve([]),
    ]).then(([fullMatches, baseMatches]) => {
      // Ignore stale responses from older keystrokes
      if (requestId !== addressSearchRequestIdRef.current) return;

      const byPlaceId = new Map();
      [...fullMatches, ...baseMatches].forEach((prediction) => {
        if (!prediction?.place_id) return;
        if (!predictionMatchesQueryTokens(prediction, tokens)) return;
        byPlaceId.set(prediction.place_id, prediction);
      });

      const merged = Array.from(byPlaceId.values());
      setAddressSuggestions(merged);
      setShowAddressSuggestions(merged.length > 0);

      // No match is not an error any more — the address can be typed manually
      setAddressHint(
        merged.length === 0
          ? "No matching address found. You can enter it manually and fill City & State yourself."
          : "",
      );
      setFieldErrors((prev) =>
        prev.address === "No address found" ||
        prev.address === "Please select a Florida address"
          ? { ...prev, address: "" }
          : prev,
      );
    });
  }, []);

  const handleAddressSuggestionSelect = useCallback(
    (prediction) => {
      skipAddressBlurSanitizeRef.current = true;

      const applyAddress = (rawAddress, city = "", state = "") => {
        const selectedAddress = sanitizeAddressInput(rawAddress);
        // Locked only when the place actually resolved both values; otherwise the
        // user finishes City/State by hand (Places details can fail).
        setAddressMode(Boolean(city && state));
        setAddressHint("");
        if (addressInputRef.current) {
          addressInputRef.current.value = selectedAddress;
        }
        setFormData((prev) => ({
          ...prev,
          address: selectedAddress,
          city,
          state,
        }));
        validateField("address", selectedAddress);
        validateField("city", city);
        validateField("state", state);
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
      };

      if (!placesServiceRef.current || !prediction?.place_id) {
        applyAddress(prediction?.description || "");
        return;
      }

      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: [
            "formatted_address",
            "address_components",
            "name",
            "geometry",
          ],
        },
        (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place
          ) {
            // Accept Florida via components, lat/lng, or address text (incl. "FL 32839, USA")
            if (!isConfirmedFloridaSelection(place, prediction)) {
              setFieldErrors((prev) => ({
                ...prev,
                address: "Please select a Florida address",
              }));
              if (addressInputRef.current) {
                addressInputRef.current.value = "";
              }
              setFormData((prev) => ({
                ...prev,
                address: "",
                city: "",
                state: "",
              }));
              setAddressSuggestions([]);
              setShowAddressSuggestions(false);
              return;
            }
            const { city, state } = extractCityAndState(place);
            const resolvedState = state || "Florida";
            const resolvedCity = city;
            // Prefer prediction description when it already includes FL (stable for validation)
            const addressToUse =
              place.formatted_address || prediction.description || "";
            applyAddress(addressToUse, resolvedCity, resolvedState);
            return;
          }
          // Details failed — still allow Florida-filtered prediction text
          if (
            isFloridaStatePrediction(prediction) ||
            isFloridaAddress(prediction.description)
          ) {
            applyAddress(prediction.description);
            return;
          }
          setFieldErrors((prev) => ({
            ...prev,
            address: "Please select a Florida address",
          }));
          setAddressSuggestions([]);
          setShowAddressSuggestions(false);
        },
      );
    },
    [setAddressMode],
  );

  const handleInputChange = (e) => {
    const { name: fieldName, value } = e.target;
    // Prevent editing phone number if it's from Redux state
    if (fieldName === "phone" && phone) {
      return; // Don't allow editing if phone is from Redux
    }

    // Limit lengths for specific fields
    if (fieldName === "firstName" || fieldName === "lastName") {
      const sanitized = sanitizeNameInput(value);
      setFormData((prev) => ({
        ...prev,
        [fieldName]: sanitized,
      }));
      validateField(fieldName, sanitized);
      return;
    }

    if (fieldName === "email") {
      const limitedEmail = value.slice(0, 100); // max 100 characters
      setFormData((prev) => ({
        ...prev,
        [fieldName]: limitedEmail,
      }));
      // Validate on change
      validateField(fieldName, limitedEmail);
      return;
    }

    if (fieldName === "phone") {
      const formatted = formatPhoneNumber(value);
      setFormData((prev) => ({
        ...prev,
        phone: formatted,
      }));
      validateField(fieldName, formatted);
    } else if (fieldName === "ssn") {
      const digits = value.replace(/\D/g, "").slice(0, 9);
      let formatted = digits;
      if (digits.length > 5)
        formatted = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
      else if (digits.length > 3)
        formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
      setFormData((prev) => ({ ...prev, ssn: formatted }));
      validateField(fieldName, formatted);
    } else if (fieldName === "city" || fieldName === "state") {
      const sanitized = value
        .replace(/[^\p{L}\s.'-]/gu, "")
        .replace(/\s+/g, " ")
        .slice(0, 100);
      setFormData((prev) => ({
        ...prev,
        [fieldName]: sanitized,
      }));
      validateField(fieldName, sanitized);
    } else {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: value,
      }));
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        ErrorToast("Image size should not exceed 5MB");
        e.target.value = ""; // Clear the input
        return;
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heif",
        "image/heic",
      ];

      // Also check file extension as fallback
      const fileExtension = file.name.split(".").pop().toLowerCase();
      const allowedExtensions = ["jpg", "jpeg", "png", "heif", "heic", "webp"];

      if (
        !allowedTypes.includes(file.type) &&
        !allowedExtensions.includes(fileExtension)
      ) {
        ErrorToast("Only JPG/JPEG, PNG, HEIC/HEIF, or WEBP images are allowed");
        e.target.value = ""; // Clear the input
        return;
      }

      // If validation passes, set the file
      setProfilePicture(file);
      setFieldErrors((prev) => ({
        ...prev,
        profilePicture: "",
      }));
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async () => {
    // Validate all fields first
    const isFirstNameValid = validateField("firstName", formData.firstName);
    const isLastNameValid = validateField("lastName", formData.lastName);
    const isEmailValid = validateField("email", formData.email);
    const isPhoneValid = validateField("phone", formData.phone);
    const isSsnValid = validateField("ssn", formData.ssn);
    const sanitizedAddress = sanitizeAddressInput(
      addressInputRef.current?.value || formData.address,
    );
    if (addressInputRef.current) {
      addressInputRef.current.value = sanitizedAddress;
    }
    setFormData((prev) => ({ ...prev, address: sanitizedAddress }));
    const isAddressValid = validateField("address", sanitizedAddress);
    const isCityValid = validateField("city", formData.city);
    const isStateValid = validateField("state", formData.state);
    const hasProfilePicture = Boolean(profilePicture);
    if (!hasProfilePicture) {
      setFieldErrors((prev) => ({
        ...prev,
        profilePicture: "Profile picture is required",
      }));
    }

    if (
      !isFirstNameValid ||
      !isLastNameValid ||
      !isEmailValid ||
      !isPhoneValid ||
      !isSsnValid ||
      !isAddressValid ||
      !isCityValid ||
      !isStateValid ||
      !hasProfilePicture
    ) {
      ErrorToast("Please fill the required fields");
      return;
    }

    try {
      // Dispatch onboard action with form data
      const result = await dispatch(
        onboard({
          role: "driver",
          file: profilePicture,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email.trim(),
          ssn: formData.ssn.replace(/\D/g, ""),
          address: sanitizedAddress,
          city: formData.city.trim(),
          // Manually typed "FL"/"fl" is sent as "Florida", matching the autofilled value
          state: FLORIDA_STATE_VALUE_REGEX.test(formData.state.trim())
            ? "Florida"
            : formData.state.trim(),
          phone: (() => {
            const cleanPhone = formData.phone.replace(/\D/g, "");
            return cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;
          })(),
          referredBy: referredBy,
        }),
      ).unwrap();

      // If onboarding successful, mark step 1 as completed and navigate to License Information page
      if (result?.message) {
        Cookies.remove("referredBy");
        markStepCompleted(STEPS.SIGNUP);
        navigate("/license-information", {
          state: { formData },
          replace: true,
        });
      }
    } catch (error) {
      // Error is already handled in the slice with ErrorToast
      console.error("Onboarding error:", error);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-black overflow-x-hidden overflow-y-hidden">
      {/* Top Right Logout Button */}
      <TopRightLogoutButton onClick={handleLogout} />

      {/* Background */}
      <SignupBackground />

      {/* Left Sidebar */}
      <SignupSidebar currentStep={1} />

      {/* Main Content */}
      <div className="absolute inset-0 flex items-start justify-center md:justify-end overflow-y-auto min-[300px]:max-[500px]:pt-[8em] md:pt-0 min-[768px]:max-[768px]:pt-[10em] pb-8">
        <div className="w-full max-w-[calc(100%-2rem)] md:!w-[75em] flex flex-col items-center justify-center md:pr-[0em] px-4 md:px-0">
          {/* Header */}
          <div className="text-center mb-8 md:mb-[1em] mt-[2em] md:mt-0">
            <h1
              className="font-semibold mb-3 md:mb-4 leading-tight text-2xl md:text-[39px] mt-4"
              style={{
                fontFamily: "Poppins",
                color: "#FFFFFF",
                letterSpacing: "-0.5px",
              }}
            >
              Create Profile
            </h1>
            <p
              className="leading-tight text-sm md:text-base"
              style={{
                fontFamily: "Poppins",
                color: "#E6E6E6",
                fontWeight: 400,
              }}
            >
              Please enter your details to continue.
            </p>
          </div>

          {/* Form Container */}
          <div className="w-full max-w-md space-y-4 md:space-y-6">
            {/* Upload Profile Picture */}
            <div className="flex flex-row items-center gap-3 md:gap-4 mb-6 md:mb-0">
              <label
                htmlFor="profile-picture-upload"
                className="flex items-center justify-center relative cursor-pointer flex-shrink-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)",
                  border: fieldErrors.profilePicture
                    ? "2px dashed #FF4444"
                    : "2px dashed #61CB08",
                  backdropFilter: "blur(42px)",
                  borderRadius: "200px",
                  overflow: "hidden",
                }}
              >
                {profilePicturePreview ? (
                  <img
                    src={profilePicturePreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Plus
                    size={24}
                    color="#61CB08"
                    strokeWidth={1.2}
                    className="md:w-8 md:h-8"
                  />
                )}
                <ImageFileInputs
                  id="profile-picture-upload"
                  capture="user"
                  onChange={handleProfilePictureChange}
                />
              </label>
              <div className="flex flex-col gap-1">
                <p
                  className="font-medium text-center text-xs md:text-sm"
                  style={{
                    fontFamily: "Poppins",
                    color: "#F7F7FA",
                  }}
                >
                  Upload Profile Picture
                </p>
                <MobileTakePhotoButton inputId="profile-picture-upload" />
                {fieldErrors.profilePicture && (
                  <p
                    className="text-xs"
                    style={{
                      color: "#FF4444",
                      fontFamily: "Poppins",
                      fontWeight: 500,
                    }}
                  >
                    {fieldErrors.profilePicture}
                  </p>
                )}
              </div>
            </div>
            {/* First name & Last name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-4">
              <div>
                <label
                  className="block mb-2 font-semibold text-xs md:text-sm"
                  style={{
                    fontFamily: "Poppins",
                    color: "#FFFFFF",
                    textTransform: "capitalize",
                  }}
                >
                  First name
                </label>
                <style>{`
                  input[name="firstName"]:-webkit-autofill,
                  input[name="firstName"]:-webkit-autofill:hover,
                  input[name="firstName"]:-webkit-autofill:focus,
                  input[name="firstName"]:-webkit-autofill:active,
                  input[name="lastName"]:-webkit-autofill,
                  input[name="lastName"]:-webkit-autofill:hover,
                  input[name="lastName"]:-webkit-autofill:focus,
                  input[name="lastName"]:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
                    box-shadow: 0 0 0 1000px transparent inset !important;
                    -webkit-text-fill-color: #FFFFFF !important;
                    caret-color: #FFFFFF !important;
                  }
                  input[name="firstName"]:-webkit-autofill,
                  input[name="lastName"]:-webkit-autofill {
                    transition: background-color 9999s ease-out 0s !important;
                  }
                `}</style>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  maxLength={NAME_MAX_LENGTH}
                  placeholder="First name"
                  autoComplete="given-name"
                  className="w-full px-3 py-2.5 md:py-3 rounded-xl outline-none placeholder:text-[#808080] text-sm md:text-sm"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)",
                    backdropFilter: "blur(42px)",
                    border: fieldErrors.firstName
                      ? "1px solid #FF4444"
                      : "1px solid rgba(97, 203, 8, 0.32)",
                    fontFamily: "Poppins",
                    color: formData.firstName ? "#FFFFFF" : "#808080",
                    transition:
                      "border-color 0.2s, background-color 9999s ease-out 0s",
                  }}
                />
                {fieldErrors.firstName && (
                  <p
                    className="text-xs mt-1.5"
                    style={{
                      color: "#FF4444",
                      fontFamily: "Poppins",
                      fontWeight: 500,
                    }}
                  >
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block mb-2 font-semibold text-xs md:text-sm"
                  style={{
                    fontFamily: "Poppins",
                    color: "#FFFFFF",
                    textTransform: "capitalize",
                  }}
                >
                  Last name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  maxLength={NAME_MAX_LENGTH}
                  placeholder="Last name"
                  autoComplete="family-name"
                  className="w-full px-3 py-2.5 md:py-3 rounded-xl outline-none placeholder:text-[#808080] text-sm md:text-sm"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)",
                    backdropFilter: "blur(42px)",
                    border: fieldErrors.lastName
                      ? "1px solid #FF4444"
                      : "1px solid rgba(97, 203, 8, 0.32)",
                    fontFamily: "Poppins",
                    color: formData.lastName ? "#FFFFFF" : "#808080",
                    transition:
                      "border-color 0.2s, background-color 9999s ease-out 0s",
                  }}
                />
                {fieldErrors.lastName && (
                  <p
                    className="text-xs mt-1.5"
                    style={{
                      color: "#FF4444",
                      fontFamily: "Poppins",
                      fontWeight: 500,
                    }}
                  >
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                className="block mb-2 font-semibold text-xs md:text-sm"
                style={{
                  fontFamily: "Poppins",
                  color: "#FFFFFF",
                  textTransform: "capitalize",
                }}
              >
                Email Address
              </label>
              <style>{`
                input[name="email"]:-webkit-autofill,
                input[name="email"]:-webkit-autofill:hover,
                input[name="email"]:-webkit-autofill:focus,
                input[name="email"]:-webkit-autofill:active {
                  -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
                  box-shadow: 0 0 0 1000px transparent inset !important;
                  -webkit-text-fill-color: #FFFFFF !important;
                  caret-color: #FFFFFF !important;
                }
                
                input[name="email"]:-webkit-autofill {
                  transition: background-color 9999s ease-out 0s !important;
                }
              `}</style>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                maxLength={100}
                placeholder="Enter email address"
                className="w-full px-3 py-2.5 md:py-3 rounded-xl outline-none placeholder:text-[#808080] text-sm md:text-sm"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)",
                  backdropFilter: "blur(42px)",
                  border: fieldErrors.email
                    ? "1px solid #FF4444"
                    : "1px solid rgba(97, 203, 8, 0.32)",
                  fontFamily: "Poppins",
                  color: formData.email ? "#FFFFFF" : "#808080",
                  transition:
                    "border-color 0.2s, background-color 9999s ease-out 0s",
                }}
              />
              {fieldErrors.email && (
                <p
                  className="text-xs mt-1.5"
                  style={{
                    color: "#FF4444",
                    fontFamily: "Poppins",
                    fontWeight: 500,
                  }}
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>
            {/* Phone Number Field */}
            <div>
              <label
                className="block mb-2 font-semibold text-xs md:text-sm"
                style={{
                  fontFamily: "Poppins",
                  color: "#FFFFFF",
                  textTransform: "capitalize",
                }}
              >
                Phone Number
              </label>
              <div
                className="flex items-center rounded-xl overflow-hidden h-10 md:h-[44px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)",
                  backdropFilter: "blur(42px)",
                  border: fieldErrors.phone
                    ? "1px solid #FF4444"
                    : "1px solid rgba(97, 203, 8, 0.32)",
                  transition: "border-color 0.2s",
                }}
              >
                {/* Country Code */}
                <div
                  className="flex items-center px-2 md:px-3 gap-1.5 md:gap-2"
                  style={{
                    borderRight: "1px solid rgba(173, 173, 173, 0.5)",
                  }}
                >
                  <img
                    src={flagUs}
                    alt="US flag"
                    className="w-5 h-3.5 md:w-6 md:h-4 rounded-sm object-cover"
                  />
                  <span
                    className="text-xs md:text-sm"
                    style={{
                      fontFamily: "Poppins",
                      color: "#FFFFFF",
                      fontWeight: 400,
                    }}
                  >
                    +1
                  </span>
                </div>
                {/* Phone Input */}
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(123) 456-7890"
                  maxLength={14}
                  disabled={!!phone}
                  readOnly={!!phone}
                  className="flex-1 px-2 md:px-3 outline-none bg-transparent placeholder:text-[#a3a3a3] disabled:cursor-not-allowed text-xs md:text-sm"
                  style={{
                    fontFamily: "Poppins",
                    color: formData.phone ? "#a3a3a3" : "#a3a3a3",
                    fontWeight: 400,
                    opacity: phone ? 0.7 : 1,
                    cursor: phone ? "not-allowed" : "text",
                  }}
                />
              </div>
              {fieldErrors.phone && (
                <p
                  className="text-xs mt-1.5"
                  style={{
                    color: "#FF4444",
                    fontFamily: "Poppins",
                    fontWeight: 500,
                  }}
                >
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            {/* SSN Field */}
            <div>
              <label
                className="block mb-2 font-semibold text-xs md:text-sm"
                style={{
                  fontFamily: "Poppins",
                  color: "#FFFFFF",
                  textTransform: "capitalize",
                }}
              >
                Social Security Number
              </label>
              <input
                type="text"
                name="ssn"
                value={formData.ssn}
                onChange={handleInputChange}
                placeholder="XXX-XX-XXXX"
                maxLength={11}
                className="w-full px-3 py-2.5 md:py-3 rounded-xl outline-none placeholder:text-[#808080] text-sm"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)",
                  backdropFilter: "blur(42px)",
                  border: fieldErrors.ssn
                    ? "1px solid #FF4444"
                    : "1px solid rgba(97, 203, 8, 0.32)",
                  fontFamily: "Poppins",
                  color: formData.ssn ? "#FFFFFF" : "#808080",
                  transition: "border-color 0.2s",
                }}
              />
              {fieldErrors.ssn && (
                <p
                  className="text-xs mt-1.5"
                  style={{
                    color: "#FF4444",
                    fontFamily: "Poppins",
                    fontWeight: 500,
                  }}
                >
                  {fieldErrors.ssn}
                </p>
              )}
            </div>

            {/* Address Field */}
            <div className="relative">
              <label
                className="block mb-2 font-semibold text-xs md:text-sm"
                style={{
                  fontFamily: "Poppins",
                  color: "#FFFFFF",
                  textTransform: "capitalize",
                }}
              >
                Address
              </label>
              <input
                ref={addressInputRef}
                type="text"
                name="address"
                defaultValue={formData.address}
                onBlur={(e) => {
                  if (skipAddressBlurSanitizeRef.current) {
                    skipAddressBlurSanitizeRef.current = false;
                    return;
                  }
                  const sanitized = sanitizeAddressInput(e.target.value);
                  e.target.value = sanitized;
                  setFormData((prev) => ({ ...prev, address: sanitized }));
                  validateField("address", sanitized);
                  setTimeout(() => setShowAddressSuggestions(false), 150);
                }}
                onFocus={() => {
                  if (addressSuggestions.length > 0) {
                    setShowAddressSuggestions(true);
                  }
                }}
                onInput={(e) => {
                  const value = e.target.value;
                  // Typing switches to manual entry: place-based city/state no longer
                  // describe this address, so drop them and unlock both fields.
                  const wasAutofilled = addressAutofilledRef.current;
                  setAddressMode(false);
                  setFormData((prev) => ({
                    ...prev,
                    address: value,
                    ...(wasAutofilled ? { city: "", state: "" } : {}),
                  }));
                  setFieldErrors((prev) => ({
                    ...prev,
                    city: "",
                    state: "",
                    // Keep search result messaging until fetch finishes; clear only if emptied
                    address: value.trim() ? prev.address : "",
                  }));
                  if (addressSearchTimeoutRef.current) {
                    clearTimeout(addressSearchTimeoutRef.current);
                  }
                  addressSearchTimeoutRef.current = setTimeout(() => {
                    fetchFloridaAddressSuggestions(value);
                  }, 250);
                }}
                placeholder="Enter your address"
                maxLength={ADDRESS_MAX_LENGTH}
                autoComplete="off"
                className="w-full px-3 py-2.5 md:py-3 rounded-xl outline-none placeholder:text-[#808080] text-sm md:text-sm"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)",
                  backdropFilter: "blur(42px)",
                  border: fieldErrors.address
                    ? "1px solid #FF4444"
                    : "1px solid rgba(97, 203, 8, 0.32)",
                  fontFamily: "Poppins",
                  color: "#FFFFFF",
                  transition: "border-color 0.2s",
                }}
              />
              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <ul
                  ref={addressSuggestionsRef}
                  className="absolute z-[10000] w-full mt-1 rounded-xl overflow-hidden max-h-60 overflow-y-auto"
                  style={{
                    background: "rgba(20, 20, 20, 0.98)",
                    border: "1px solid rgba(97, 203, 8, 0.32)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {addressSuggestions.map((suggestion) => (
                    <li
                      key={suggestion.place_id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAddressSuggestionSelect(suggestion);
                      }}
                      className="px-3 py-2.5 cursor-pointer text-sm transition-colors"
                      style={{
                        fontFamily: "Poppins",
                        color: "#E6E6E6",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(97, 203, 8, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {suggestion.description}
                    </li>
                  ))}
                </ul>
              )}
              {fieldErrors.address ? (
                <p
                  className="text-xs mt-1.5"
                  style={{
                    color: "#FF4444",
                    fontFamily: "Poppins",
                    fontWeight: 500,
                  }}
                >
                  {fieldErrors.address}
                </p>
              ) : (
                addressHint && (
                  <p
                    className="text-xs mt-1.5"
                    style={{
                      color: "#A3A3A3",
                      fontFamily: "Poppins",
                      fontWeight: 400,
                    }}
                  >
                    {addressHint}
                  </p>
                )
              )}
            </div>

            {/* City & State Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-4">
              <div>
                <label
                  className="block mb-2 font-semibold text-xs md:text-sm"
                  style={{
                    fontFamily: "Poppins",
                    color: "#FFFFFF",
                    textTransform: "capitalize",
                  }}
                >
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  onBlur={(e) => validateField("city", e.target.value)}
                  readOnly={addressAutofilled}
                  disabled={addressAutofilled}
                  placeholder={addressAutofilled ? "City" : "Enter your city"}
                  maxLength={100}
                  autoComplete="off"
                  className="w-full px-3 py-2.5 md:py-3 rounded-xl outline-none placeholder:text-[#808080] text-sm md:text-sm disabled:cursor-not-allowed"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)",
                    backdropFilter: "blur(42px)",
                    border: fieldErrors.city
                      ? "1px solid #FF4444"
                      : "1px solid rgba(97, 203, 8, 0.32)",
                    fontFamily: "Poppins",
                    color: addressAutofilled
                      ? formData.city
                        ? "#a3a3a3"
                        : "#808080"
                      : "#FFFFFF",
                    opacity: addressAutofilled ? 0.85 : 1,
                    transition: "border-color 0.2s",
                  }}
                />
                {fieldErrors.city && (
                  <p
                    className="text-xs mt-1.5"
                    style={{
                      color: "#FF4444",
                      fontFamily: "Poppins",
                      fontWeight: 500,
                    }}
                  >
                    {fieldErrors.city}
                  </p>
                )}
              </div>
              <div>
                <label
                  className="block mb-2 font-semibold text-xs md:text-sm"
                  style={{
                    fontFamily: "Poppins",
                    color: "#FFFFFF",
                    textTransform: "capitalize",
                  }}
                >
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  onBlur={(e) => validateField("state", e.target.value)}
                  readOnly={addressAutofilled}
                  disabled={addressAutofilled}
                  placeholder={addressAutofilled ? "State" : "Florida"}
                  maxLength={100}
                  autoComplete="off"
                  className="w-full px-3 py-2.5 md:py-3 rounded-xl outline-none placeholder:text-[#808080] text-sm md:text-sm disabled:cursor-not-allowed"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(97, 203, 8, 0.12) 0%, rgba(97, 203, 8, 0.04) 50%, rgba(97, 203, 8, 0.07) 100%)",
                    backdropFilter: "blur(42px)",
                    border: fieldErrors.state
                      ? "1px solid #FF4444"
                      : "1px solid rgba(97, 203, 8, 0.32)",
                    fontFamily: "Poppins",
                    color: addressAutofilled
                      ? formData.state
                        ? "#a3a3a3"
                        : "#808080"
                      : "#FFFFFF",
                    opacity: addressAutofilled ? 0.85 : 1,
                    transition: "border-color 0.2s",
                  }}
                />
                {fieldErrors.state && (
                  <p
                    className="text-xs mt-1.5"
                    style={{
                      color: "#FF4444",
                      fontFamily: "Poppins",
                      fontWeight: 500,
                    }}
                  >
                    {fieldErrors.state}
                  </p>
                )}
              </div>
            </div>

            {/* Next Button - Step 1 */}
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="w-full py-2.5 md:py-3 rounded-[14px] font-semibold mt-6 md:mt-8 transition-colors duration-200 disabled:cursor-not-allowed text-sm md:text-sm"
              style={{
                background: isLoading ? "#61CB0866" : "#61CB08",
                color: "#000B00",
                fontFamily: "Poppins",
                fontWeight: 600,
                textTransform: "capitalize",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.target.style.background = "#028C08";
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.target.style.background = "#61CB08";
                }
              }}
            >
              {isLoading ? "Processing..." : "Next"}
            </button>

            {/* Terms Text */}
            <div
              className="text-center !mt-6 md:!mt-10 text-xs md:text-sm px-2"
              style={{
                fontFamily: "Poppins",
                color: "#FFFFFF",
                fontWeight: 600,
              }}
            >
              By registering, you accept our{" "}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="hover:underline bg-transparent border-none cursor-pointer text-xs md:text-sm"
                style={{
                  color: "#61CB08",
                  fontFamily: "Poppins",
                  fontWeight: 600,
                }}
              >
                Terms & conditions
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="hover:underline bg-transparent border-none cursor-pointer text-xs md:text-sm"
                style={{
                  color: "#61CB08",
                  fontFamily: "Poppins",
                  fontWeight: 600,
                }}
              >
                Privacy policy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
};

export default SignupPage;
