import {
  PaymentCardInput,
  PricingTierMatrix,
  ProductVariantSelector,
  PromoCouponInput,
  ShoppingCartDrawer,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface CommerceBillingDemosProps {
  componentId: string;
}

export function CommerceBillingDemos({ componentId }: CommerceBillingDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'pricing-tier-matrix':
      return (
        <div className="w-full">
          <PricingTierMatrix
            tiers={[
              {
                id: 'starter',
                name: 'Starter',
                description: 'For indie makers & open-source apps',
                monthlyPrice: 0,
                annualPrice: 0,
                ctaLabel: 'Start Free',
                features: [
                  { text: 'All core optical glass primitives', included: true },
                  { text: 'Alabaster & Obsidian themes', included: true },
                  { text: 'Enterprise Data Grid & CLI Swizzle', included: false },
                ],
              },
              {
                id: 'pro',
                name: 'Studio Pro',
                description: 'Full 97+ component optical kit',
                monthlyPrice: 49,
                annualPrice: 39,
                popular: true,
                badge: 'Most Popular',
                ctaLabel: 'Upgrade to Pro',
                features: [
                  { text: 'All 126 optical-glass components', included: true },
                  { text: '5 official themes + MUI color math', included: true },
                  { text: 'CLI Swizzle & priority security updates', included: true },
                ],
              },
              {
                id: 'enterprise',
                name: 'Enterprise',
                description: 'Custom design-system governance',
                monthlyPrice: 149,
                annualPrice: 119,
                ctaLabel: 'Contact Sales',
                features: [
                  { text: 'Unlimited seats & private theme packs', included: true },
                  { text: 'Custom ESLint & ADR compliance audit', included: true },
                  { text: 'Dedicated SLA & architecture review', included: true },
                ],
              },
            ]}
            onSelectTier={(tier, cycle) =>
              dispatch(
                pushToast({
                  title: `Selected ${tier.name} (${cycle})`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'product-variant-selector':
      return (
        <div className="w-full max-w-xl">
          <ProductVariantSelector
            basePrice={149}
            groups={[
              {
                id: 'finish',
                label: 'Optical Finish',
                options: [
                  { id: 'tangerine', label: 'Solar Amber', kind: 'color', swatchTone: 'primary' },
                  { id: 'crystal', label: 'Ice Crystal', kind: 'color', swatchTone: 'secondary' },
                  { id: 'emerald', label: 'Emerald Tide', kind: 'color', swatchTone: 'emerald', priceDelta: 20 },
                  { id: 'obsidian', label: 'Obsidian Matte', kind: 'color', swatchTone: 'obsidian', available: false },
                ],
              },
              {
                id: 'size',
                label: 'Lens Diameter',
                options: [
                  { id: '42mm', label: '42mm', kind: 'size' },
                  { id: '46mm', label: '46mm', kind: 'size', priceDelta: 15 },
                  { id: '52mm', label: '52mm Pro', kind: 'size', priceDelta: 35 },
                ],
              },
              {
                id: 'material',
                label: 'Bezel Material',
                options: [
                  { id: 'aluminum', label: 'Brushed Alloy', kind: 'material' },
                  { id: 'titanium', label: 'Grade-5 Titanium', kind: 'material', priceDelta: 50 },
                ],
              },
            ]}
          />
        </div>
      );

    case 'shopping-cart-drawer':
      return (
        <div className="w-full max-w-md">
          <ShoppingCartDrawer
            mode="inline"
            discountAmount={20}
            taxRate={0.08}
            defaultItems={[
              { id: 'item-1', name: 'Refractor Studio Pro License', variant: 'Annual · Team', unitPrice: 120, quantity: 1, maxQuantity: 10 },
              { id: 'item-2', name: 'Amethyst Prism Theme Pack', variant: 'CSS + Figma Tokens', unitPrice: 39, quantity: 2, maxQuantity: 5 },
            ]}
            onCheckout={(summary) =>
              dispatch(
                pushToast({
                  title: `Checkout initiated ($${summary.total.toFixed(2)})`,
                  description: `${summary.items.length} line items`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'payment-card-input':
      return (
        <div className="w-full max-w-md">
          <PaymentCardInput
            defaultCardholderName="Alex Rivera"
            onSubmit={(val) =>
              dispatch(
                pushToast({
                  title: `Verified ${val.brand.toUpperCase()} card`,
                  description: `Ending in ${val.cardNumber.slice(-4)}`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'promo-coupon-input':
      return (
        <div className="w-full max-w-md">
          <PromoCouponInput
            onApply={(code) => {
              if (code === 'PRISM20' || code === 'OPTICAL') {
                return { code, label: 'Optical Launch Discount', discountText: '20% off' };
              }
              return `Code "${code}" is not valid. Try PRISM20.`;
            }}
            onRemove={(code) =>
              dispatch(pushToast({ title: `Removed promo ${code}`, tone: 'info' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
