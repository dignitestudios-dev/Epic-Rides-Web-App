import { useState } from "react";
import axios from "../../axios";
import { ErrorToast } from "../../components/global/Toaster";
import { processError } from "../../lib/utils";
import { useNavigate } from "react-router";

const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const postData = async (
    url,
    isFormData = false,
    formdata = null,
    data = null,
    callback
  ) => {
    try {
      setLoading(true);
      const response = await axios.post(url, isFormData ? formdata : data);
      if (typeof callback === "function") {
        callback(response?.data, navigate);
      }
      return response?.data;
    } catch (error) {
      processError(error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, postData };
};

export { useLogin };
