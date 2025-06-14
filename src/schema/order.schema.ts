import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  userId: string;

  @Prop({
    required: true,
    type: [{
      productId: { type: String, required: true },
      description: { type: String, required: true },
      color: { type: String, required: true },
      size: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    }]
  })
  products: {
    productId: string;
    description: string;
    color: string;
    size: string;
    quantity: number;
    price: number;
  }[];

  @Prop({
    required: true,
    type: {
      name: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      postalCode: { type: String, required: true },
    }
  })
  address: {
    name: string;
    phoneNumber: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  @Prop({ required: true, type: Number })
  totalPrice: number;

  @Prop({ 
    required: true, 
    enum: ['PENDING', 'PLACED', 'CANCELED', 'DELIVERED', 'EXCHANGED', 'REFUNDED'], 
    default: 'PENDING',
    type: String
  })
  status: string;

  @Prop({ 
    enum: ['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'], 
    default: 'PENDING',
    type: String
  })
  paymentStatus: string;

  @Prop({ type: String })
  sessionId: string;

  @Prop({ type: String })
  paymentUrl: string;

  @Prop({ type: String })
  refundId: string;

  @Prop({
    type: [{
      productId: { type: String, required: true },
      review: { type: String, required: true },
    }],
    default: []
  })
  reviews: {
    productId: string;
    review: string;
  }[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);