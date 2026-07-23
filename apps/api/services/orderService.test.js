import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as orderModel from '../models/order.js';
import * as delivery from './deliveryService.js';
import * as partners from './deliveryPartners/index.js';
import { createOrderWithDelivery } from './orderService.js';

// Mock every outside collaborator so the orchestration is exercised in isolation —
// no Postgres, no Google Maps, no courier calls. This is only possible because
// the checkout logic was extracted out of the Express route into a plain function.
vi.mock('../models/order.js');
vi.mock('./deliveryService.js');
vi.mock('./deliveryPartners/index.js');

const baseInput = {
  userId: 1,
  items: [{ basePriceCents: 1200, qty: 2 }],
  customerName: 'Ada',
  customerPhone: '555-0100',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createOrderWithDelivery', () => {
  it('pickup: never geocodes or dispatches, routes in-house', async () => {
    orderModel.createOrder.mockResolvedValue({ order: { id: 'o1' }, lineItems: [], duplicate: false });

    await createOrderWithDelivery({ ...baseInput, deliveryType: 'pickup' });

    expect(delivery.geocodeAddress).not.toHaveBeenCalled();
    expect(partners.dispatchExternalDelivery).not.toHaveBeenCalled();
    expect(orderModel.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryPartner: 'in-house',
        withinRadius: true,
        partnerQuoteCents: null,
      }),
    );
  });

  it('in-radius delivery: stays in-house, no courier quote', async () => {
    delivery.geocodeAddress.mockResolvedValue({ lat: 40.7, lng: -73.9, formattedAddress: '1 Near St' });
    delivery.isWithinOwnDeliveryRadius.mockReturnValue(true);
    orderModel.createOrder.mockResolvedValue({ order: { id: 'o2' }, lineItems: [], duplicate: false });

    await createOrderWithDelivery({ ...baseInput, deliveryType: 'delivery', deliveryAddress: '1 Near St' });

    expect(partners.quoteCheapestPartner).not.toHaveBeenCalled();
    expect(partners.dispatchExternalDelivery).not.toHaveBeenCalled();
    expect(orderModel.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryPartner: 'in-house', withinRadius: true }),
    );
  });

  it('out-of-zone delivery: quotes cheapest courier and auto-dispatches', async () => {
    delivery.geocodeAddress.mockResolvedValue({ lat: 41.0, lng: -74.5, formattedAddress: '5 Far St' });
    delivery.isWithinOwnDeliveryRadius.mockReturnValue(false);
    delivery.milesFromRestaurant.mockReturnValue(8);
    partners.quoteCheapestPartner.mockResolvedValue({ provider: 'uber', quoteId: 'q1', feeCents: 1799, simulated: false });
    orderModel.createOrder.mockResolvedValue({ order: { id: 'o3', subtotal_cents: 2400 }, lineItems: [{ item_name: 'Curry', qty: 2 }], duplicate: false });
    partners.dispatchExternalDelivery.mockResolvedValue({ provider: 'uber', externalDeliveryId: 'd1' });

    const { order } = await createOrderWithDelivery({ ...baseInput, deliveryType: 'delivery', deliveryAddress: '5 Far St' });

    expect(partners.quoteCheapestPartner).toHaveBeenCalledWith(
      expect.objectContaining({ distanceMiles: 8, dropoffAddress: '5 Far St', orderValueCents: 2400 }),
    );
    expect(orderModel.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryPartner: 'uber', withinRadius: false, partnerQuoteCents: 1799 }),
    );
    expect(orderModel.setOrderDelivery).toHaveBeenCalledWith('o3', expect.objectContaining({ externalDeliveryId: 'd1' }));
    // The order object is mutated in place so the HTTP response reflects dispatch.
    expect(order.external_delivery_id).toBe('d1');
    expect(order.delivery_partner).toBe('uber');
  });

  it('replayed (duplicate) out-of-zone order skips dispatch', async () => {
    delivery.geocodeAddress.mockResolvedValue({ lat: 41.0, lng: -74.5, formattedAddress: '5 Far St' });
    delivery.isWithinOwnDeliveryRadius.mockReturnValue(false);
    delivery.milesFromRestaurant.mockReturnValue(8);
    partners.quoteCheapestPartner.mockResolvedValue({ provider: 'uber', quoteId: 'q1', feeCents: 1799, simulated: false });
    orderModel.createOrder.mockResolvedValue({ order: { id: 'o4' }, lineItems: [], duplicate: true });

    await createOrderWithDelivery({ ...baseInput, deliveryType: 'delivery', deliveryAddress: '5 Far St' });

    expect(partners.dispatchExternalDelivery).not.toHaveBeenCalled();
    expect(orderModel.setOrderDelivery).not.toHaveBeenCalled();
  });

  it('geocoding failure falls back to in-house (non-fatal)', async () => {
    delivery.geocodeAddress.mockRejectedValue(new Error('Maps unavailable'));
    orderModel.createOrder.mockResolvedValue({ order: { id: 'o5' }, lineItems: [], duplicate: false });

    await createOrderWithDelivery({ ...baseInput, deliveryType: 'delivery', deliveryAddress: '5 Far St' });

    expect(partners.dispatchExternalDelivery).not.toHaveBeenCalled();
    expect(orderModel.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryPartner: 'in-house', withinRadius: true, partnerQuoteCents: null }),
    );
  });

  it('no Maps key (geocode returns null) routes in-house without quoting', async () => {
    delivery.geocodeAddress.mockResolvedValue(null);
    orderModel.createOrder.mockResolvedValue({ order: { id: 'o6' }, lineItems: [], duplicate: false });

    await createOrderWithDelivery({ ...baseInput, deliveryType: 'delivery', deliveryAddress: '5 Far St' });

    expect(partners.quoteCheapestPartner).not.toHaveBeenCalled();
    expect(orderModel.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryPartner: 'in-house', withinRadius: true }),
    );
  });

  it('courier dispatch failure is swallowed; order still returns', async () => {
    delivery.geocodeAddress.mockResolvedValue({ lat: 41.0, lng: -74.5, formattedAddress: '5 Far St' });
    delivery.isWithinOwnDeliveryRadius.mockReturnValue(false);
    delivery.milesFromRestaurant.mockReturnValue(8);
    partners.quoteCheapestPartner.mockResolvedValue({ provider: 'uber', quoteId: 'q1', feeCents: 1799, simulated: false });
    orderModel.createOrder.mockResolvedValue({ order: { id: 'o7', subtotal_cents: 2400 }, lineItems: [], duplicate: false });
    partners.dispatchExternalDelivery.mockRejectedValue(new Error('courier 500'));

    const { order } = await createOrderWithDelivery({ ...baseInput, deliveryType: 'delivery', deliveryAddress: '5 Far St' });

    expect(order.id).toBe('o7');
    expect(order.external_delivery_id).toBeUndefined();
  });
});
