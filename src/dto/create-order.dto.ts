
export class CreateOrderDto{
    userId:string;
    cartIdf:string;
    paymentMethod:string;
    shippingAddress: string;
    estimatedDeliveryDate:string;
    idempotenceKey:string;
}