import { ApiProperty } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty({ description: 'Name of the recipient' })
  name: string;

  @ApiProperty({ description: 'Phone number of the recipient' })
  phoneNumber: string;

  @ApiProperty({ description: 'Street address' })
  street: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'State' })
  state: string;

  @ApiProperty({ description: 'Country' })
  country: string;

  @ApiProperty({ description: 'Postal code' })
  postalCode: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'User ID placing the order' })
  userId: string;

  @ApiProperty({ description: 'Shipping address', type: AddressDto })
  address: AddressDto;
}

export class PaymentSuccessDto {
  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'Payment session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Payment status' })
  status: string;
}

export class AddReviewDto {
  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Review text' })
  review: string;
}

export class RefundOrderDto {
  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Reason for refund', required: false })
  reason?: string;
}
