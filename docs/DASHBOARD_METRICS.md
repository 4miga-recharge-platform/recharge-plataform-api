# Dashboard Metrics Documentation

This document describes all dashboard metrics, when and where they are updated in the application.

## Dashboard Response Structure

The `/store/dashboard` endpoint returns the following structure:

```typescript
{
  period: {
    type: string;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
  };
  summary: {
    totalSales: number;
    totalOrders: number;
    totalCompletedOrders: number;
    totalExpiredOrders: number;
    totalRefundedOrders: number;
    averageTicket: number;
    totalCustomers: number;
    newCustomers: number;
    ordersWithCoupon: number;
    ordersWithoutCoupon: number;
  };
  dailyTrend: Array<{
    date: string;
    totalSales: number;
    totalOrders: number;
  }>;
  salesByProduct: Array<{
    productId: string;
    productName: string;
    imgCardUrl: string;
    totalSales: number;
    totalOrders: number;
    percentage: number;
  }>;
  firstAvailablePeriod: {
    year: number;
    month: number;
    period: string;
  } | null;
}
```

## Summary Metrics

### 1. `totalSales`

**Description:** Sum of all completed sales in the selected period. Refunded orders decrement this value.

**When Updated:**
- **Incremented:** When order status changes to `COMPLETED`
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySales()`
  - **Called from:** `src/bravive/bravive.service.ts` (when payment is approved)
  - **Amount:** `saleAmount = order.price`

- **Decremented:** When order status changes to `REFOUNDED` (if it was previously COMPLETED)
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySales()`
  - **Called from:** `src/bravive/bravive.service.ts` (when payment is refunded)
  - **Amount:** `saleAmount = -order.price`

- **Not Updated:** When order status is `EXPIRED` (saleAmount = 0)

**Storage:** `StoreMonthlySales.totalSales` (Decimal)

**Additional Notes:**
- When an order is refunded, coupon statistics (`timesUsed`, `totalSalesAmount`) are also reverted via `revertCouponUsage()`
- `ordersWithCoupon` and `ordersWithoutCoupon` are decremented when a COMPLETED order becomes REFOUNDED

---

### 2. `totalOrders`

**Description:** Total number of orders created, regardless of status.

**When Updated:**
- **Incremented:** Immediately when an order is created (status = `CREATED`)
  - **Location:** `src/order/order.service.ts` → `create()` → `incrementTotalOrdersOnCreation()`
  - **Updates:**
    - `StoreDailySales.totalOrders`
    - `StoreMonthlySales.totalOrders`
    - `StoreMonthlySalesByProduct.totalOrders`

**Important:** This metric is **ONLY** updated when the order is created. It is **NOT** updated when order status changes.

**Storage:**
- `StoreDailySales.totalOrders` (Int)
- `StoreMonthlySales.totalOrders` (Int)
- `StoreMonthlySalesByProduct.totalOrders` (Int)

---

### 3. `totalCompletedOrders`

**Description:** Number of orders with status `COMPLETED` that have not been refunded.

**When Updated:**
- **Incremented:** When order status changes to `COMPLETED`
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySales()`
  - **Called from:** `src/bravive/bravive.service.ts` (when payment is approved and Bigo recharge succeeds)

- **Decremented:** When a `COMPLETED` order changes to `REFOUNDED`
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySales()`
  - **Called from:** `src/bravive/bravive.service.ts` (when payment is refunded)

**Storage:** `StoreMonthlySales.totalCompletedOrders` (Int)

**Note:** Following market standards, when a COMPLETED order is refunded, `totalCompletedOrders` is decremented to reflect only orders that are actually completed and not refunded.

---

### 4. `totalExpiredOrders`

**Description:** Number of orders with status `EXPIRED`.

**When Updated:**
- **Incremented:** When order status changes to `EXPIRED`
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySales()`
  - **Called from:**
    - `src/bravive/bravive.service.ts` (when payment is rejected/canceled)
    - `src/user/user-cleanup.service.ts` (when unpaid orders expire after 24 hours)

**Storage:** `StoreMonthlySales.totalExpiredOrders` (Int)

**Note:** Once an order is marked as EXPIRED, this counter is not decremented if the order status changes later.

---

### 5. `totalRefundedOrders`

**Description:** Number of orders with status `REFOUNDED`.

**When Updated:**
- **Incremented:** When order status changes to `REFOUNDED`
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySales()`
  - **Called from:** `src/bravive/bravive.service.ts` (when payment is refunded or chargeback occurs)
  - **Behavior:**
    - If order was previously `COMPLETED`: Also decrements `totalCompletedOrders`
    - If order was not previously `COMPLETED`: Only increments `totalRefundedOrders`

**Storage:** `StoreMonthlySales.totalRefundedOrders` (Int)

**Note:** Once an order is marked as REFOUNDED, this counter is not decremented.

