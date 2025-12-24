/**
 * Parts Routes
 * Handles auto parts catalog with vehicle compatibility filtering
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/parts
 * Fetch parts with optional filtering by vehicle and category
 * Query params: 
 *   ?vehicle_id=    - Filter parts compatible with specific vehicle
 *   ?category_id=   - Filter parts by category
 *   ?brand_id=      - Filter by brand
 *   ?search=        - Search by name/description
 *   ?min_price=     - Minimum price filter
 *   ?max_price=     - Maximum price filter
 *   ?in_stock=      - Only show in-stock items (true/false)
 *   ?sort=          - Sort by: price_asc, price_desc, name, rating, newest
 *   ?page=          - Page number (default: 1)
 *   ?limit=         - Items per page (default: 20, max: 100)
 */
router.get('/', async (req, res) => {
    try {
        const {
            vehicle_id,
            category_id,
            brand_id,
            search,
            min_price,
            max_price,
            in_stock,
            sort = 'name',
            page = 1,
            limit = 20
        } = req.query;

        // Validate and sanitize pagination
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const offset = (pageNum - 1) * limitNum;

        // Build the query dynamically
        let queryText = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.description,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.image_url,
        p.avg_rating,
        p.rating_count,
        p.is_featured,
        b.id AS brand_id,
        b.name AS brand_name,
        c.id AS category_id,
        c.name AS category_name
    `;

        // If filtering by vehicle, include compatibility info
        if (vehicle_id) {
            queryText += `,
        pc.position AS fitment_position,
        pc.notes AS fitment_notes,
        pc.is_verified AS fitment_verified
      `;
        }

        queryText += `
      FROM parts p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
    `;

        // Join with compatibility table if filtering by vehicle
        if (vehicle_id) {
            queryText += `
        INNER JOIN part_compatibility pc ON p.id = pc.part_id
      `;
        }

        queryText += ` WHERE p.is_active = TRUE `;

        const params = [];
        let paramIndex = 1;

        // Filter by vehicle compatibility (CRITICAL feature)
        if (vehicle_id) {
            queryText += ` AND pc.vehicle_id = $${paramIndex}`;
            params.push(vehicle_id);
            paramIndex++;
        }

        // Filter by category (including subcategories)
        if (category_id) {
            queryText += `
        AND (
          p.category_id = $${paramIndex}
          OR p.category_id IN (
            SELECT id FROM categories WHERE parent_id = $${paramIndex}
          )
        )
      `;
            params.push(category_id);
            paramIndex++;
        }

        // Filter by brand
        if (brand_id) {
            queryText += ` AND p.brand_id = $${paramIndex}`;
            params.push(brand_id);
            paramIndex++;
        }

        // Search filter (name and description)
        if (search) {
            queryText += `
        AND (
          p.name ILIKE $${paramIndex}
          OR p.description ILIKE $${paramIndex}
          OR p.sku ILIKE $${paramIndex}
          OR $${paramIndex + 1} = ANY(p.oem_numbers)
        )
      `;
            params.push(`%${search}%`);
            params.push(search);
            paramIndex += 2;
        }

        // Price range filters
        if (min_price) {
            queryText += ` AND COALESCE(p.sale_price, p.price) >= $${paramIndex}`;
            params.push(parseFloat(min_price));
            paramIndex++;
        }

        if (max_price) {
            queryText += ` AND COALESCE(p.sale_price, p.price) <= $${paramIndex}`;
            params.push(parseFloat(max_price));
            paramIndex++;
        }

        // In-stock filter
        if (in_stock === 'true') {
            queryText += ` AND p.stock_quantity > 0`;
        }

        // Sorting
        const sortOptions = {
            'price_asc': 'COALESCE(p.sale_price, p.price) ASC',
            'price_desc': 'COALESCE(p.sale_price, p.price) DESC',
            'name': 'p.name ASC',
            'rating': 'p.avg_rating DESC, p.rating_count DESC',
            'newest': 'p.created_at DESC',
            'popular': 'p.sales_count DESC'
        };
        queryText += ` ORDER BY ${sortOptions[sort] || sortOptions['name']}`;

        // Pagination
        queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limitNum, offset);

        // Execute main query
        const result = await db.query(queryText, params);

        // Get total count for pagination (without LIMIT/OFFSET)
        let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM parts p
      LEFT JOIN categories c ON p.category_id = c.id
    `;

        if (vehicle_id) {
            countQuery += ` INNER JOIN part_compatibility pc ON p.id = pc.part_id `;
        }

        countQuery += ` WHERE p.is_active = TRUE `;

        // Rebuild count query params (without pagination params)
        const countParams = params.slice(0, -2);
        let countParamIndex = 1;

        if (vehicle_id) {
            countQuery += ` AND pc.vehicle_id = $${countParamIndex++}`;
        }
        if (category_id) {
            countQuery += ` AND (p.category_id = $${countParamIndex} OR p.category_id IN (SELECT id FROM categories WHERE parent_id = $${countParamIndex}))`;
            countParamIndex++;
        }
        if (brand_id) {
            countQuery += ` AND p.brand_id = $${countParamIndex++}`;
        }
        if (search) {
            countQuery += ` AND (p.name ILIKE $${countParamIndex} OR p.description ILIKE $${countParamIndex} OR p.sku ILIKE $${countParamIndex} OR $${countParamIndex + 1} = ANY(p.oem_numbers))`;
            countParamIndex += 2;
        }
        if (min_price) {
            countQuery += ` AND COALESCE(p.sale_price, p.price) >= $${countParamIndex++}`;
        }
        if (max_price) {
            countQuery += ` AND COALESCE(p.sale_price, p.price) <= $${countParamIndex++}`;
        }
        if (in_stock === 'true') {
            countQuery += ` AND p.stock_quantity > 0`;
        }

        const countResult = await db.query(countQuery, countParams);
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limitNum);

        // Return 404 if no parts found with specific filters
        if (result.rows.length === 0 && (vehicle_id || category_id || search)) {
            return res.status(404).json({
                success: false,
                error: 'No parts found matching the specified criteria',
                filters: { vehicle_id, category_id, brand_id, search }
            });
        }

        res.json({
            success: true,
            count: result.rows.length,
            total: totalItems,
            page: pageNum,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching parts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch parts',
            message: error.message
        });
    }
});

