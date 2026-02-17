import { useNavigate } from "react-router";
import { ErrorToast } from "../components/global/Toaster";

export const processSignup = (data, navigate) => {
  if (data?.success) {
    navigate("/app/dashboard");
    return;
  }
};

export const processLogin = (data, navigate) => {
  if (data?.success) {
    navigate("/app/dashboard");
    return;
  }
};

export const processError = (error) => {
  if (error?.response?.data?.message) {
    ErrorToast(error?.response?.data?.message);
    return;
  } else {
    ErrorToast("Something went wrong");
  }
};
