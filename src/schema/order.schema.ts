import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export class CartItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price: number;
}

const CartItemSchema = SchemaFactory.createForClass(CartItem);

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURN_REQUESTED = 'return_requested',
  RETURNED = 'returned',
}


export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'cart', required: true })
  cartId: Types.ObjectId;

  // @Prop({ required: true, min: 1 })
  // quantity: number;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ enum: ['REFUND', 'EXCHANGE'] })
  returnType: string;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  // @Prop({ required: true })
  // totalPrice: number;

  @Prop({ required: true })
  shippingAddress: string;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  @Prop({ unique: true, required: true })
  idempotenceKey: string;

  @Prop()
  estimatedDeliveryDate: Date;

  @Prop({ default: false })
  isCancelled: boolean;
}

export const orderSchema = SchemaFactory.createForClass(Order);