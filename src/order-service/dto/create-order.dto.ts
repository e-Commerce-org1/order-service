export class CreateOrderDto {
  userId: string;

  address: {
    name: string;
    phoneNumber: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

}


export class PaymentSuccessDto {
  orderId: string;
  sessionId: string;
  status: string;
}

export class AddReviewDto {
  orderId: string;
  userId: string;
  productId: string;
  review: string;
}

export class RefundOrderDto {
  orderId: string;
  userId: string;
  reason?: string;
}