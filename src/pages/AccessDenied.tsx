import React from 'react';
import { Link } from 'react-router-dom';

const AccessDenied = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-bold text-forest-green">Access Denied</h1>
      <p className="text-slate-gray">You do not have permission to view this page.</p>
      <Link to="/" className="text-forest-green hover:text-forest-green/80 underline">
        Return Home
      </Link>
    </div>
  </div>
);

export default AccessDenied;
