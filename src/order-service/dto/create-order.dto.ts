import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsPhoneNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @ApiProperty({ description: 'Name of the recipient' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Phone number of the recipient' })
  @IsPhoneNumber(undefined)
  phoneNumber: string;

  @ApiProperty({ description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'State' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Shipping address', type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
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
  @IsOptional()
  @IsString()
  reason?: string;
}
