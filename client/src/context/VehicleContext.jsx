import React, { createContext, useContext, useState, useCallback } from 'react';

// Create the Vehicle Context
const VehicleContext = createContext(null);

// Custom hook to use the vehicle context
export const useVehicle = () => {
    const context = useContext(VehicleContext);
    if (!context) {
        throw new Error('useVehicle must be used within a VehicleProvider');
    }
    return context;
};

// Vehicle Provider Component
export const VehicleProvider = ({ children }) => {
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [vehicleDetails, setVehicleDetails] = useState({
        make: '',
        model: '',
        year: '',
        engine: null
    });

    // Save vehicle selection to state
    const saveVehicle = useCallback((vehicleId, details) => {
        setSelectedVehicle(vehicleId);
        setVehicleDetails(details);
        // Optionally persist to localStorage
        localStorage.setItem('selectedVehicle', JSON.stringify({ id: vehicleId, ...details }));
    }, []);

    // Clear vehicle selection
    const clearVehicle = useCallback(() => {
        setSelectedVehicle(null);
        setVehicleDetails({ make: '', model: '', year: '', engine: null });
        localStorage.removeItem('selectedVehicle');
    }, []);

    // Load saved vehicle from localStorage on mount
    React.useEffect(() => {
        const saved = localStorage.getItem('selectedVehicle');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSelectedVehicle(parsed.id);
                setVehicleDetails({
                    make: parsed.make,
                    model: parsed.model,
                    year: parsed.year,
                    engine: parsed.engine
                });
            } catch (e) {
                console.error('Failed to parse saved vehicle:', e);
            }
        }
    }, []);

    const value = {
        selectedVehicle,
        vehicleDetails,
        saveVehicle,
        clearVehicle,
        hasVehicle: !!selectedVehicle
    };

    return (
        <VehicleContext.Provider value={value}>
            {children}
        </VehicleContext.Provider>
    );
};

export default VehicleContext;
