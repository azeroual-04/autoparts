/**
 * Auto Parts E-commerce API Server
 * Main entry point for the Express.js application
 */

// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Import routes
const vehiclesRouter = require('./routes/vehicles');
const partsRouter = require('./routes/parts');
const categoriesRouter = require('./routes/categories');
const brandsRouter = require('./routes/brands');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`📥 ${req.method} ${req.path}`);
        next();
    });
}

// =============================================================================
// HEALTH CHECK & INFO ROUTES
// =============================================================================

/**
 * GET /
 * API welcome route
 */
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🚗 Auto Parts E-commerce API',
        version: '1.0.0',
        documentation: '/api',
        endpoints: {
            vehicles: '/api/vehicles',
            parts: '/api/parts',
            categories: '/api/categories',
            brands: '/api/brands'
        }
    });
});

/**
 * GET /health
 * Health check endpoint for monitoring
 */
app.get('/health', async (req, res) => {
    try {
        // Check database connectivity
        await db.query('SELECT 1');

        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

/**
 * GET /api
 * API documentation endpoint
 */
app.get('/api', (req, res) => {
    res.json({
        success: true,
        name: 'Auto Parts E-commerce API',
        version: '1.0.0',
        description: 'RESTful API for auto parts e-commerce platform',
        endpoints: [
            {
                group: 'Vehicles',
                routes: [
                    { method: 'GET', path: '/api/vehicles', description: 'List all vehicles with optional filters' },
                    { method: 'GET', path: '/api/vehicles/makes', description: 'Get unique vehicle makes' },
                    { method: 'GET', path: '/api/vehicles/models?make=X', description: 'Get models for a make' },
                    { method: 'GET', path: '/api/vehicles/years?make=X&model=Y', description: 'Get years for make/model' },
                    { method: 'GET', path: '/api/vehicles/engines?make=X&model=Y&year=Z', description: 'Get engine variants' },
                    { method: 'GET', path: '/api/vehicles/:id', description: 'Get vehicle by ID' }
                ]
            },
            {
                group: 'Parts',
                routes: [
                    { method: 'GET', path: '/api/parts', description: 'List parts with filters (vehicle_id, category_id, search, etc.)' },
                    { method: 'GET', path: '/api/parts/:id', description: 'Get part details with compatibility info' },
                    { method: 'GET', path: '/api/parts/:id/compatibility', description: 'Get compatible vehicles for a part' },
                    { method: 'GET', path: '/api/parts/sku/:sku', description: 'Find part by SKU or OEM number' }
                ]
            },
            {
                group: 'Categories',
                routes: [
                    { method: 'GET', path: '/api/categories', description: 'List all categories (add ?tree=true for hierarchy)' },
                    { method: 'GET', path: '/api/categories/:id', description: 'Get category with subcategories' }
                ]
            },
            {
                group: 'Brands',
                routes: [
                    { method: 'GET', path: '/api/brands', description: 'List all brands with parts count' },
                    { method: 'GET', path: '/api/brands/:id', description: 'Get brand details' }
                ]
            }
        ],
        queryParameters: {
            '/api/parts': {
                vehicle_id: 'UUID - Filter parts compatible with vehicle',
                category_id: 'UUID - Filter by category',
                brand_id: 'UUID - Filter by brand',
                search: 'String - Search name, description, SKU',
                min_price: 'Number - Minimum price',
                max_price: 'Number - Maximum price',
                in_stock: 'Boolean - Only in-stock items',
                sort: 'Enum - price_asc, price_desc, name, rating, newest, popular',
                page: 'Integer - Page number (default: 1)',
                limit: 'Integer - Items per page (default: 20, max: 100)'
            }
        }
    });
});

// =============================================================================
// API ROUTES
// =============================================================================

app.use('/api/vehicles', vehiclesRouter);
app.use('/api/parts', partsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/brands', brandsRouter);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Handle 404 - Route not found
app.use(notFound);

// Global error handler
app.use(errorHandler);

// =============================================================================
// SERVER STARTUP
// =============================================================================

const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await db.testConnection();

        if (!dbConnected) {
            console.error('❌ Failed to connect to database. Exiting...');
            process.exit(1);
        }

        // Start the server
        app.listen(PORT, () => {
            console.log('='.repeat(60));
            console.log(`🚗 Auto Parts API Server`);
            console.log('='.repeat(60));
            console.log(`📍 Server running on: http://localhost:${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
            console.log(`💚 Health Check: http://localhost:${PORT}/health`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('='.repeat(60));
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    await db.pool.end();
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
