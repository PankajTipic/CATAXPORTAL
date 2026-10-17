// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
// import Navbar from './components/Navbar';
// import Footer from './components/Footer';
// import Home from './pages/Home';
// import About from './pages/About';
// import Products from './pages/Products';
// import Services from './pages/Services';
// import Team from './pages/Team';
// import Contact from './pages/Contact';
// import WhatsAppButton from './components/WhatsAppButton';
// import ScrollToTop from './components/ScrollToTop';

// import { AuthProvider } from './context/AuthContext';
// import ProtectedRoute from './components/ProtectedRoute';
// import AdminLogin from './pages/admin/AdminLogin';
// import AdminDashboard from './pages/admin/AdminDashboard';
// import AdminProfile from './pages/admin/AdminProfile';

// function MainLayout() {
//   const location = useLocation();
//   const isAdminRoute = location.pathname.startsWith('/admin');

//   return (
//     <>
//       <ScrollToTop />
//       {!isAdminRoute && <Navbar />}
//       <main>
//         <Routes>
//           {/* Public Routes */}
//           <Route path="/" element={<Home />} />
//           <Route path="/about" element={<About />} />
//           <Route path="/products" element={<Products />} />
//           <Route path="/services" element={<Services />} />
//           <Route path="/team" element={<Team />} />
//           <Route path="/contact" element={<Contact />} />

//           {/* Admin Routes */}
//           <Route path="/admin/login" element={<AdminLogin />} />
//           <Route
//             path="/admin/dashboard"
//             element={
//               <ProtectedRoute>
//                 <AdminDashboard />
//               </ProtectedRoute>
//             }
//           />
//           <Route
//             path="/admin/profile"
//             element={
//               <ProtectedRoute>
//                 <AdminProfile />
//               </ProtectedRoute>
//             }
//           />
//         </Routes>
//       </main>
//       {!isAdminRoute && <Footer />}
//       {!isAdminRoute && <WhatsAppButton />}
//     </>
//   );
// }

// function App() {
//   return (
//     <AuthProvider>
//       <Router>
//         <MainLayout />
//       </Router>
//     </AuthProvider>
//   );
// }

// export default App;









import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import TaxProfile from "./pages/TaxProfile";
import ConnectITR from "./pages/ConnectITR";
import Dashboard from "./pages/Dashboard";
import DocumentsUpload from "./pages/DocumentsUpload";
import Form16 from "./pages/Form16";
import HireAgent from "./pages/HireAgent";
import CaPortal from "./pages/CaPortal";
import CaLogin from "./pages/CaLogin";
import CustomerPortal from "./pages/CustomerPortal";
import ClientDetails from "./pages/ClientDetails";
import NoticesPage from "./pages/NoticesPage";

function isAuthenticated() {
  return !!localStorage.getItem("auth_token");
}

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        
        {/* Customer Flow Landing — choose Self-File or Hire CA */}
        <Route path="/customer-portal" element={<ProtectedRoute><CustomerPortal /></ProtectedRoute>} />

        {/* Dedicated CA Firm & Staff Login */}
        <Route path="/ca-login" element={<CaLogin />} />

        <Route path="/tax-profile" element={<ProtectedRoute><TaxProfile /></ProtectedRoute>} />
        <Route path="/connect-itr" element={<ProtectedRoute><ConnectITR /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/notices" element={<ProtectedRoute><NoticesPage /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><DocumentsUpload /></ProtectedRoute>} />
        <Route path="/form16" element={<ProtectedRoute><Form16 /></ProtectedRoute>} />
        
        {/* Dedicated Customer Hire a CA & CA Firm Management Console Routes */}
        <Route path="/agent/hire" element={<ProtectedRoute><HireAgent /></ProtectedRoute>} />
        <Route path="/ca-portal" element={<ProtectedRoute><CaPortal /></ProtectedRoute>} />
        <Route path="/ca-portal/payments" element={<ProtectedRoute><CaPortal defaultNav="payments" /></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute><CaPortal defaultNav="payments" /></ProtectedRoute>} />
        <Route path="/ca-portal/client/:id" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to={isAuthenticated() ? "/customer-portal" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