/**
 * GET /api/parts/:id
 * Fetch a single part by ID with full details
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Main part query
        const partQuery = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.description,
        p.price,
        p.sale_price,
        p.cost_price,
        p.stock_quantity,
        p.min_stock_level,
        p.image_url,
        p.weight,
        p.dimensions,
        p.oem_numbers,
        p.specifications,
        p.is_active,
        p.is_featured,
        p.warranty_months,
        p.avg_rating,
        p.rating_count,
        p.views_count,
        p.created_at,
        b.id AS brand_id,
        b.name AS brand_name,
        b.logo_url AS brand_logo,
        c.id AS category_id,
        c.name AS category_name,
        c.path AS category_path
      FROM parts p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;

        const partResult = await db.query(partQuery, [id]);

        if (partResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Part not found'
            });
        }

        const part = partResult.rows[0];

        // Fetch compatible vehicles
        const compatibilityQuery = `
      SELECT 
        v.id AS vehicle_id,
        v.make,
        v.model,
        v.year,
        v.engine_code,
        v.fuel_type,
        pc.position,
        pc.notes,
        pc.is_verified
      FROM part_compatibility pc
      JOIN vehicles v ON pc.vehicle_id = v.id
      WHERE pc.part_id = $1
      ORDER BY v.make, v.model, v.year DESC
    `;

        const compatibilityResult = await db.query(compatibilityQuery, [id]);

        // Fetch additional images
        const imagesQuery = `
      SELECT 
        id,
        image_url,
        alt_text,
        is_primary,
        display_order
      FROM part_images
      WHERE part_id = $1
      ORDER BY is_primary DESC, display_order ASC
    `;

        const imagesResult = await db.query(imagesQuery, [id]);

        // Fetch recent reviews
        const reviewsQuery = `
      SELECT 
        r.id,
        r.rating,
        r.title,
        r.comment,
        r.pros,
        r.cons,
        r.is_verified,
        r.helpful_count,
        r.created_at,
        u.first_name,
        v.make AS vehicle_make,
        v.model AS vehicle_model,
        v.year AS vehicle_year
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.part_id = $1 AND r.is_approved = TRUE
      ORDER BY r.created_at DESC
      LIMIT 5
    `;

        const reviewsResult = await db.query(reviewsQuery, [id]);

        // Increment view count (fire and forget)
        db.query(
            'UPDATE parts SET views_count = views_count + 1 WHERE id = $1',
            [id]
        ).catch(err => console.error('Failed to increment view count:', err));

        res.json({
            success: true,
            data: {
                ...part,
                compatible_vehicles: compatibilityResult.rows,
                images: imagesResult.rows,
                reviews: reviewsResult.rows,
                in_stock: part.stock_quantity > 0,
                low_stock: part.stock_quantity > 0 && part.stock_quantity <= part.min_stock_level
            }
        });
    } catch (error) {
        console.error('Error fetching part details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch part details',
            message: error.message
        });
    }
});

/**
 * GET /api/parts/:id/compatibility
 * Get all compatible vehicles for a specific part
 */
router.get('/:id/compatibility', async (req, res) => {
    try {
        const { id } = req.params;

        // First check if part exists
        const partCheck = await db.query(
            'SELECT id, name FROM parts WHERE id = $1',
            [id]
        );

        if (partCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Part not found'
            });
        }

        const queryText = `
      SELECT 
        pc.id AS compatibility_id,
        v.id AS vehicle_id,
        v.make,
        v.model,
        v.year,
        v.engine_code,
        v.engine_size,
        v.fuel_type,
        pc.position,
        pc.notes,
        pc.is_verified
      FROM part_compatibility pc
      JOIN vehicles v ON pc.vehicle_id = v.id
      WHERE pc.part_id = $1
      ORDER BY v.make, v.model, v.year DESC, v.engine_code
    `;

        const result = await db.query(queryText, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No compatible vehicles found for this part'
            });
        }

        // Group by make for easier display
        const groupedByMake = result.rows.reduce((acc, vehicle) => {
            if (!acc[vehicle.make]) {
                acc[vehicle.make] = [];
            }
            acc[vehicle.make].push(vehicle);
            return acc;
        }, {});

        res.json({
            success: true,
            part: partCheck.rows[0],
            count: result.rows.length,
            data: result.rows,
            grouped: groupedByMake
        });
    } catch (error) {
        console.error('Error fetching part compatibility:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch part compatibility',
            message: error.message
        });
    }
});

/**
 * GET /api/parts/sku/:sku
 * Find part by SKU or OEM number
 */
router.get('/sku/:sku', async (req, res) => {
    try {
        const { sku } = req.params;

        const queryText = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.price,
        p.sale_price,
        p.stock_quantity,
        p.image_url,
        b.name AS brand_name,
        c.name AS category_name
      FROM parts p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
        AND (
          UPPER(p.sku) = UPPER($1)
          OR UPPER($1) = ANY(SELECT UPPER(unnest(p.oem_numbers)))
        )
    `;

        const result = await db.query(queryText, [sku]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No part found with SKU or OEM number: ${sku}`
            });
        }

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching part by SKU:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch part',
            message: error.message
        });
    }
});

module.exports = router;
