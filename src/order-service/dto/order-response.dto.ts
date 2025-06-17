import { ApiProperty } from '@nestjs/swagger';

class ProductResponseDto {
  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Product description' })
  description: string;

  @ApiProperty({ description: 'Product color' })
  color: string;

  @ApiProperty({ description: 'Product size' })
  size: string;

  @ApiProperty({ description: 'Quantity ordered' })
  quantity: number;

  @ApiProperty({ description: 'Price per unit' })
  price: number;
}

export class OrderResponseDto {
  @ApiProperty({ description: 'Order ID' })
  _id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ type: [ProductResponseDto], description: 'List of products in the order' })
  products: ProductResponseDto[];

  @ApiProperty({ description: 'Shipping address' })
  address: string;

  @ApiProperty({ description: 'Total price of the order' })
  totalPrice: number;

  @ApiProperty({ description: 'Order status', enum: ['placed', 'cancelled', 'exchanged', 'delivered'] })
  status: 'placed' | 'cancelled' | 'exchanged' | 'delivered';

  @ApiProperty({ description: 'Order creation date' })
  createdAt: Date;
}
