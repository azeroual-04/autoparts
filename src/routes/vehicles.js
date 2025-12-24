/**
 * Vehicle Routes
 * Handles vehicle make, model, and year data for the vehicle selector
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/vehicles
 * Fetch all vehicles with optional filtering
 * Query params: ?make=&model=&year=
 */
router.get('/', async (req, res) => {
    try {
        const { make, model, year } = req.query;

        let queryText = `
      SELECT 
        id,
        make,
        model,
        year,
        engine_code,
        engine_size,
        fuel_type,
        body_type
      FROM vehicles
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;

        // Apply filters
        if (make) {
            queryText += ` AND LOWER(make) = LOWER($${paramIndex})`;
            params.push(make);
            paramIndex++;
        }

        if (model) {
            queryText += ` AND LOWER(model) = LOWER($${paramIndex})`;
            params.push(model);
            paramIndex++;
        }

        if (year) {
            queryText += ` AND year = $${paramIndex}`;
            params.push(parseInt(year));
            paramIndex++;
        }

        queryText += ' ORDER BY make, model, year DESC, engine_code';

        const result = await db.query(queryText, params);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicles',
            message: error.message
        });
    }
});

/**
 * GET /api/vehicles/makes
 * Fetch all unique vehicle makes for the first selector dropdown
 */
router.get('/makes', async (req, res) => {
    try {
        const queryText = `
      SELECT DISTINCT make
      FROM vehicles
      ORDER BY make
    `;

        const result = await db.query(queryText);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows.map(row => row.make)
        });
    } catch (error) {
        console.error('Error fetching makes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicle makes',
            message: error.message
        });
    }
});

/**
 * GET /api/vehicles/models?make=Renault
 * Fetch all models for a specific make
 */
router.get('/models', async (req, res) => {
    try {
        const { make } = req.query;

        if (!make) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: make'
            });
        }

        const queryText = `
      SELECT DISTINCT model
      FROM vehicles
      WHERE LOWER(make) = LOWER($1)
      ORDER BY model
    `;

        const result = await db.query(queryText, [make]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No models found for make: ${make}`
            });
        }

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows.map(row => row.model)
        });
    } catch (error) {
        console.error('Error fetching models:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicle models',
            message: error.message
        });
    }
});

/**
 * GET /api/vehicles/years?make=Renault&model=Clio
 * Fetch all years for a specific make and model
 */
router.get('/years', async (req, res) => {
    try {
        const { make, model } = req.query;

        if (!make || !model) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: make and model'
            });
        }

        const queryText = `
      SELECT DISTINCT year
      FROM vehicles
      WHERE LOWER(make) = LOWER($1)
        AND LOWER(model) = LOWER($2)
      ORDER BY year DESC
    `;

        const result = await db.query(queryText, [make, model]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No years found for ${make} ${model}`
            });
        }

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows.map(row => row.year)
        });
    } catch (error) {
        console.error('Error fetching years:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicle years',
            message: error.message
        });
    }
});

/**
 * GET /api/vehicles/engines?make=Renault&model=Clio&year=2020
 * Fetch all engine variants for a specific make, model, and year
 */
router.get('/engines', async (req, res) => {
    try {
        const { make, model, year } = req.query;

        if (!make || !model || !year) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: make, model, and year'
            });
        }

        const queryText = `
      SELECT 
        id,
        engine_code,
        engine_size,
        fuel_type
      FROM vehicles
      WHERE LOWER(make) = LOWER($1)
        AND LOWER(model) = LOWER($2)
        AND year = $3
      ORDER BY engine_code
    `;

        const result = await db.query(queryText, [make, model, parseInt(year)]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No engines found for ${make} ${model} ${year}`
            });
        }

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching engines:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicle engines',
            message: error.message
        });
    }
});

/**
 * GET /api/vehicles/:id
 * Fetch a single vehicle by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const queryText = `
      SELECT 
        id,
        make,
        model,
        year,
        engine_code,
        engine_size,
        fuel_type,
        body_type,
        doors,
        created_at
      FROM vehicles
      WHERE id = $1
    `;

        const result = await db.query(queryText, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicle',
            message: error.message
        });
    }
});

module.exports = router;
