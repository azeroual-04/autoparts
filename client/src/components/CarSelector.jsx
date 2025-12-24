import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVehicle } from '../context/VehicleContext';

const CarSelector = () => {
    const navigate = useNavigate();
    const { saveVehicle } = useVehicle();

    // State for dropdown options
    const [makes, setMakes] = useState([]);
    const [models, setModels] = useState([]);
    const [engines, setEngines] = useState([]);

    // State for selected values
    const [selectedMake, setSelectedMake] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedEngine, setSelectedEngine] = useState('');

    // Loading and error states
    const [loading, setLoading] = useState({ makes: true, models: false, engines: false });
    const [error, setError] = useState(null);

    // Fetch all makes on component mount
    useEffect(() => {
        const fetchMakes = async () => {
            try {
                setLoading(prev => ({ ...prev, makes: true }));
                const response = await fetch('/api/vehicles/makes');
                const data = await response.json();

                if (data.success) {
                    setMakes(data.data);
                } else {
                    setError('Failed to load vehicle makes');
                }
            } catch (err) {
                setError('Unable to connect to the server');
                console.error('Error fetching makes:', err);
            } finally {
                setLoading(prev => ({ ...prev, makes: false }));
            }
        };

        fetchMakes();
    }, []);

    // Fetch models when make is selected
    const fetchModels = useCallback(async (make) => {
        if (!make) {
            setModels([]);
            return;
        }

        try {
            setLoading(prev => ({ ...prev, models: true }));
            const response = await fetch(`/api/vehicles/models?make=${encodeURIComponent(make)}`);
            const data = await response.json();

            if (data.success) {
                setModels(data.data);
            } else {
                setModels([]);
            }
        } catch (err) {
            console.error('Error fetching models:', err);
            setModels([]);
        } finally {
            setLoading(prev => ({ ...prev, models: false }));
        }
    }, []);

    // Fetch engines when model is selected
    const fetchEngines = useCallback(async (make, model) => {
        if (!make || !model) {
            setEngines([]);
            return;
        }

        try {
            setLoading(prev => ({ ...prev, engines: true }));
            // First get available years, then get engines for the most recent year
            const yearsResponse = await fetch(
                `/api/vehicles/years?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`
            );
            const yearsData = await yearsResponse.json();

            if (yearsData.success && yearsData.data.length > 0) {
                // Get engines for each year and combine
                const allEngines = [];
                for (const year of yearsData.data) {
                    const enginesResponse = await fetch(
                        `/api/vehicles/engines?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`
                    );
                    const enginesData = await enginesResponse.json();
                    if (enginesData.success) {
                        enginesData.data.forEach(engine => {
                            allEngines.push({
                                ...engine,
                                year,
                                displayName: `${year} - ${engine.engine_code} ${engine.engine_size}L ${engine.fuel_type}`
                            });
                        });
                    }
                }
                setEngines(allEngines);
            } else {
                setEngines([]);
            }
        } catch (err) {
            console.error('Error fetching engines:', err);
            setEngines([]);
        } finally {
            setLoading(prev => ({ ...prev, engines: false }));
        }
    }, []);

    // Handle make selection
    const handleMakeChange = (e) => {
        const make = e.target.value;
        setSelectedMake(make);
        setSelectedModel('');
        setSelectedEngine('');
        setEngines([]);
        fetchModels(make);
    };

    // Handle model selection
    const handleModelChange = (e) => {
        const model = e.target.value;
        setSelectedModel(model);
        setSelectedEngine('');
        fetchEngines(selectedMake, model);
    };

    // Handle engine selection
    const handleEngineChange = (e) => {
        setSelectedEngine(e.target.value);
    };

    // Handle search button click
    const handleSearch = () => {
        const selectedEngineData = engines.find(e => e.id.toString() === selectedEngine);

        if (selectedEngineData) {
            saveVehicle(selectedEngineData.id, {
                make: selectedMake,
                model: selectedModel,
                year: selectedEngineData.year,
                engine: selectedEngineData
            });
            navigate('/catalog');
        }
    };

    const isSearchDisabled = !selectedMake || !selectedModel || !selectedEngine;

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Main Card Container */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                {/* Header */}
                <div className="relative px-8 pt-8 pb-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Find Parts for Your Vehicle</h2>
                            <p className="text-slate-400 text-sm mt-1">Select your vehicle to see compatible parts</p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-8 mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Dropdowns Grid */}
                <div className="relative px-8 pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Make Dropdown */}
                        <div className="relative group">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Make
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedMake}
                                    onChange={handleMakeChange}
                                    disabled={loading.makes}
                                    className="w-full appearance-none px-5 py-4 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white font-medium 
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 
                           hover:border-slate-500 transition-all duration-200 cursor-pointer
                           disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {loading.makes ? 'Loading...' : 'Select Make'}
                                    </option>
                                    {makes.map((make) => (
                                        <option key={make} value={make}>
                                            {make}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                    {loading.makes ? (
                                        <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Model Dropdown */}
                        <div className="relative group">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Model
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedModel}
                                    onChange={handleModelChange}
                                    disabled={!selectedMake || loading.models}
                                    className="w-full appearance-none px-5 py-4 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white font-medium 
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 
                           hover:border-slate-500 transition-all duration-200 cursor-pointer
                           disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {loading.models ? 'Loading...' : !selectedMake ? 'Select Make first' : 'Select Model'}
                                    </option>
                                    {models.map((model) => (
                                        <option key={model} value={model}>
                                            {model}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                    {loading.models ? (
                                        <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Engine/Year Dropdown */}
                        <div className="relative group">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Engine / Year
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedEngine}
                                    onChange={handleEngineChange}
                                    disabled={!selectedModel || loading.engines}
                                    className="w-full appearance-none px-5 py-4 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white font-medium 
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 
                           hover:border-slate-500 transition-all duration-200 cursor-pointer
                           disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {loading.engines ? 'Loading...' : !selectedModel ? 'Select Model first' : 'Select Engine/Year'}
                                    </option>
                                    {engines.map((engine) => (
                                        <option key={engine.id} value={engine.id}>
                                            {engine.displayName}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                    {loading.engines ? (
                                        <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search Button */}
                    <div className="mt-6">
                        <button
                            onClick={handleSearch}
                            disabled={isSearchDisabled}
                            className="w-full relative overflow-hidden group px-8 py-4 rounded-xl font-bold text-lg
                       bg-gradient-to-r from-blue-600 to-blue-500 text-white
                       shadow-lg shadow-blue-500/30
                       hover:shadow-xl hover:shadow-blue-500/40 hover:from-blue-500 hover:to-blue-400
                       focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:from-blue-600 disabled:hover:to-blue-500
                       transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Search Parts
                            </span>
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        </button>
                    </div>

                    {/* Trust Badges */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-slate-400 text-sm">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Verified Fitment</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>50,000+ Parts</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Quality Guaranteed</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CarSelector;
