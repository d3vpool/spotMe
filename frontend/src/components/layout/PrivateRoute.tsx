import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getToken } from '@utils/auth';
import { Navbar } from './Navbar';

export const PrivateRoute: React.FC = () => {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
