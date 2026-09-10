import React from 'react';
import { Navigate, useLocation } from 'react-router';
import Cookies from 'js-cookie';

const ProtectedRoute = ({ children }) => {
  const token = Cookies.get('token');
  const verifiedPhone = localStorage.getItem('verifiedPhone');
  const user = Cookies.get('user');
  const location = useLocation();

  const isAuthorized = Boolean(token || verifiedPhone || user);

  if (!isAuthorized) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
