-- Migration: Add color column to order_items table
-- Date: 2026-01-06
-- Description: Store the selected color for each order item

ALTER TABLE order_items 
ADD COLUMN color VARCHAR(100) DEFAULT NULL AFTER price;
