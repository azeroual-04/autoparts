import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { VehicleProvider } from './context/VehicleContext';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';

function App() {
  return (
    <VehicleProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
        </Routes>
      </Router>
    </VehicleProvider>
  );
}

export default App;
