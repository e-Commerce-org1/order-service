export class OrderResponseDto {
  _id: string;
  userId: string;
  products: Array<{
    productId: string;
    description: string;
    color: string;
    size: string;
    quantity: number;
    price: number;
  }>;
  address: string;
  totalPrice: number;
  status: 'placed' | 'cancelled' | 'exchanged' | 'delivered';
  createdAt: Date;
}
