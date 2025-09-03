# BadRequestException - Influencer Module

## GET /influencer
- Failed to fetch influencers by store

## GET /influencer/:id
- Influencer not found
- Failed to fetch influencer

## POST /influencer
- Influencer name is required and cannot be empty
- Payment method is required and cannot be empty
- Payment data is required and cannot be empty
- Influencer name must be at least 2 characters long
- Influencer name cannot exceed 100 characters
- Store not found
- Influencer with this name already exists for this store
- Failed to create influencer

## PATCH /influencer/:id
- Influencer name cannot be empty
- Influencer name must be at least 2 characters long
- Influencer name cannot exceed 100 characters
- Payment method cannot be empty
- Payment data cannot be empty
- Influencer with this name already exists for this store
- Failed to update influencer

## DELETE /influencer/:id
- Cannot delete influencer with associated coupons
- Failed to remove influencer
