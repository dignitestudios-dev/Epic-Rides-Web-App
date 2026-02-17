// src/store/slices/auth.slice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../axios";
import Cookies from "js-cookie";
import { ErrorToast, SuccessToast } from "../../components/global/Toaster";

// ================= INITIAL STATE =================
const initialState = {
  isLoading: false,
  error: null,
  success: null,
  phone: null,
  otpSent: false,
  isAuthenticated: false,
  user: null,
  token: null,
  stepToComplete: null,
  isOnboarded: false,
  rejectedDocuments: [],
  approvedDocuments: [],
  pendingDocuments: [],
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
      const res = await axios.post("/api/auth/verify-otp", {
        phone: phone,
        otp: otp,
        role: role,
      });
      const { success, message, data } = res.data || {};

      if (!success) {
        ErrorToast(message || "OTP verification failed");
        return thunkAPI.rejectWithValue(message || "OTP verification failed");
      }

      // Store token and user data if provided
      if (data?.token) {
        Cookies.set("token", data.token, { expires: 7 }); // 7 days expiry
      }
      if (data?.user) {
        Cookies.set("user", JSON.stringify(data.user), { expires: 7 });
      }

      SuccessToast(message || "OTP verified successfully");
      return {
        message: message || "OTP verified successfully",
        token: data?.token || null,
        user: data?.user || null,
        stepToComplete: data?.stepToComplete || null,
        isOnboarded: data?.isOnboarded || false,
        rejectedDocuments: data?.rejectedDocuments || [],
        approvedDocuments: data?.approvedDocuments || [],
        pendingDocuments: data?.pendingDocuments || [],
      };
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || "OTP verification failed";
      ErrorToast(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Onboard API
export const onboard = createAsyncThunk(
  "auth/onboard",
  async ({ role = "driver", file, name, email, phone }, thunkAPI) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Append file if provided (key should be "file" as per API)
      if (file) {
        formData.append("file", file);
      }
      
      // Append other fields
      formData.append("name", name);
      formData.append("email", email);
      
      // Get clean phone number (digits only)
      const cleanPhone = phone.replace(/\D/g, '');
      formData.append("phone", cleanPhone);

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
      if (data?.token) {
        Cookies.set("token", data.token, { expires: 7 });
      }
      if (data?.user) {
        Cookies.set("user", JSON.stringify(data.user), { expires: 7 });
      }

      SuccessToast(message || "Profile created successfully");
      return {
        message: message || "Profile created successfully",
        token: data?.token || null,
        user: data?.user || null,
      };
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || "Onboarding failed";
      ErrorToast(errorMessage);
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

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

      SuccessToast(message || "Documents uploaded successfully");
      return {
        message: message || "Documents uploaded successfully",
        data: data || null,
        stepToComplete: data?.stepToComplete || null,
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

      SuccessToast(message || "Vehicle registration uploaded successfully");
      return {
        message: message || "Vehicle registration uploaded successfully",
        data: data || null,
        stepToComplete: data?.stepToComplete || null,
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
  async ({ driverId, file, step = 3 }, thunkAPI) => {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Append single file
      if (file) {
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

      SuccessToast(message || "Insurance document uploaded successfully");
      return {
        message: message || "Insurance document uploaded successfully",
        data: data || null,
        stepToComplete: data?.stepToComplete || null,
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
      formData.append("registrationNumber", vehicleDetails.registrationNumber || "");
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

      SuccessToast(message || "Vehicle details uploaded successfully");
      return {
        message: message || "Vehicle details uploaded successfully",
        data: data || null,
        stepToComplete: data?.stepToComplete || null,
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
      state.otpSent = false;
      state.phone = null;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.stepToComplete = null;
      state.isOnboarded = false;
    },
    setPhone(state, action) {
      state.phone = action.payload;
    },
    clearError(state) {
      state.error = null;
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
      state.stepToComplete = null;
      state.isOnboarded = false;
      state.rejectedDocuments = [];
      state.approvedDocuments = [];
      state.pendingDocuments = [];
      state.isOnboarded = false;
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
        state.user = action.payload.user || JSON.parse(Cookies.get("user") || "null");
        state.stepToComplete = action.payload.stepToComplete || null;
        state.isOnboarded = action.payload.isOnboarded || false;
        state.rejectedDocuments = action.payload.rejectedDocuments || [];
        state.approvedDocuments = action.payload.approvedDocuments || [];
        state.pendingDocuments = action.payload.pendingDocuments || [];
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
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
        state.isAuthenticated = true;
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
        state.stepToComplete = action.payload.stepToComplete || state.stepToComplete;
        state.error = null;
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
        state.stepToComplete = action.payload.stepToComplete || state.stepToComplete;
        state.error = null;
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
        state.stepToComplete = action.payload.stepToComplete || state.stepToComplete;
        state.error = null;
      })
      .addCase(uploadVehicleDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { resetAuthState, setPhone, clearError, logout } = authSlice.actions;

export default authSlice.reducer;
