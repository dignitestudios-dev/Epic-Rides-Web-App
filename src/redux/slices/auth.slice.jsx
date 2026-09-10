// src/store/slices/auth.slice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../axios";
import Cookies from "js-cookie";
import { ErrorToast, SuccessToast } from "../../components/global/Toaster";
import { syncCompletedStepsFromUser } from "../../utils/onboardingRedirect";

// ================= INITIAL STATE =================
const initialState = {
  isLoading: false,
  isAccountStatusLoading: false,
  isAccountStatusInitialized: false,
  error: null,
  success: null,
  phone: null,
  otpSent: false,
  isAuthenticated: false,
  user: null,
  token: null,
  accountStatus: null,
  stepToComplete: null,
  isOnboarded: false,
  rejectedDocuments: [],
  approvedDocuments: [],
  pendingDocuments: [],
  missingDocuments: [],
};

// ================= THUNKS =================

// Send OTP
export const sendOtp = createAsyncThunk(
  "auth/sendOtp",
  async ({ phone, role = "driver" }, thunkAPI) => {
    try {
      const res = await axios.post("/api/auth/send-otp", {
        phone: phone,
        role: role,
      });
      const { success, message } = res.data || {};

      if (!success) {
        ErrorToast(message || "Failed to send OTP");
        return thunkAPI.rejectWithValue(message || "Failed to send OTP");
      }

      SuccessToast(message || "OTP sent successfully");
      return { message: message || "OTP sent successfully", phone: phone };
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || "OTP sending failed";
      ErrorToast(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Verify OTP
export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async ({ phone, otp, role = "driver" }, thunkAPI) => {
    try {
      const res = await axios.post("/api/auth/verify-otp-web", {
        phone: phone,
        otp: otp,
        role: role,
      });
      const { success, message, data } = res.data || {};

      if (!success) {
        ErrorToast(message || "OTP verification failed");
        return thunkAPI.rejectWithValue(message || "OTP verification failed");
      }

      const userOnboardedStatus =
        data?.isOnboarded !== undefined
          ? Boolean(data.isOnboarded)
          : data?.user?.isOnboarded !== undefined
          ? Boolean(data.user.isOnboarded)
          : false;

      const userToStore = data?.user
        ? {
            ...data.user,
            isOnboarded: userOnboardedStatus,
          }
        : null;

      // Store token on successful verification
      if (data?.token) {
        Cookies.set("token", data.token, { expires: 7 }); // 7 days expiry
      }
      if (userToStore) {
        Cookies.set("user", JSON.stringify(userToStore), { expires: 7 });
      }

      SuccessToast(message || "OTP verified successfully");
      return {
        message: message || "OTP verified successfully",
        token: data?.token || null,
        user: userToStore,
        accountStatus: data?.accountStatus || data?.user?.accountStatus || null,
        isOnboarded: userOnboardedStatus,
        stepToComplete: data?.stepToComplete || null,
        approvedDocuments: data?.approvedDocuments || [],
        pendingDocuments: data?.pendingDocuments || [],
        rejectedDocuments: data?.rejectedDocuments || [],
        missingDocuments: data?.missingDocuments || [],
      };
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || "OTP verification failed";
      ErrorToast(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Get Account Status (Protected)
export const getAccountStatus = createAsyncThunk(
  "auth/getAccountStatus",
  async (_, thunkAPI) => {
    const token = Cookies.get("token");
    if (!token) {
      return thunkAPI.rejectWithValue("No authentication token found");
    }

    try {
      const res = await axios.get("/api/auth/account-status", {
        skipAuthRedirect: true,
      });
      const { success, message, data } = res.data || {};

      if (!success || !data) {
        return thunkAPI.rejectWithValue(message || "Failed to fetch account status");
      }

      const userOnboardedStatus =
        data?.isOnboarded !== undefined
          ? Boolean(data.isOnboarded)
          : data?.user?.isOnboarded !== undefined
          ? Boolean(data.user.isOnboarded)
          : false;

      const userToStore = data?.user
        ? {
            ...data.user,
            isOnboarded: userOnboardedStatus,
          }
        : null;

      if (userToStore) {
        Cookies.set("user", JSON.stringify(userToStore), { expires: 7 });
      }

      return {
        user: userToStore,
        accountStatus: data?.accountStatus || data?.user?.accountStatus || null,
        isOnboarded: userOnboardedStatus,
        stepToComplete: data?.stepToComplete || null,
        approvedDocuments: data?.approvedDocuments || [],
        pendingDocuments: data?.pendingDocuments || [],
        rejectedDocuments: data?.rejectedDocuments || [],
        missingDocuments: data?.missingDocuments || [],
      };
    } catch (e) {
      const status = e.response?.status;
      const errorMessage = e.response?.data?.message || e.message || "Failed to fetch account status";

      // When account status returns 401, auto logout user ONLY if a real token was sent
      if (status === 401 && Cookies.get("token")) {
        const unauthPaths = ["/verification", "/signup", "/"];
        if (!unauthPaths.includes(window.location.pathname)) {
          Cookies.remove("token");
          Cookies.remove("user");
          localStorage.removeItem("verifiedPhone");
          localStorage.removeItem("completedSteps");
          localStorage.removeItem("persist:root");
          ErrorToast("Session expired. Please login again.");
          window.location.replace("/");
        }
      }

      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Onboard API
export const onboard = createAsyncThunk(
  "auth/onboard",
  async (
    { role = "driver", file, firstName, lastName, name, email, phone, ssn, address, city, state, referredBy },
    thunkAPI
  ) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Append file if provided (key should be "file" as per API)
      if (file) {
        formData.append("file", file);
      }
      
      // Append other fields
      const fn = (firstName ?? "").trim();
      const ln = (lastName ?? "").trim();
      const fullName = (name ?? `${fn} ${ln}`.trim()).trim();
      if (fn) formData.append("firstName", fn);
      if (ln) formData.append("lastName", ln);
      if (fullName) formData.append("name", fullName);
      formData.append("email", email);

      // Get clean phone number (digits only)
      const cleanPhone = phone.replace(/\D/g, '');
      formData.append("phone", cleanPhone);

      if (ssn) {
        formData.append("ssn", ssn);
      }

      if (address) {
        formData.append("address", address);
      }

      if (city) {
        formData.append("city", city);
      }

      if (state) {
        formData.append("state", state);
      }

      // Append referredBy if provided
      if (referredBy) {
        formData.append("referredBy", referredBy);
      }

      const res = await axios.post(`/api/auth/onboard/${role}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const { success, message, data } = res.data || {};

      if (!success) {
        ErrorToast(message || "Onboarding failed");
        return thunkAPI.rejectWithValue(message || "Onboarding failed");
      }

      // Store token and user data if provided
      const tokenToStore =
        data?.token ||
        res.data?.token ||
        data?.accessToken ||
        res.data?.accessToken ||
        data?.user?.token ||
        null;

      const userToStore =
        data?.user ||
        (data?._id ? data : null) ||
        res.data?.user ||
        null;

      if (tokenToStore) {
        Cookies.set("token", tokenToStore, { expires: 7 });
      }
      if (userToStore) {
        Cookies.set("user", JSON.stringify(userToStore), { expires: 7 });
      }

      SuccessToast(message || "Profile created successfully");
      return {
        message: message || "Profile created successfully",
        token: tokenToStore,
        user: userToStore,
      };
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || "Onboarding failed";
      ErrorToast(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Helper to fetch latest account status immediately after any document upload
const fetchLatestAccountStatus = async () => {
  try {
    const res = await axios.get("/api/auth/account-status", {
      skipAuthRedirect: true,
    });
    if (res.data?.success && res.data?.data) {
      const data = res.data.data;
      if (data.user) {
        Cookies.set("user", JSON.stringify(data.user), { expires: 7 });
      }
      return data;
    }
  } catch {
    // fallback if status fetch fails
  }
  return null;
};

// Upload Driver Documents (License Information)
export const uploadDriverDocuments = createAsyncThunk(
  "auth/uploadDriverDocuments",
  async ({ driverId, files, expiryDate, licenseNumber, step = 1 }, thunkAPI) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Append files array (front image at index 0, back image at index 1)
      if (files && files.length > 0) {
        files.forEach((file, index) => {
          if (file) {
            formData.append("files", file);
          }
        });
      }
      
      // Append other fields
      formData.append("expiryDate", expiryDate);
      formData.append("licenseNumber", licenseNumber);

      const res = await axios.post(
        `/api/auth/onboard/driver/${driverId}/documents?step=${step}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const { success, message, data } = res.data || {};

      if (!success) {
        ErrorToast(message || "Document upload failed");
        return thunkAPI.rejectWithValue(message || "Document upload failed");
      }

      const latestStatus = await fetchLatestAccountStatus();

      SuccessToast(message || "Documents uploaded successfully");
      return {
        message: message || "Documents uploaded successfully",
        data: data || null,
        user: latestStatus?.user || null,
        accountStatus: latestStatus?.accountStatus || null,
        isOnboarded: latestStatus?.isOnboarded !== undefined ? latestStatus.isOnboarded : true,
        stepToComplete: latestStatus?.stepToComplete || data?.stepToComplete || null,
        approvedDocuments: latestStatus?.approvedDocuments || [],
        pendingDocuments: latestStatus?.pendingDocuments || [],
        rejectedDocuments: latestStatus?.rejectedDocuments || [],
        missingDocuments: latestStatus?.missingDocuments || [],
      };
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || "Document upload failed";
      ErrorToast(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Upload Vehicle Registration Documents (Step 2)
export const uploadVehicleRegistrationDocuments = createAsyncThunk(
  "auth/uploadVehicleRegistrationDocuments",
  async ({ driverId, files, step = 2 }, thunkAPI) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Append files array (front image at index 0, back image at index 1)
      if (files && files.length > 0) {
        files.forEach((file) => {
          if (file) {
            formData.append("files", file);
          }
        });
      }

      const res = await axios.post(
        `/api/auth/onboard/driver/${driverId}/documents?step=${step}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const { success, message, data } = res.data || {};

      if (!success) {
        ErrorToast(message || "Vehicle registration upload failed");
        return thunkAPI.rejectWithValue(message || "Vehicle registration upload failed");
      }

      const latestStatus = await fetchLatestAccountStatus();

      SuccessToast(message || "Vehicle registration uploaded successfully");
      return {
        message: message || "Vehicle registration uploaded successfully",
        data: data || null,
        user: latestStatus?.user || null,
        accountStatus: latestStatus?.accountStatus || null,
        isOnboarded: latestStatus?.isOnboarded !== undefined ? latestStatus.isOnboarded : true,
        stepToComplete: latestStatus?.stepToComplete || data?.stepToComplete || null,
        approvedDocuments: latestStatus?.approvedDocuments || [],
        pendingDocuments: latestStatus?.pendingDocuments || [],
        rejectedDocuments: latestStatus?.rejectedDocuments || [],
        missingDocuments: latestStatus?.missingDocuments || [],
      };
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || "Vehicle registration upload failed";
      ErrorToast(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Upload Insurance Documents (Step 3)
export const uploadInsuranceDocuments = createAsyncThunk(
  "auth/uploadInsuranceDocuments",
  async ({ driverId, files, file, step = 3 }, thunkAPI) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Append files array (front image at index 0, back image at index 1)
      // Keep backward compatibility for old callers that still pass a single file.
      if (Array.isArray(files) && files.length > 0) {
        files.forEach((f) => {
          if (f) {
            formData.append("files", f);
          }
        });
      } else if (file) {
        formData.append("files", file);
      }

      const res = await axios.post(
        `/api/auth/onboard/driver/${driverId}/documents?step=${step}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const { success, message, data } = res.data || {};

      if (!success) {
        ErrorToast(message || "Insurance document upload failed");
        return thunkAPI.rejectWithValue(message || "Insurance document upload failed");
      }

      const latestStatus = await fetchLatestAccountStatus();

      SuccessToast(message || "Insurance documents uploaded successfully");
      return {
        message: message || "Insurance documents uploaded successfully",
        data: data || null,
        user: latestStatus?.user || null,
        accountStatus: latestStatus?.accountStatus || null,
        isOnboarded: latestStatus?.isOnboarded !== undefined ? latestStatus.isOnboarded : true,
        stepToComplete: latestStatus?.stepToComplete || data?.stepToComplete || null,
        approvedDocuments: latestStatus?.approvedDocuments || [],
        pendingDocuments: latestStatus?.pendingDocuments || [],
        rejectedDocuments: latestStatus?.rejectedDocuments || [],
        missingDocuments: latestStatus?.missingDocuments || [],
      };
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || "Insurance document upload failed";
      ErrorToast(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Upload Vehicle Details (Step 4)
export const uploadVehicleDetails = createAsyncThunk(
  "auth/uploadVehicleDetails",
  async ({ driverId, vehicleDetails, step = 4 }, thunkAPI) => {
    try {
      // Prepare form data according to API format
      const formData = new FormData();
      
      // Append all vehicle details fields
      formData.append("make", vehicleDetails.make || "");
      formData.append("model", vehicleDetails.model || "");
      formData.append("yearOfManufacture", vehicleDetails.yearOfManufacture || "");
      formData.append("color", vehicleDetails.color || "");
      formData.append("vehicleIdentificationNumber", vehicleDetails.vehicleIdentificationNumber || "");
      formData.append("licensePlateNumber", vehicleDetails.licensePlateNumber || "");
      formData.append("regionOfRegistration", vehicleDetails.stateRegion || "");
      formData.append("expiryDate", vehicleDetails.registrationExpiryDate || "");
      formData.append("vehicleType", vehicleDetails.vehicleType || "Sedan");

      const res = await axios.post(
        `/api/auth/onboard/driver/${driverId}/documents?step=${step}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const { success, message, data } = res.data || {};

      if (!success) {
        ErrorToast(message || "Vehicle details upload failed");
        return thunkAPI.rejectWithValue(message || "Vehicle details upload failed");
      }

      const latestStatus = await fetchLatestAccountStatus();

      SuccessToast(message || "Vehicle details uploaded successfully");
      return {
        message: message || "Vehicle details uploaded successfully",
        data: data || null,
        user: latestStatus?.user || null,
        accountStatus: latestStatus?.accountStatus || null,
        isOnboarded: latestStatus?.isOnboarded !== undefined ? latestStatus.isOnboarded : true,
        stepToComplete: latestStatus?.stepToComplete || data?.stepToComplete || null,
        approvedDocuments: latestStatus?.approvedDocuments || [],
        pendingDocuments: latestStatus?.pendingDocuments || [],
        rejectedDocuments: latestStatus?.rejectedDocuments || [],
        missingDocuments: latestStatus?.missingDocuments || [],
      };
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || "Vehicle details upload failed";
      ErrorToast(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// ================= SLICE =================
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    resetAuthState(state) {
      state.error = null;
      state.success = null;
      state.isLoading = false;
      state.isAccountStatusLoading = false;
      state.isAccountStatusInitialized = false;
      state.otpSent = false;
      state.phone = null;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.accountStatus = null;
      state.stepToComplete = null;
      state.isOnboarded = false;
      state.rejectedDocuments = [];
      state.approvedDocuments = [];
      state.pendingDocuments = [];
      state.missingDocuments = [];
    },
    setPhone(state, action) {
      state.phone = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    /** Restore user/token from cookies (e.g. after navigation when Redux user is empty). */
    hydrateAuthFromCookies(state) {
      const token = Cookies.get("token");
      if (token) {
        state.token = token;
        state.isAuthenticated = true;
      } else {
        state.token = null;
        state.isAuthenticated = false;
        state.user = null;
      }
      const userRaw = Cookies.get("user");
      if (userRaw && token) {
        try {
          const parsed = JSON.parse(userRaw);
          if (parsed && typeof parsed === "object") {
            state.user = parsed;
            state.isOnboarded = parsed.isOnboarded !== undefined ? Boolean(parsed.isOnboarded) : false;
            state.accountStatus = parsed.accountStatus || state.accountStatus;
          }
        } catch {
          // ignore invalid cookie JSON
        }
      }
    },
    logout(state) {
      Cookies.remove("token");
      Cookies.remove("user");
      // Clear localStorage
      localStorage.removeItem("verifiedPhone");
      // Clear completed steps
      localStorage.removeItem("completedSteps");
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.phone = null;
      state.otpSent = false;
      state.error = null;
      state.success = null;
      state.isLoading = false;
      state.isAccountStatusLoading = false;
      state.isAccountStatusInitialized = false;
      state.accountStatus = null;
      state.stepToComplete = null;
      state.isOnboarded = false;
      state.rejectedDocuments = [];
      state.approvedDocuments = [];
      state.pendingDocuments = [];
      state.missingDocuments = [];
    },
    /** After rejected docs are resubmitted — clear stale reject state so UI shows under review. */
    clearRejectedFlowState(state) {
      state.rejectedDocuments = [];
      const docKeys = [
        "driverLicense",
        "vehicleRegistration",
        "insurance",
        "vehicleDetails",
      ];
      if (state.user) {
        docKeys.forEach((key) => {
          if (state.user[key] && typeof state.user[key] === "object") {
            state.user[key] = {
              ...state.user[key],
              status: "pending",
              rejectReason: null,
              rejectionReason: null,
            };
          }
        });
        try {
          Cookies.set("user", JSON.stringify(state.user));
        } catch {
          // ignore cookie write errors
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Send OTP
      .addCase(sendOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = null;
        state.otpSent = false;
      })
      .addCase(sendOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message;
        state.phone = action.payload.phone;
        state.otpSent = true;
        state.error = null;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.otpSent = false;
      })
      // Verify OTP
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message;
        state.token = action.payload.token || Cookies.get("token") || null;
        state.isAuthenticated = Boolean(state.token || localStorage.getItem("verifiedPhone"));
        if (action.payload.user) {
          state.user = action.payload.user;
        }
        if (action.payload.accountStatus !== null && action.payload.accountStatus !== undefined) {
          state.accountStatus = action.payload.accountStatus;
        }
        state.isOnboarded = action.payload.isOnboarded !== undefined ? Boolean(action.payload.isOnboarded) : false;
        state.stepToComplete = action.payload.stepToComplete || null;
        state.approvedDocuments = action.payload.approvedDocuments || [];
        state.pendingDocuments = action.payload.pendingDocuments || [];
        state.rejectedDocuments = action.payload.rejectedDocuments || [];
        state.missingDocuments = action.payload.missingDocuments || [];
        state.isAccountStatusInitialized = true;
        state.error = null;
        syncCompletedStepsFromUser(state.user, state.isOnboarded);
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Get Account Status
      .addCase(getAccountStatus.pending, (state) => {
        state.isAccountStatusLoading = true;
        state.error = null;
      })
      .addCase(getAccountStatus.fulfilled, (state, action) => {
        state.isAccountStatusLoading = false;
        state.isAccountStatusInitialized = true;
        state.error = null;
        if (action.payload.user) {
          state.user = action.payload.user;
        }
        state.accountStatus = action.payload.accountStatus || (state.user?.accountStatus ?? state.accountStatus);
        state.isOnboarded = action.payload.isOnboarded !== undefined ? Boolean(action.payload.isOnboarded) : false;
        state.stepToComplete = action.payload.stepToComplete;
        state.approvedDocuments = action.payload.approvedDocuments;
        state.pendingDocuments = action.payload.pendingDocuments;
        state.rejectedDocuments = action.payload.rejectedDocuments;
        state.missingDocuments = action.payload.missingDocuments;
        if (Cookies.get("token")) {
          state.isAuthenticated = true;
          state.token = Cookies.get("token");
        }
        syncCompletedStepsFromUser(state.user, state.isOnboarded);
      })
      .addCase(getAccountStatus.rejected, (state, action) => {
        state.isAccountStatusLoading = false;
        state.isAccountStatusInitialized = true;
        state.error = action.payload;
      })
      // Onboard
      .addCase(onboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(onboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message;
        state.token = action.payload.token || Cookies.get("token") || null;
        state.user = action.payload.user || JSON.parse(Cookies.get("user") || "null");
        state.isOnboarded = true;
        state.isAccountStatusInitialized = true;
        state.isAuthenticated = Boolean(state.token || localStorage.getItem("verifiedPhone"));
        state.error = null;
      })
      .addCase(onboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Upload Driver Documents
      .addCase(uploadDriverDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(uploadDriverDocuments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message;
        state.error = null;
        if (action.payload.user) state.user = action.payload.user;
        if (action.payload.accountStatus !== null && action.payload.accountStatus !== undefined) {
          state.accountStatus = action.payload.accountStatus;
        }
        state.rejectedDocuments = action.payload.rejectedDocuments || [];
        state.approvedDocuments = action.payload.approvedDocuments || [];
        state.pendingDocuments = action.payload.pendingDocuments || [];
        state.missingDocuments = action.payload.missingDocuments || [];
        state.stepToComplete = action.payload.stepToComplete || state.stepToComplete;
      })
      .addCase(uploadDriverDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Upload Vehicle Registration Documents
      .addCase(uploadVehicleRegistrationDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(uploadVehicleRegistrationDocuments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message;
        state.error = null;
        if (action.payload.user) state.user = action.payload.user;
        if (action.payload.accountStatus !== null && action.payload.accountStatus !== undefined) {
          state.accountStatus = action.payload.accountStatus;
        }
        state.rejectedDocuments = action.payload.rejectedDocuments || [];
        state.approvedDocuments = action.payload.approvedDocuments || [];
        state.pendingDocuments = action.payload.pendingDocuments || [];
        state.missingDocuments = action.payload.missingDocuments || [];
        state.stepToComplete = action.payload.stepToComplete || state.stepToComplete;
      })
      .addCase(uploadVehicleRegistrationDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Upload Insurance Documents
      .addCase(uploadInsuranceDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(uploadInsuranceDocuments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message;
        state.error = null;
        if (action.payload.user) state.user = action.payload.user;
        if (action.payload.accountStatus !== null && action.payload.accountStatus !== undefined) {
          state.accountStatus = action.payload.accountStatus;
        }
        state.rejectedDocuments = action.payload.rejectedDocuments || [];
        state.approvedDocuments = action.payload.approvedDocuments || [];
        state.pendingDocuments = action.payload.pendingDocuments || [];
        state.missingDocuments = action.payload.missingDocuments || [];
        state.stepToComplete = action.payload.stepToComplete || state.stepToComplete;
      })
      .addCase(uploadInsuranceDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Upload Vehicle Details
      .addCase(uploadVehicleDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(uploadVehicleDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload.message;
        state.error = null;
        if (action.payload.user) state.user = action.payload.user;
        if (action.payload.accountStatus !== null && action.payload.accountStatus !== undefined) {
          state.accountStatus = action.payload.accountStatus;
        }
        state.rejectedDocuments = action.payload.rejectedDocuments || [];
        state.approvedDocuments = action.payload.approvedDocuments || [];
        state.pendingDocuments = action.payload.pendingDocuments || [];
        state.missingDocuments = action.payload.missingDocuments || [];
        state.stepToComplete = action.payload.stepToComplete || state.stepToComplete;
      })
      .addCase(uploadVehicleDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { resetAuthState, setPhone, clearError, logout, hydrateAuthFromCookies, clearRejectedFlowState } =
  authSlice.actions;

export default authSlice.reducer;
