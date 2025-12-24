/**
 * Category Routes
 * Handles hierarchical product categories
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/categories
 * Fetch all categories (flat list or tree structure)
 * Query params: ?tree=true for nested structure
 */
router.get('/', async (req, res) => {
    try {
        const { tree } = req.query;

        const queryText = `
      SELECT 
        id,
        name,
        slug,
        parent_id,
        description,
        image_url,
        level,
        path,
        display_order
      FROM categories
      WHERE is_active = TRUE
      ORDER BY display_order, name
    `;

        const result = await db.query(queryText);

        if (tree === 'true') {
            // Build tree structure
            const categories = result.rows;
            const categoryMap = {};
            const rootCategories = [];

            // First pass: create map
            categories.forEach(cat => {
                categoryMap[cat.id] = { ...cat, children: [] };
            });

            // Second pass: build tree
            categories.forEach(cat => {
                if (cat.parent_id && categoryMap[cat.parent_id]) {
                    categoryMap[cat.parent_id].children.push(categoryMap[cat.id]);
                } else if (!cat.parent_id) {
                    rootCategories.push(categoryMap[cat.id]);
                }
            });

            return res.json({
                success: true,
                count: result.rows.length,
                data: rootCategories
            });
        }

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories',
            message: error.message
        });
    }
});

/**
 * GET /api/categories/:id
 * Fetch a single category with its subcategories and parent
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get the category
        const categoryQuery = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        c.description,
        c.image_url,
        c.level,
        c.path,
        p.name AS parent_name,
        p.slug AS parent_slug
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = $1 AND c.is_active = TRUE
    `;

        const categoryResult = await db.query(categoryQuery, [id]);

        if (categoryResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Get subcategories
        const subcategoriesQuery = `
      SELECT id, name, slug, image_url
      FROM categories
      WHERE parent_id = $1 AND is_active = TRUE
      ORDER BY display_order, name
    `;

        const subcategoriesResult = await db.query(subcategoriesQuery, [id]);

        // Get parts count in this category
        const partsCountQuery = `
      SELECT COUNT(*) as count
      FROM parts
      WHERE category_id = $1 AND is_active = TRUE
    `;

        const partsCountResult = await db.query(partsCountQuery, [id]);

        res.json({
            success: true,
            data: {
                ...categoryResult.rows[0],
                subcategories: subcategoriesResult.rows,
                parts_count: parseInt(partsCountResult.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch category',
            message: error.message
        });
    }
});

module.exports = router;
