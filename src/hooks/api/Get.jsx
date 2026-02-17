import { useState, useEffect } from "react";
import axios from "../../axios";
import { ErrorToast } from "../../components/global/Toaster";
import { processError } from "../../lib/utils";

const useUsers = (url, currentPage = 1) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({});

  const getUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${url}?page=${currentPage}`);
      setData(data?.data);
      setPagination(data?.pagination);
    } catch (error) {
      processError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUsers();
  }, [currentPage]);

  return { loading, data, pagination };
};

export { useUsers };