---

### 6. `averageTicket`

**Description:** Average value per completed order (totalSales / totalCompletedOrders).

**When Updated:**
- **Calculated:** Dynamically when dashboard is requested
  - **Location:** `src/store/store.service.ts` → `getDashboardData()`
  - **Formula:** `totalSales / totalCompletedOrders` (if `totalCompletedOrders > 0`, otherwise `0`)

**Storage:** Not stored, calculated on-the-fly

---

### 7. `totalCustomers`

**Description:** Total number of users registered in the store up to the end of the selected period.

**When Updated:**
- **Calculated:** Dynamically when dashboard is requested
  - **Location:** `src/store/store.service.ts` → `getDashboardData()`
  - **Query:** `COUNT(*)` of users where `storeId = X AND createdAt <= endDate`

**Storage:** Not stored, calculated on-the-fly

---

### 8. `newCustomers`

**Description:** Number of new customers (users who confirmed their email) in the selected month.

**When Updated:**
- **Incremented:** When a user confirms their email for the first time
  - **Location:** `src/order/order.service.ts` → `updateNewCustomerMetric()`
  - **Called from:** `src/auth/auth.service.ts` → `confirmEmail()`
  - **Updates:** `StoreMonthlySales.newCustomers` for the month the user was created

**Storage:** `StoreMonthlySales.newCustomers` (Int)

**Note:** Only counted once per user (when email is verified).

---

### 9. `ordersWithCoupon`

**Description:** Number of completed orders that used a coupon.

**When Updated:**
- **Incremented:** When order status changes to `COMPLETED` and order has a coupon
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySales()`
  - **Condition:** `orderStatus === 'COMPLETED' && hasCoupon && !wasAlreadyCounted`

- **Decremented:** When a `COMPLETED` order with coupon changes to `REFOUNDED`
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySales()`
  - **Condition:** `orderStatus === 'REFOUNDED' && wasAlreadyCounted && hasCoupon`

**Storage:** `StoreMonthlySales.ordersWithCoupon` (Int)

---

### 10. `ordersWithoutCoupon`

**Description:** Number of completed orders that did not use a coupon.

**When Updated:**
- **Incremented:** When order status changes to `COMPLETED` and order does not have a coupon
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySales()`
  - **Condition:** `orderStatus === 'COMPLETED' && !hasCoupon && !wasAlreadyCounted`

- **Decremented:** When a `COMPLETED` order without coupon changes to `REFOUNDED`
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySales()`
  - **Condition:** `orderStatus === 'REFOUNDED' && wasAlreadyCounted && !hasCoupon`

**Storage:** `StoreMonthlySales.ordersWithoutCoupon` (Int)

---

## Daily Trend

### 11. `dailyTrend`

**Description:** Array of daily sales data for the last 7 days.

**When Updated:**
- **Calculated:** Dynamically when dashboard is requested
  - **Location:** `src/store/store.service.ts` → `getDashboardData()`
  - **Data Source:** `StoreDailySales` table (last 7 days)

**Storage:** `StoreDailySales` table
- `totalSales` (Decimal): Sum of sales for the day
- `totalOrders` (Int): Total orders created on that day

**When `StoreDailySales` is Updated:**
- **`totalOrders`:** Incremented when order is created
  - **Location:** `src/order/order.service.ts` → `incrementTotalOrdersOnCreation()`

