import { toast, Toaster } from "react-hot-toast";
import { NavLink } from "react-router";

export const ToasterContainer = () => {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        style: {
          background: "#333",
          color: "#fff",
        },
      }}
    />
  );
};

// Global toast ID (ensures only one toast is shown at a time)
let toastId = null;

export const SuccessToast = (message) => {
  if (toastId) toast.dismiss(toastId); // Dismiss previous toast
  toastId = toast.success(message, {
    duration: 3000,
    style: {
      background: "green",
      color: "#fff",
    },
    iconTheme: {
      primary: "white",
      secondary: "green",
    },
  });
};

export const ErrorToast = (message) => {
  if (toastId) toast.dismiss(toastId); // Dismiss previous toast
  toastId = toast.error(message, {
    duration: 3000,
    style: {
      background: "#ff4d4d",
      color: "#fff",
    },
    iconTheme: {
      primary: "white",
      secondary: "#ff4d4d",
    },
  });
};

export const WarningToast = (message) => {
  if (toastId) toast.dismiss(toastId); // Dismiss previous toast
  toastId = toast(message, {
    icon: "⚠️",
    duration: 3000,
    style: {
      background: "#fff",
      color: "#1c1c1c",
    },
  });
};

export const NotificationToast = ({ title, message, route }) => {
  if (toastId) toast.dismiss(toastId); // Dismiss previous toast
  toastId = toast.custom(
    (t) => (
      <NavLink
        to={route}
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-md w-full bg-white shadow-lg rounded-lg flex ring-1 ring-black ring-opacity-5 p-4`}
      >
        <div className="flex-shrink-0 pt-0.5">
          <img
            className="h-10 w-10 rounded-md"
            src="/logo.png"
            alt="User Avatar"
          />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="mt-1 text-sm text-gray-500">{message}</p>
        </div>
      </NavLink>
    ),
    {
      position: "bottom-right",
    }
  );
};
