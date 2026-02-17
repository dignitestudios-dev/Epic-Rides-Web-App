import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "../../axios";
import { ErrorToast } from "../../components/global/Toaster";

const initialState = {
  isLoading: false,
  error: null,
  list: [],
};

export const getVehicleTypes = createAsyncThunk(
  "vehicleTypes/getVehicleTypes",
  async (_, thunkAPI) => {
    try {
      const res = await axios.get("/api/admin/vehicle-types");
      const { success, data, message } = res.data || {};

      if (!success) {
        return thunkAPI.rejectWithValue(message || "Failed to fetch vehicle types");
      }

      const result = data?.result || [];
      const normalized = result
        .filter((item) => item?.rideType)
        .map((item) => {
          const rawModel = String(item.model || "").trim();
          const rawType = String(item.rideType).trim();
          const lowerType = rawType.toLowerCase();
          const uniqueId = item._id || lowerType;
          return {
            id: uniqueId,
            label: rawModel
              ? rawModel.charAt(0).toUpperCase() + rawModel.slice(1)
              : rawType.charAt(0).toUpperCase() + rawType.slice(1),
            value: uniqueId,
            apiValue: lowerType,
          };
        });

      return normalized;
    } catch (e) {
      const errorMessage =
        e.response?.data?.message || e.message || "Failed to fetch vehicle types";
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

const vehicleTypesSlice = createSlice({
  name: "vehicleTypes",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getVehicleTypes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getVehicleTypes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.list = action.payload;
      })
      .addCase(getVehicleTypes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.list = [];
        if (action.payload) {
          ErrorToast(action.payload);
        }
      });
  },
});

export default vehicleTypesSlice.reducer;
