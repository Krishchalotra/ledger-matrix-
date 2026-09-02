import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import Expenses from './pages/Expenses';

import Businesses from './pages/Businesses';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/customers"      element={<Customers />} />
            <Route path="/products"       element={<Products />} />
            <Route path="/invoices"       element={<Invoices />} />
            <Route path="/invoices/new"   element={<CreateInvoice />} />
            <Route path="/expenses"       element={<Expenses />} />
            <Route path="/businesses"     element={<Businesses />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
