// Order service response messages constants

export const RESPONSE_MESSAGES = {
  ORDER_CREATED_SUCCESS: 'Order created successfully',
  ORDER_NOT_FOUND: 'Order not found',
  ORDER_UPDATED_SUCCESS: 'Order status updated successfully',
  ORDER_DELETED_SUCCESS: 'Order deleted successfully',
  ORDER_CANCELLED_SUCCESS: 'Order cancelled successfully',
  ORDER_REFUNDED_SUCCESS: 'Order refunded successfully',
  ORDER_EXCHANGED_SUCCESS: 'Order exchange request submitted',
  REVIEW_ADDED_SUCCESS: 'Review added successfully',

  CART_EMPTY: 'Cart is empty',
  PAYMENT_FAILED: 'Failed to create order due to payment service error',
  REFUND_FAILED: 'Failed to process refund',
  ORDER_CREATION_FAILED: 'Failed to create order',
  PAYMENT_SUCCESS_HANDLING_FAILED: 'Failed to handle payment success',
  ORDER_FETCH_FAILED: 'Failed to get order',
  ORDER_FETCH_ALL_FAILED: 'Failed to get all orders',
  ORDER_CANCEL_FAILED: 'Failed to cancel order',
  ORDER_EXCHANGE_FAILED: 'Failed to exchange order',
  REVIEW_ADD_FAILED: 'Failed to add review',
  ORDER_STATUS_UPDATE_FAILED: 'Failed to update order status',

  INVALID_STATUS: 'Invalid status',
  ORDER_CANNOT_BE_REFUNDED: 'Order cannot be refunded',
  PAYMENT_NOT_COMPLETED: 'Payment not completed, cannot refund',
  SESSION_ID_NOT_FOUND: 'Session ID not found',
  REFUND_PERIOD_EXPIRED: 'Refund period has expired (30 days)',
  EXCHANGE_NOT_ALLOWED: 'Exchange not allowed',
  INVALID_TOKEN: 'Invalid token',
  MISSING_ACCESS_TOKEN: 'Missing access token',
};
