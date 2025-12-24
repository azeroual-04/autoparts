/**
 * Brand Routes
 * Handles auto parts brands/manufacturers
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/brands
 * Fetch all brands
 */
router.get('/', async (req, res) => {
    try {
        const queryText = `
      SELECT 
        b.id,
        b.name,
        b.slug,
        b.logo_url,
        b.description,
        b.country,
        b.is_premium,
        COUNT(p.id) AS parts_count
      FROM brands b
      LEFT JOIN parts p ON b.id = p.brand_id AND p.is_active = TRUE
      WHERE b.is_active = TRUE
      GROUP BY b.id
      ORDER BY b.name
    `;

        const result = await db.query(queryText);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching brands:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch brands',
            message: error.message
        });
    }
});

/**
 * GET /api/brands/:id
 * Fetch a single brand with its parts
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const brandQuery = `
      SELECT 
        id,
        name,
        slug,
        logo_url,
        description,
        country,
        website,
        is_premium
      FROM brands
      WHERE id = $1 AND is_active = TRUE
    `;

        const brandResult = await db.query(brandQuery, [id]);

        if (brandResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Brand not found'
            });
        }

        res.json({
            success: true,
            data: brandResult.rows[0]
        });
    } catch (error) {
        console.error('Error fetching brand:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch brand',
            message: error.message
        });
    }
});

module.exports = router;
