import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useVehicle } from '../context/VehicleContext';

const CatalogPage = () => {
    const { selectedVehicle, vehicleDetails, hasVehicle, clearVehicle } = useVehicle();
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchParts = async () => {
            try {
                setLoading(true);
                const url = hasVehicle
                    ? `/api/parts?vehicle_id=${selectedVehicle}&limit=20`
                    : '/api/parts?limit=20';

                const response = await fetch(url);
                const data = await response.json();

                if (data.success) {
                    setParts(data.data);
                } else {
                    setError(data.error || 'Failed to load parts');
                }
            } catch (err) {
                setError('Unable to connect to the server');
                console.error('Error fetching parts:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchParts();
    }, [selectedVehicle, hasVehicle]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-white tracking-tight">AutoParts<span className="text-blue-400">Pro</span></span>
                        </Link>

                        {hasVehicle && (
                            <div className="flex items-center gap-4">
                                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                    </svg>
                                    <span className="text-blue-300 font-medium text-sm">
                                        {vehicleDetails.make} {vehicleDetails.model} {vehicleDetails.year}
                                    </span>
                                    <button
                                        onClick={clearVehicle}
                                        className="ml-2 p-1 rounded-lg hover:bg-blue-500/20 transition-colors"
                                        title="Change vehicle"
                                    >
                                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-24 pb-12 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Page Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {hasVehicle ? `Parts for ${vehicleDetails.make} ${vehicleDetails.model}` : 'All Parts'}
                        </h1>
                        <p className="text-slate-400">
                            {hasVehicle
                                ? `Showing compatible parts for your ${vehicleDetails.year} ${vehicleDetails.make} ${vehicleDetails.model}`
                                : 'Browse our complete catalog of quality auto parts'
                            }
                        </p>
                        {!hasVehicle && (
                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Select Your Vehicle
                            </Link>
                        )}
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-4">
                                <svg className="w-12 h-12 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <p className="text-slate-400">Loading parts...</p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
                            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h3 className="text-xl font-bold text-white mb-2">Unable to Load Parts</h3>
                            <p className="text-slate-400 mb-4">{error}</p>
                            <p className="text-slate-500 text-sm">Make sure the backend server is running on port 3000.</p>
                        </div>
                    )}

                    {/* Parts Grid */}
                    {!loading && !error && parts.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {parts.map((part) => (
                                <div
                                    key={part.id}
                                    className="group bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                                >
                                    {/* Part Image */}
                                    <div className="aspect-square bg-slate-700/30 flex items-center justify-center">
                                        {part.image_url ? (
                                            <img
                                                src={part.image_url}
                                                alt={part.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <svg className="w-16 h-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </div>

                                    {/* Part Info */}
                                    <div className="p-4">
                                        {part.brand_name && (
                                            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-1">{part.brand_name}</p>
                                        )}
                                        <h3 className="text-white font-bold mb-2 line-clamp-2 group-hover:text-blue-300 transition-colors">{part.name}</h3>
                                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">{part.description}</p>

                                        {/* Price */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                {part.sale_price ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-bold text-green-400">€{part.sale_price}</span>
                                                        <span className="text-sm text-slate-500 line-through">€{part.price}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xl font-bold text-white">€{part.price}</span>
                                                )}
                                            </div>
                                            <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${part.stock_quantity > 0
                                                    ? 'bg-green-500/10 text-green-400'
                                                    : 'bg-red-500/10 text-red-400'
                                                }`}>
                                                {part.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                                            </div>
                                        </div>

                                        {/* Rating */}
                                        {part.avg_rating && (
                                            <div className="flex items-center gap-1 mt-3">
                                                {[...Array(5)].map((_, i) => (
                                                    <svg
                                                        key={i}
                                                        className={`w-4 h-4 ${i < Math.round(part.avg_rating) ? 'text-amber-400' : 'text-slate-600'}`}
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                ))}
                                                <span className="text-xs text-slate-400 ml-1">({part.rating_count})</span>
                                            </div>
                                        )}

                                        {/* Add to Cart Button */}
                                        <button className="w-full mt-4 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors">
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !error && parts.length === 0 && (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center">
                            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <h3 className="text-xl font-bold text-white mb-2">No Parts Found</h3>
                            <p className="text-slate-400 mb-6">
                                {hasVehicle
                                    ? "We couldn't find any parts compatible with your selected vehicle."
                                    : "No parts are currently available in the catalog."
                                }
                            </p>
                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Home
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CatalogPage;