- **`totalSales`:** Updated when order status changes to `COMPLETED` or `REFOUNDED`
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreDailySales()`
  - **Incremented:** When status = `COMPLETED` (saleAmount = order.price)
  - **Decremented:** When status = `REFOUNDED` and was previously COMPLETED (saleAmount = -order.price)

---

## Sales By Product

### 12. `salesByProduct`

**Description:** Array of sales data grouped by product for the selected month.

**When Updated:**
- **Calculated:** Dynamically when dashboard is requested
  - **Location:** `src/store/store.service.ts` → `getDashboardData()`
  - **Data Source:** `StoreMonthlySalesByProduct` table for the selected month/year

**Storage:** `StoreMonthlySalesByProduct` table
- `totalSales` (Decimal): Sum of sales for the product in the month
- `totalOrders` (Int): Total orders created for the product in the month

**When `StoreMonthlySalesByProduct` is Updated:**
- **`totalOrders`:** Incremented when order is created
  - **Location:** `src/order/order.service.ts` → `incrementTotalOrdersOnCreation()`

- **`totalSales`:** Updated when order status changes to `COMPLETED` or `REFOUNDED`
  - **Location:** `src/order/order.service.ts` → `updateStoreSalesMetrics()` → `updateStoreMonthlySalesByProduct()`
  - **Incremented:** When status = `COMPLETED` (saleAmount = order.price)
  - **Decremented:** When status = `REFOUNDED` and was previously COMPLETED (saleAmount = -order.price)

---

## Additional Dashboard Fields

### `firstAvailablePeriod`

**Description:** The oldest available period (year/month) with sales data.

**When Updated:**
- **Calculated:** Dynamically when dashboard is requested
  - **Location:** `src/store/store.service.ts` → `getDashboardData()`
  - **Query:** `MIN(year, month)` from `StoreMonthlySales` table

**Storage:** Not stored, calculated on-the-fly

---

## Update Flow Summary

### Order Creation Flow
1. Order is created with status `CREATED`
2. `incrementTotalOrdersOnCreation()` is called
   - Updates `StoreDailySales.totalOrders`
   - Updates `StoreMonthlySales.totalOrders`
   - Updates `StoreMonthlySalesByProduct.totalOrders`

### Order Status Change Flow (COMPLETED/EXPIRED/REFOUNDED)
1. Order status changes (via webhook or cleanup service)
2. `updateStoreSalesMetrics()` is called
   - Updates `StoreDailySales.totalSales`
   - Updates `StoreMonthlySales` (all status-specific counters)
   - Updates `StoreMonthlySalesByProduct.totalSales`
   - Updates coupon-related metrics if applicable

### User Verification Flow
1. User confirms email
2. `updateNewCustomerMetric()` is called
   - Updates `StoreMonthlySales.newCustomers` for the user's creation month

---

## Current Implementation Locations

### Files that update metrics:

1. **`src/order/order.service.ts`**
   - `incrementTotalOrdersOnCreation()` - Called when order is created
   - `updateStoreSalesMetrics()` - Called when order status changes
   - `updateNewCustomerMetric()` - Called when user verifies email
   - `updateStoreDailySales()` - Private method for daily metrics
   - `updateStoreMonthlySales()` - Private method for monthly metrics
   - `updateStoreMonthlySalesByProduct()` - Private method for product metrics

2. **`src/bravive/bravive.service.ts`**
   - Calls `updateStoreSalesMetrics()` when:
     - Payment is approved (order becomes COMPLETED)
     - Payment is rejected/canceled (order becomes EXPIRED)
     - Payment is refunded (order becomes REFOUNDED)
     - Chargeback occurs (order becomes REFOUNDED)

3. **`src/user/user-cleanup.service.ts`**
   - Calls `updateStoreSalesMetrics()` when unpaid orders expire after 24 hours

4. **`src/auth/auth.service.ts`**
   - Calls `updateNewCustomerMetric()` when user confirms email

5. **`src/store/store.service.ts`**
   - `getDashboardData()` - Reads and calculates dashboard metrics (does not update)

---

## Future Implementation Recommendation

### Current State
Metrics updates are currently scattered across multiple services:
- `OrderService` contains most metric update logic
- Other services call `OrderService` methods to update metrics
- This creates coupling and makes it harder to maintain

### Recommended Approach: Centralized Metrics Service

Create a dedicated `MetricsService` module to centralize all dashboard metric updates:

```
src/
  metrics/
    metrics.service.ts          → Centralized metrics update service
    metrics.module.ts           → Metrics module definition
    interfaces/
      order-metrics.interface.ts
      customer-metrics.interface.ts
```

**Benefits:**
- **Single Responsibility:** All metrics logic in one place
- **Easier Maintenance:** Changes to metrics logic only require updating one service
- **Better Testability:** Metrics can be tested independently
- **Scalability:** Easy to add new metrics or migrate to event-driven architecture later
- **Reduced Coupling:** Other services don't need to know about metric implementation details

**Proposed Service Methods:**
```typescript
class MetricsService {
  // Order metrics
  incrementTotalOrders(storeId, orderDate, productId, tx?)
  updateOrderStatus(orderId, newStatus, tx?)

  // Sales metrics
  updateSales(orderId, saleAmount, status, tx?)

  // Customer metrics
  incrementNewCustomer(storeId, userCreatedAt)

  // Coupon metrics (handled internally)
}
```

**Migration Path:**
1. Create `MetricsService` with all current metric update logic
2. Update `OrderService` to use `MetricsService` instead of private methods
3. Update `BraviveService`, `UserCleanupService`, and `AuthService` to call `MetricsService` directly
4. Remove metric update methods from `OrderService`

**Future Enhancement: Event-Driven Architecture**
Once centralized, the service can be evolved to use an event-driven approach:
- Services emit events (OrderCreated, OrderCompleted, OrderRefunded, etc.)
- `MetricsService` listens to events and updates metrics asynchronously
- Allows for better scalability and separation of concerns

---

## Notes

- All metric updates should be done within database transactions when possible to ensure data consistency
- Metrics are updated synchronously to ensure real-time accuracy in the dashboard
- The `totalOrders` metric is the only one updated at order creation; all other metrics are updated when order status changes
- Following market standards, `totalCompletedOrders` is decremented when a COMPLETED order becomes REFOUNDED

