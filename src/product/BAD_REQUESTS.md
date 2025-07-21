# BadRequestException - Product Module

## GET /product
- Failed to fetch products

## GET /product/packages?storeId=...
- Failed to fetch products

## GET /product/:id?storeId=...
- Product not found
- Failed to fetch product

## POST /product
- Failed to create product
- Field '{key}' cannot be empty

## PATCH /product/:id
- Failed to update product
- Field '{key}' cannot be empty

## DELETE /product/:id
- Product not found
- Failed to remove product
