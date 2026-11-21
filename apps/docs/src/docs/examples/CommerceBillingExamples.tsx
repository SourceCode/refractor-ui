import { useMemo, useState, type ReactNode } from 'react';
import {
  Aperture,
  Bookmark,
  Box,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Headphones,
  Heart,
  Layers,
  Lock,
  Monitor,
  PackageCheck,
  RotateCcw,
  Send,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Tag,
  Truck,
} from 'lucide-react';
import {
  Accordion,
  AlertBanner,
  BadgeStatus,
  Breadcrumbs,
  CascadingSelect,
  ComboSplitButton,
  CreatableCombobox,
  CurrencyInput,
  EmptyState,
  FileDropzone,
  HistogramRangeSlider,
  InternationalPhoneInput,
  MeasurementUnitInput,
  NumericStepper,
  PaymentCardInput,
  PricingTierMatrix,
  PrimaryButton,
  PrismCard,
  Product360Viewer,
  ProductVariantSelector,
  PromoCouponInput,
  RatingControl,
  RichSelectionCards,
  RichTextEditor,
  SearchWithSuggestions,
  SecondaryButton,
  ShoppingCartDrawer,
  StatefulAsyncButton,
  Stepper,
  TagChip,
  TextInput,
  type AccordionItem,
  type AppliedCoupon,
  type BillingCycle,
  type BreadcrumbCrumb,
  type CartCheckoutSummary,
  type CartLineItem,
  type CascadeOptionNode,
  type ComboSplitAction,
  type CreatableOption,
  type CurrencyInputValue,
  type HistogramBin,
  type HistogramRangeValue,
  type MeasurementUnitOption,
  type MeasurementValue,
  type PaymentCardValue,
  type PhoneInputValue,
  type PricingTier,
  type Product360Frame,
  type RichSelectionCardOption,
  type SearchSuggestion,
  type StepDefinition,
  type UploadedFileSummary,
  type VariantGroup,
} from '@refractor-ui/core';
import type { ExampleScreenSpec } from './types';

/* ============================================================================
 * Screen 1: Browse Products & Faceted Storefront
 * ============================================================================ */

type CatalogCategory = 'All' | 'Lenses' | 'Lighting' | 'Audio' | 'Displays' | 'Mounts';

interface StoreProduct {
  id: string;
  name: string;
  category: Exclude<CatalogCategory, 'All'>;
  price: number;
  rating: number;
  stockLabel: string;
  stockTone: 'online' | 'warning';
  variantSummary: string;
  description: string;
  iconKey: 'aperture' | 'sun' | 'headphones' | 'monitor' | 'layers' | 'sparkles';
}

const CATALOG_CATEGORIES: ReadonlyArray<CatalogCategory> = [
  'All',
  'Lenses',
  'Lighting',
  'Audio',
  'Displays',
  'Mounts',
];

const CATALOG_PRODUCTS: ReadonlyArray<StoreProduct> = [
  {
    id: 'prism-50mm',
    name: 'Prism 50mm f/1.2 Optical Lens',
    category: 'Lenses',
    price: 320,
    rating: 5,
    stockLabel: 'In Stock',
    stockTone: 'online',
    variantSummary: 'E-Mount · Solar Amber',
    description: 'Aspheric low-dispersion prime with tactile aperture clicks and anti-reflective coating.',
    iconKey: 'aperture',
  },
  {
    id: 'lumina-key',
    name: 'Lumina Studio Key Light Pro',
    category: 'Lighting',
    price: 185,
    rating: 5,
    stockLabel: 'In Stock',
    stockTone: 'online',
    variantSummary: 'Bi-Color · 2700K–6500K',
    description: 'CRI 98+ frosted-glass LED diffusion panel with whisper-quiet passive thermal chassis.',
    iconKey: 'sun',
  },
  {
    id: 'cryodac-amp',
    name: 'CryoDAC Studio Reference Amp',
    category: 'Audio',
    price: 245,
    rating: 4,
    stockLabel: 'In Stock',
    stockTone: 'online',
    variantSummary: '32-bit · Balanced XLR',
    description: 'Dual-mono desktop headphone amplifier housed in bead-blasted alabaster aluminum.',
    iconKey: 'headphones',
  },
  {
    id: 'alabaster-bar',
    name: 'Alabaster 4K Glass Monitor Bar',
    category: 'Displays',
    price: 140,
    rating: 4,
    stockLabel: 'Low Stock',
    stockTone: 'warning',
    variantSummary: 'Asymmetric Beam · USB-C',
    description: 'Glare-free optical task bar with wireless rotary puck for calibrated desk illumination.',
    iconKey: 'monitor',
  },
  {
    id: 'maglock-mount',
    name: 'Titanium MagLock Gimbal Mount',
    category: 'Mounts',
    price: 95,
    rating: 5,
    stockLabel: 'In Stock',
    stockTone: 'online',
    variantSummary: 'Grade-5 Ti · Arca Rail',
    description: 'Quick-release magnetic stabilizer plate rated for 4.5 kg cinema rigs with zero flex.',
    iconKey: 'layers',
  },
  {
    id: 'dichroic-nd',
    name: 'Dichroic Cinema ND Filter Kit',
    category: 'Lenses',
    price: 430,
    rating: 5,
    stockLabel: 'Low Stock',
    stockTone: 'warning',
    variantSummary: '82mm · 3-Stop to 10-Stop',
    description: 'Color-neutral quartz ND trio with iridescent rim indexing and hard anodized case.',
    iconKey: 'sparkles',
  },
];

const CATALOG_PRICE_BINS: HistogramBin[] = [
  { min: 0, max: 75, count: 3 },
  { min: 75, max: 150, count: 14 },
  { min: 150, max: 225, count: 22 },
  { min: 225, max: 300, count: 18 },
  { min: 300, max: 375, count: 12 },
  { min: 375, max: 450, count: 9 },
  { min: 450, max: 500, count: 4 },
];

const CATALOG_SUGGESTIONS: SearchSuggestion[] = CATALOG_PRODUCTS.map((item) => ({
  id: item.id,
  label: item.name,
  category: item.category,
}));

const INITIAL_CART_ITEMS: ReadonlyArray<CartLineItem> = [
  {
    id: 'lumina-key',
    name: 'Lumina Studio Key Light Pro',
    variant: 'Bi-Color · 2700K–6500K',
    unitPrice: 185,
    quantity: 1,
    maxQuantity: 8,
  },
];

function renderProductIcon(iconKey: StoreProduct['iconKey']): ReactNode {
  switch (iconKey) {
    case 'aperture':
      return <Aperture className="w-6 h-6" aria-hidden="true" />;
    case 'sun':
      return <Sun className="w-6 h-6" aria-hidden="true" />;
    case 'headphones':
      return <Headphones className="w-6 h-6" aria-hidden="true" />;
    case 'monitor':
      return <Monitor className="w-6 h-6" aria-hidden="true" />;
    case 'layers':
      return <Layers className="w-6 h-6" aria-hidden="true" />;
    case 'sparkles':
      return <Sparkles className="w-6 h-6" aria-hidden="true" />;
  }
}

function BrowseProductsCatalogScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategory>('All');
  const [priceRange, setPriceRange] = useState<HistogramRangeValue>({ min: 50, max: 450 });
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const product of CATALOG_PRODUCTS) {
      initial[product.id] = product.rating;
    }
    return initial;
  });
  const [cartItems, setCartItems] = useState<CartLineItem[]>(() =>
    INITIAL_CART_ITEMS.map((item) => ({ ...item }))
  );
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return CATALOG_PRODUCTS.filter((product) => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesPrice = product.price >= priceRange.min && product.price <= priceRange.max;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesPrice && matchesQuery;
    });
  }, [priceRange.max, priceRange.min, searchQuery, selectedCategory]);

  const totalCartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartItems]
  );

  const bundleDiscount = cartSubtotal >= 300 ? 25 : 0;

  const isFiltered =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'All' ||
    priceRange.min > 0 ||
    priceRange.max < 500;

  const handleAddToCart = (product: StoreProduct) => {
    setCheckoutBanner(null);
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.maxQuantity ?? 10, item.quantity + 1) }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          variant: product.variantSummary,
          unitPrice: product.price,
          quantity: 1,
          maxQuantity: 10,
        },
      ];
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setPriceRange({ min: 0, max: 500 });
  };

  const handleCheckout = (summary: CartCheckoutSummary) => {
    setCartOpen(false);
    setCheckoutBanner(
      `Order #RF-4821 queued for $${summary.total.toFixed(2)} (${summary.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      )} items reserved).`
    );
  };

  return (
    <div className="@container w-full min-w-0 space-y-5">
      {/* Storefront Header Bar */}
      <header className="prism-slab p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="prism-emerald px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight">
              Refractor Optics Store
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Auto $25 bundle savings over $300
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Studio Optical Hardware Catalog
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <BadgeStatus
            label={totalCartCount === 1 ? 'Item in Bag' : 'Items in Bag'}
            count={totalCartCount}
            tone="counter"
          />
          <PrimaryButton
            size="sm"
            leadingIcon={<ShoppingBag className="w-4 h-4" aria-hidden="true" />}
            onClick={() => setCartOpen(true)}
          >
            View Cart ({totalCartCount})
          </PrimaryButton>
        </div>
      </header>

      {checkoutBanner ? (
        <AlertBanner
          severity="success"
          title="Storefront Checkout Initiated"
          message={checkoutBanner}
          onDismiss={() => setCheckoutBanner(null)}
        />
      ) : null}

      {/* Faceted Search, Category Chips & Price Distribution Deck */}
      <section aria-label="Catalog filters" className="prism-slab p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 @3xl:grid-cols-[1.15fr_0.85fr] gap-4 items-start">
          <div className="min-w-0 space-y-3">
            <SearchWithSuggestions
              value={searchQuery}
              onChange={setSearchQuery}
              suggestions={CATALOG_SUGGESTIONS}
              onSelectSuggestion={(item) => setSearchQuery(item.label)}
              onQuickAdd={(query) => setSearchQuery(query.trim())}
              placeholder="Search lenses, lighting, DACs, mounts..."
              ariaLabel="Search studio hardware catalog"
            />

            <div className="flex flex-wrap items-center gap-2">
              {CATALOG_CATEGORIES.map((category) => (
                <TagChip
                  key={category}
                  label={category}
                  selected={selectedCategory === category}
                  onSelect={() => setSelectedCategory(category)}
                />
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <HistogramRangeSlider
              label="Price Distribution ($)"
              bins={CATALOG_PRICE_BINS}
              value={priceRange}
              onChange={setPriceRange}
              step={25}
              formatValue={(val) => `$${val}`}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-300/40 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
            Showing {filteredProducts.length} of {CATALOG_PRODUCTS.length} optical products · Range{' '}
            <strong className="text-slate-900 dark:text-white">
              ${priceRange.min}–${priceRange.max}
            </strong>
          </span>
          {isFiltered ? (
            <SecondaryButton
              size="sm"
              leadingIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={handleResetFilters}
            >
              Reset Filters
            </SecondaryButton>
          ) : null}
        </div>
      </section>

      {/* Responsive Optical Product Grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title="No optical gear matches your filters"
          description="Try widening the price histogram bounds, switching categories, or clearing the keyword query."
          actionLabel="Reset All Filters"
          onAction={handleResetFilters}
          icon={<ShoppingBag className="w-6 h-6" aria-hidden="true" />}
        />
      ) : (
        <div className="grid grid-cols-1 @2xl:grid-cols-2 @4xl:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const qtyInCart =
              cartItems.find((item) => item.id === product.id)?.quantity ?? 0;
            const activeRating = ratings[product.id] ?? product.rating;

            return (
              <PrismCard
                key={product.id}
                kicker={`${product.category} · ${product.variantSummary}`}
                title={product.name}
                className="min-w-0"
                footer={
                  <div className="w-full flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-lg font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
                        ${product.price}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {qtyInCart > 0 ? `${qtyInCart} in bag` : 'Free courier shipping'}
                      </div>
                    </div>
                    <PrimaryButton
                      size="sm"
                      leadingIcon={<ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />}
                      onClick={() => handleAddToCart(product)}
                    >
                      {qtyInCart > 0 ? `Add Another (${qtyInCart})` : 'Add to Cart'}
                    </PrimaryButton>
                  </div>
                }
              >
                <div className="space-y-3.5">
                  <div className="prism-well rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div
                      className="prism-crystal w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ color: 'var(--prism-primary-main)' }}
                    >
                      {renderProductIcon(product.iconKey)}
                    </div>
                    <BadgeStatus label={product.stockLabel} tone={product.stockTone} />
                  </div>

                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {product.description}
                  </p>

                  <div className="overflow-x-auto max-w-full">
                    <RatingControl
                      label="Customer Rating"
                      value={activeRating}
                      onChange={(nextScore) =>
                        setRatings((prev) => ({ ...prev, [product.id]: nextScore }))
                      }
                    />
                  </div>
                </div>
              </PrismCard>
            );
          })}
        </div>
      )}

      {/* Slide-Over Shopping Cart Drawer */}
      <ShoppingCartDrawer
        mode="drawer"
        title="Studio Hardware Bag"
        open={cartOpen}
        onOpenChange={setCartOpen}
        items={cartItems}
        onItemsChange={setCartItems}
        discountAmount={bundleDiscount}
        taxRate={0.0825}
        onCheckout={handleCheckout}
      />
    </div>
  );
}

/* ============================================================================
 * Screen 2: Product Detail Page (PDP) with 360° Orbit & Swatches
 * ============================================================================ */

const PDP_BREADCRUMBS: BreadcrumbCrumb[] = [
  { id: 'store', label: 'Refractor Store' },
  { id: 'optics', label: 'Optical Gear' },
  { id: 'cinema', label: 'Flagship Lenses' },
  { id: 'prism-x1', label: 'Prism X1 Cinema Monolith' },
];

const PDP_360_FRAMES: ReadonlyArray<Product360Frame> = [
  { angle: 0, label: 'Front Optical Element' },
  { angle: 90, label: 'Knurled Aperture Ring' },
  { angle: 180, label: 'Precision Mount Flange' },
  { angle: 270, label: 'Focus Throw Scale' },
];

interface ViewpointPreset {
  id: string;
  label: string;
  angle: number;
}

const PDP_VIEWPOINTS: ReadonlyArray<ViewpointPreset> = [
  { id: 'vp-front', label: 'Front 0°', angle: 0 },
  { id: 'vp-side', label: 'Aperture 90°', angle: 90 },
  { id: 'vp-rear', label: 'Flange 180°', angle: 180 },
  { id: 'vp-scale', label: 'Scale 270°', angle: 270 },
];

const PDP_BASE_PRICE = 649;

const PDP_VARIANT_GROUPS: ReadonlyArray<VariantGroup> = [
  {
    id: 'finish',
    label: 'Optical Finish',
    options: [
      { id: 'amber', label: 'Solar Amber', kind: 'color', swatchTone: 'primary', priceDelta: 0 },
      { id: 'crystal', label: 'Ice Crystal', kind: 'color', swatchTone: 'secondary', priceDelta: 30 },
      { id: 'emerald', label: 'Emerald Tide', kind: 'color', swatchTone: 'emerald', priceDelta: 50 },
      {
        id: 'obsidian',
        label: 'Obsidian Matte',
        kind: 'color',
        swatchTone: 'obsidian',
        available: false,
      },
    ],
  },
  {
    id: 'storage',
    label: 'Calibration LUT Memory',
    options: [
      { id: '256gb', label: '256GB', kind: 'size', priceDelta: 0 },
      { id: '512gb', label: '512GB', kind: 'size', priceDelta: 120 },
      { id: '1tb', label: '1TB Pro', kind: 'size', priceDelta: 260 },
    ],
  },
  {
    id: 'mount',
    label: 'Bayonet Mount',
    options: [
      { id: 'e-mount', label: 'Sony E-Mount', kind: 'material', priceDelta: 0 },
      { id: 'rf-mount', label: 'Canon RF', kind: 'material', priceDelta: 40 },
      { id: 'pl-cinema', label: 'ARRI PL Cinema', kind: 'material', priceDelta: 140 },
    ],
  },
];

const PDP_ACCORDION_ITEMS: ReadonlyArray<AccordionItem> = [
  {
    id: 'specs',
    title: 'Optical & Mechanical Specifications',
    body: '14 elements in 11 groups including 3 extra-low dispersion fluorite elements and 2 double-sided aspheric surfaces. Minimum focus distance 0.38m, 11-blade circular iris, weather-sealed magnesium alloy barrel weighing 685g.',
  },
  {
    id: 'shipping',
    title: 'Express Shipping & 30-Day Studio Trial',
    body: 'Complimentary insured next-business-day air courier across North America, EU, and Japan. Includes a prepaid return label for a no-questions-asked 30-day studio evaluation window.',
  },
  {
    id: 'box',
    title: 'In the Box & Calibration Certificate',
    body: 'Prism X1 Cinema Monolith lens, magnetic anodized front and rear caps, machined petal hood, laser-verified MTF bench calibration certificate, and shock-absorbing hard flight case.',
  },
];

function computePdpSelectionDetails(selection: Readonly<Record<string, string>>): {
  unitPrice: number;
  finishLabel: string;
  storageLabel: string;
  mountLabel: string;
  sku: string;
} {
  let deltaSum = 0;
  let finishLabel = 'Solar Amber';
  let storageLabel = '256GB';
  let mountLabel = 'Sony E-Mount';

  for (const group of PDP_VARIANT_GROUPS) {
    const selectedId = selection[group.id];
    const matched = group.options.find((opt) => opt.id === selectedId) ?? group.options[0];
    if (!matched) continue;
    deltaSum += matched.priceDelta ?? 0;
    if (group.id === 'finish') finishLabel = matched.label;
    if (group.id === 'storage') storageLabel = matched.label;
    if (group.id === 'mount') mountLabel = matched.label;
  }

  const finishCode = (selection.finish ?? 'amber').slice(0, 3).toUpperCase();
  const storageCode = (selection.storage ?? '256gb').toUpperCase();
  const mountCode = (selection.mount ?? 'e-mount').slice(0, 2).toUpperCase();

  return {
    unitPrice: PDP_BASE_PRICE + deltaSum,
    finishLabel,
    storageLabel,
    mountLabel,
    sku: `RF-X1-${finishCode}-${storageCode}-${mountCode}`,
  };
}

function ProductDetailPageScreen() {
  const [orbitAngle, setOrbitAngle] = useState<number>(35);
  const [variantSelection, setVariantSelection] = useState<Record<string, string>>({
    finish: 'amber',
    storage: '512gb',
    mount: 'e-mount',
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [rating, setRating] = useState<number>(5);
  const [wishlisted, setWishlisted] = useState<boolean>(false);
  const [navNotice, setNavNotice] = useState<string | null>(null);
  const [bagNotice, setBagNotice] = useState<string | null>(null);

  const details = useMemo(
    () => computePdpSelectionDetails(variantSelection),
    [variantSelection]
  );
  const totalPrice = details.unitPrice * quantity;

  const handleAddToCart = () => {
    setBagNotice(
      `Added ${quantity} × Prism X1 (${details.finishLabel} · ${details.storageLabel} · ${details.mountLabel}) to your cart — $${totalPrice.toLocaleString()}.`
    );
  };

  return (
    <div className="@container w-full min-w-0 space-y-5">
      {/* Breadcrumb Navigation Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={PDP_BREADCRUMBS}
          onNavigate={(crumbId) => {
            const crumb = PDP_BREADCRUMBS.find((item) => item.id === crumbId);
            if (crumb) {
              setNavNotice(`Navigated to "${crumb.label}" category shelf.`);
            }
          }}
        />
        <span className="prism-crystal px-3 py-1 rounded-full text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
          SKU: {details.sku}
        </span>
      </div>

      {navNotice ? (
        <AlertBanner
          severity="info"
          title="Breadcrumb Navigation"
          message={navNotice}
          onDismiss={() => setNavNotice(null)}
        />
      ) : null}

      {/* Main Split PDP Workspace */}
      <div className="grid grid-cols-1 @3xl:grid-cols-[1.06fr_0.94fr] gap-6 items-start">
        {/* Left: Interactive 360° Optical Stage & Trust Bar */}
        <div className="min-w-0 space-y-4">
          <Product360Viewer
            title={`Prism X1 · ${details.finishLabel}`}
            frames={PDP_360_FRAMES}
            angle={orbitAngle}
            onAngleChange={setOrbitAngle}
            heightPx={300}
          />

          <div className="prism-slab p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Quick Camera Angles
              </span>
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Orbit {orbitAngle}°
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PDP_VIEWPOINTS.map((preset) => (
                <TagChip
                  key={preset.id}
                  label={preset.label}
                  selected={Math.abs(orbitAngle - preset.angle) <= 15}
                  onSelect={() => setOrbitAngle(preset.angle)}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 @lg:grid-cols-3 gap-2.5">
            <div className="prism-well rounded-2xl p-3 flex items-center gap-2.5">
              <Truck
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  Next-Day Air
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Free insured courier
                </div>
              </div>
            </div>
            <div className="prism-well rounded-2xl p-3 flex items-center gap-2.5">
              <ShieldCheck
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--prism-success-dark)' }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  2-Year Warranty
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Optical recalibration
                </div>
              </div>
            </div>
            <div className="prism-well rounded-2xl p-3 flex items-center gap-2.5">
              <PackageCheck
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--prism-secondary-dark)' }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  30-Day Trial
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Prepaid studio returns
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Configuration, Live Price & Purchase Actions */}
        <div className="prism-slab p-5 sm:p-6 space-y-5 min-w-0">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <BadgeStatus label="In Stock · Ships Today" tone="online" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Flagship Cinema Series
              </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Refractor Prism X1 Cinema Monolith
              </h2>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                  ${totalPrice.toLocaleString()}
                </div>
                {quantity > 1 ? (
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    ${details.unitPrice.toLocaleString()} × {quantity} units
                  </div>
                ) : null}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Precision optical prime engineered with fluorite glass elements, zero focus breathing,
              and onboard LUT telemetry storage for cinema color pipelines.
            </p>

            <div className="overflow-x-auto max-w-full pt-1">
              <RatingControl
                label="Verified Buyer Rating (318 reviews)"
                value={rating}
                onChange={setRating}
              />
            </div>
          </div>

          <ProductVariantSelector
            basePrice={PDP_BASE_PRICE}
            groups={PDP_VARIANT_GROUPS}
            selected={variantSelection}
            onChange={setVariantSelection}
          />

          <div className="pt-2 border-t border-slate-300/40 dark:border-slate-700/50 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <NumericStepper
                label="Order Quantity"
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={10}
                unit="qty"
              />
              <div className="prism-well rounded-2xl px-3.5 py-2 text-right">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Configured Subtotal
                </div>
                <div className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                  ${totalPrice.toLocaleString()}.00
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <PrimaryButton
                className="flex-1 min-w-[180px]"
                leadingIcon={<ShoppingBag className="w-4 h-4" aria-hidden="true" />}
                onClick={handleAddToCart}
              >
                Add to Cart — ${totalPrice.toLocaleString()}
              </PrimaryButton>
              <SecondaryButton
                tone={wishlisted ? 'cobalt' : 'crystal'}
                leadingIcon={
                  wishlisted ? (
                    <Bookmark className="w-4 h-4 fill-current" aria-hidden="true" />
                  ) : (
                    <Heart className="w-4 h-4" aria-hidden="true" />
                  )
                }
                onClick={() => setWishlisted((prev) => !prev)}
              >
                {wishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
              </SecondaryButton>
            </div>
          </div>

          {bagNotice ? (
            <AlertBanner
              severity="success"
              title="Added to Shopping Bag"
              message={bagNotice}
              onDismiss={() => setBagNotice(null)}
            />
          ) : null}
        </div>
      </div>

      {/* Expandable Specifications & Shipping Accordion */}
      <section aria-label="Product specifications and shipping">
        <Accordion items={PDP_ACCORDION_ITEMS} allowMultiple />
      </section>
    </div>
  );
}

/* ============================================================================
 * Screen 3: Create New Product / Merchant Inventory Form
 * ============================================================================ */

type MerchantPublishState = 'draft' | 'published' | 'scheduled';

interface MerchantFeedback {
  severity: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
}

const TAXONOMY_TREE: CascadeOptionNode[] = [
  {
    id: 'optics',
    label: 'Optical Hardware',
    children: [
      {
        id: 'lenses',
        label: 'Cinema Lenses',
        children: [
          { id: 'prime', label: 'Prime Lenses' },
          { id: 'anamorphic', label: 'Anamorphic Lenses' },
        ],
      },
      {
        id: 'filters',
        label: 'Optical Filters',
        children: [
          { id: 'dichroic-nd', label: 'Dichroic ND' },
          { id: 'polarizer', label: 'Circular Polarizer' },
        ],
      },
    ],
  },
  {
    id: 'lighting',
    label: 'Studio Lighting',
    children: [
      {
        id: 'panels',
        label: 'LED Panels',
        children: [
          { id: 'bi-color', label: 'Bi-Color Key' },
          { id: 'rgb-prism', label: 'RGB Prism Tube' },
        ],
      },
    ],
  },
];

const WEIGHT_UNITS: MeasurementUnitOption[] = [
  { id: 'g', label: 'g', factorToBase: 1 },
  { id: 'kg', label: 'kg', factorToBase: 1000 },
  { id: 'lb', label: 'lb', factorToBase: 453.592 },
];

const DEFAULT_FLAGSHIP_TAG: CreatableOption = {
  value: 'flagship',
  label: 'Flagship Drop',
  group: 'Merchandising',
};

const DEFAULT_CINEMA_TAG: CreatableOption = {
  value: 'cinema-ready',
  label: 'Cinema Ready',
  group: 'Capability',
};

const INITIAL_TAG_OPTIONS: CreatableOption[] = [
  DEFAULT_FLAGSHIP_TAG,
  DEFAULT_CINEMA_TAG,
  { value: 'weather-sealed', label: 'Weather Sealed', group: 'Hardware' },
  { value: 'free-courier', label: 'Free Express Shipping', group: 'Fulfillment' },
];

const INITIAL_PRODUCT_DESCRIPTION = `## Optical Highlights

Crafted with **fluorite extra-low dispersion elements** and *zero-breathing cinema focus mechanics*.

- Dual-stage specular anti-reflective glass coating
- Laser-calibrated MTF certificate included in every box
- Compatible with 82mm magnetic dichroic filters`;

const INITIAL_MEDIA_FILES: UploadedFileSummary[] = [
  { name: 'prism-x1-hero-studio.webp', sizeBytes: 1_840_000, mimeType: 'image/webp' },
  { name: 'prism-x1-360-mesh.glb', sizeBytes: 4_620_000, mimeType: 'model/gltf-binary' },
];

function resolveTaxonomyLabels(pathIds: ReadonlyArray<string>): string[] {
  const labels: string[] = [];
  let level: ReadonlyArray<CascadeOptionNode> = TAXONOMY_TREE;
  for (const id of pathIds) {
    const match = level.find((node) => node.id === id);
    if (!match) break;
    labels.push(match.label);
    level = match.children ?? [];
  }
  return labels;
}

function NewProductFormScreen() {
  const [title, setTitle] = useState<string>('Prism 85mm T1.4 Anamorphic Prime');
  const [sku, setSku] = useState<string>('RF-ANA-85T14-PRO');
  const [categoryPath, setCategoryPath] = useState<string[]>(['optics', 'lenses', 'anamorphic']);
  const [unitPrice, setUnitPrice] = useState<CurrencyInputValue>({
    amount: 799,
    currency: 'USD',
  });
  const [packageWeight, setPackageWeight] = useState<MeasurementValue>({
    amount: 840,
    unit: 'g',
  });
  const [initialStock, setInitialStock] = useState<number>(45);
  const [tagOptions, setTagOptions] = useState<CreatableOption[]>(INITIAL_TAG_OPTIONS);
  const [selectedComboTag, setSelectedComboTag] = useState<string>('flagship');
  const [activeTags, setActiveTags] = useState<CreatableOption[]>([
    DEFAULT_FLAGSHIP_TAG,
    DEFAULT_CINEMA_TAG,
  ]);
  const [description, setDescription] = useState<string>(INITIAL_PRODUCT_DESCRIPTION);
  const [mediaFiles, setMediaFiles] = useState<UploadedFileSummary[]>(INITIAL_MEDIA_FILES);
  const [publishState, setPublishState] = useState<MerchantPublishState>('draft');
  const [feedback, setFeedback] = useState<MerchantFeedback | null>(null);

  const titleError = title.trim().length < 3 ? 'Enter a product title (at least 3 characters).' : undefined;
  const skuError = sku.trim().length < 4 ? 'Provide a valid merchant SKU code.' : undefined;

  const taxonomyLabels = useMemo(() => resolveTaxonomyLabels(categoryPath), [categoryPath]);

  const checklist = useMemo(
    () => [
      { id: 'chk-title', label: 'Product title & SKU populated', passed: !titleError && !skuError },
      { id: 'chk-taxonomy', label: '3-tier taxonomy path assigned', passed: taxonomyLabels.length >= 2 },
      { id: 'chk-price', label: 'Unit price greater than zero', passed: unitPrice.amount > 0 },
      { id: 'chk-media', label: 'At least 1 product gallery asset', passed: mediaFiles.length > 0 },
      { id: 'chk-copy', label: 'Rich storefront description written', passed: description.trim().length >= 20 },
    ],
    [description, mediaFiles.length, skuError, taxonomyLabels.length, titleError, unitPrice.amount]
  );

  const readinessPercent = Math.round(
    (checklist.filter((item) => item.passed).length / checklist.length) * 100
  );
  const inventoryValue = unitPrice.amount * initialStock;

  const attachTag = (option: CreatableOption) => {
    setActiveTags((prev) =>
      prev.some((existing) => existing.value === option.value) ? prev : [...prev, option]
    );
  };

  const handlePublish = () => {
    if (titleError || skuError || unitPrice.amount <= 0 || mediaFiles.length === 0) {
      setFeedback({
        severity: 'error',
        title: 'Listing validation failed',
        message:
          'Ensure product title, SKU, positive unit price, and at least one gallery upload are complete before publishing.',
      });
      return;
    }
    setPublishState('published');
    setFeedback({
      severity: 'success',
      title: `Published "${title.trim()}"`,
      message: `SKU ${sku.trim()} is live at ${unitPrice.amount.toFixed(2)} ${unitPrice.currency} with ${initialStock} units stocked (${packageWeight.amount} ${packageWeight.unit}) and ${activeTags.length} merchandising tags.`,
    });
  };

  const splitActions: ComboSplitAction[] = [
    {
      id: 'save-draft',
      label: 'Save as Draft',
      description: 'Store quietly in merchant staging catalog',
      onSelect: () => {
        setPublishState('draft');
        setFeedback({
          severity: 'info',
          title: 'Draft snapshot saved',
          message: `Saved "${title.trim() || 'Untitled Product'}" (${readinessPercent}% listing readiness) to staging.`,
        });
      },
    },
    {
      id: 'schedule-launch',
      label: 'Schedule Launch',
      description: 'Queue storefront drop for next Monday 09:00 UTC',
      onSelect: () => {
        if (titleError || skuError) {
          setFeedback({
            severity: 'warning',
            title: 'Complete title and SKU before scheduling',
            message: 'Scheduled drops require a finalized product title and SKU code.',
          });
          return;
        }
        setPublishState('scheduled');
        setFeedback({
          severity: 'success',
          title: 'Launch scheduled',
          message: `SKU ${sku.trim()} queued for automated release with ${initialStock} initial warehouse units.`,
        });
      },
    },
    {
      id: 'reset-form',
      label: 'Reset to Defaults',
      description: 'Restore sample optical lens product template',
      destructive: true,
      onSelect: () => {
        setTitle('Prism 85mm T1.4 Anamorphic Prime');
        setSku('RF-ANA-85T14-PRO');
        setCategoryPath(['optics', 'lenses', 'anamorphic']);
        setUnitPrice({ amount: 799, currency: 'USD' });
        setPackageWeight({ amount: 840, unit: 'g' });
        setInitialStock(45);
        setActiveTags([DEFAULT_FLAGSHIP_TAG, DEFAULT_CINEMA_TAG]);
        setDescription(INITIAL_PRODUCT_DESCRIPTION);
        setMediaFiles(INITIAL_MEDIA_FILES);
        setPublishState('draft');
        setFeedback({
          severity: 'info',
          title: 'Template restored',
          message: 'Merchant inventory fields reset to default sample optical product.',
        });
      },
    },
  ];

  const statusTone =
    publishState === 'published'
      ? 'online'
      : publishState === 'scheduled'
        ? 'counter'
        : 'warning';
  const statusLabel =
    publishState === 'published'
      ? 'Published Live'
      : publishState === 'scheduled'
        ? 'Launch Scheduled'
        : 'Draft in Progress';

  return (
    <div className="@container w-full min-w-0 space-y-5">
      {/* Merchant Action Header */}
      <header className="prism-slab p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeStatus label={statusLabel} tone={statusTone} />
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Readiness {readinessPercent}%
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create New Product · Merchant Inventory Studio
          </h3>
        </div>

        <ComboSplitButton
          label="Publish Product"
          icon={<Send className="w-4 h-4" aria-hidden="true" />}
          onPrimaryClick={handlePublish}
          actions={splitActions}
          menuLabel="Additional publish options"
        />
      </header>

      {feedback ? (
        <AlertBanner
          severity={feedback.severity}
          title={feedback.title}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}

      {/* Two-Column Authoring + Live Readiness Preview */}
      <div className="grid grid-cols-1 @3xl:grid-cols-[1.3fr_0.7fr] gap-5 items-start">
        {/* Left: Core Authoring Forms */}
        <div className="min-w-0 space-y-5">
          {/* Identity & Taxonomy */}
          <section className="prism-slab p-5 space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Box className="w-4 h-4" style={{ color: 'var(--prism-primary-main)' }} aria-hidden="true" />
              <span>Product Identity & Taxonomy</span>
            </h4>

            <div className="grid grid-cols-1 @xl:grid-cols-2 gap-4">
              <TextInput
                label="Product Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Prism 85mm Anamorphic Prime"
                errorText={titleError}
                helperText={titleError ? undefined : 'Shown in storefront cards, PDP, and invoices.'}
              />
              <TextInput
                label="Merchant SKU"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="RF-SKU-0001"
                errorText={skuError}
                helperText={skuError ? undefined : 'Unique warehouse fulfillment identifier.'}
              />
            </div>

            <CascadingSelect
              label="Product Taxonomy Category"
              options={TAXONOMY_TREE}
              value={categoryPath}
              onChange={(ids) => setCategoryPath(ids)}
              placeholder="Choose category hierarchy..."
              separator=" › "
            />
          </section>

          {/* Pricing, Weight & Inventory */}
          <section className="prism-slab p-5 space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Pricing, Package Logistics & Warehouse Stock
            </h4>

            <div className="grid grid-cols-1 @xl:grid-cols-2 gap-4">
              <CurrencyInput
                label="Unit Retail Price"
                value={unitPrice}
                onChange={setUnitPrice}
                min={0}
                max={50000}
              />
              <MeasurementUnitInput
                label="Package Shipping Weight"
                value={packageWeight}
                onChange={setPackageWeight}
                units={WEIGHT_UNITS}
                convertOnUnitChange
                min={0}
                max={25000}
                step={10}
              />
            </div>

            <div className="pt-2 border-t border-slate-300/40 dark:border-slate-700/50 flex flex-wrap items-end justify-between gap-4">
              <NumericStepper
                label="Initial Warehouse Stock"
                value={initialStock}
                onChange={setInitialStock}
                min={0}
                max={5000}
                step={5}
                unit="units"
              />
              <div className="prism-well rounded-2xl px-4 py-2.5 text-right">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Stocked Inventory Valuation
                </div>
                <div className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                  {inventoryValue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  {unitPrice.currency}
                </div>
              </div>
            </div>
          </section>

          {/* Rich Product Description */}
          <section className="prism-slab p-5">
            <RichTextEditor
              label="Storefront Product Description"
              value={description}
              onChange={setDescription}
              showPreview
            />
          </section>
        </div>

        {/* Right: Merchandising Tags, Gallery Dropzone & Live Listing Preview */}
        <div className="min-w-0 space-y-5">
          <section className="prism-slab p-5 space-y-3.5">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4" style={{ color: 'var(--prism-primary-main)' }} aria-hidden="true" />
              <span>Merchandising Tags</span>
            </h4>

            <CreatableCombobox
              label="Search or Create Tag"
              options={tagOptions}
              value={selectedComboTag}
              onChange={(val, option) => {
                setSelectedComboTag(val);
                attachTag(option);
              }}
              onCreateOption={(createdLabel) => {
                const slug = createdLabel
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-');
                const created: CreatableOption = {
                  value: slug || `tag-${tagOptions.length + 1}`,
                  label: createdLabel.trim(),
                  group: 'Custom',
                };
                setTagOptions((prev) =>
                  prev.some((opt) => opt.value === created.value) ? prev : [...prev, created]
                );
                attachTag(created);
                return created;
              }}
              placeholder="Type a new campaign tag..."
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {activeTags.map((tag) => (
                <TagChip
                  key={tag.value}
                  label={tag.label}
                  selected
                  onDismiss={() =>
                    setActiveTags((prev) => prev.filter((item) => item.value !== tag.value))
                  }
                />
              ))}
              {activeTags.length === 0 ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  No tags attached yet.
                </span>
              ) : null}
            </div>
          </section>

          <section className="prism-slab p-5 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Product Media Gallery
            </h4>
            <FileDropzone
              files={mediaFiles}
              onUploadFiles={(added) =>
                setMediaFiles((prev) => {
                  const seen = new Set(prev.map((file) => file.name));
                  const next = [...prev];
                  for (const file of added) {
                    if (!seen.has(file.name)) {
                      seen.add(file.name);
                      next.push(file);
                    }
                  }
                  return next;
                })
              }
              onRemoveFile={(name) =>
                setMediaFiles((prev) => prev.filter((file) => file.name !== name))
              }
              accept=".png,.jpg,.webp,.glb"
              maxVisibleFiles={5}
            />
          </section>

          {/* Live Validation & Storefront Card Preview */}
          <section className="prism-slab p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Live Validation Preview
              </h4>
              <span className="prism-emerald px-2.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-semibold">
                {readinessPercent}% Ready
              </span>
            </div>

            <div className="prism-well rounded-2xl p-3.5 space-y-1.5">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {taxonomyLabels.join(' › ') || 'Uncategorized'}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white break-words">
                {title.trim() || 'Untitled Product'}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
                  {unitPrice.amount.toFixed(2)} {unitPrice.currency}
                </span>
                <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {initialStock} qty · {packageWeight.amount} {packageWeight.unit}
                </span>
              </div>
            </div>

            <ul className="space-y-2 text-xs">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      item.passed
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={
                      item.passed
                        ? 'text-slate-800 dark:text-slate-100 font-medium'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Screen 4: Mobile & Web Checkout, Payment & Promo Flow
 * ============================================================================ */

const CHECKOUT_STEPS: StepDefinition[] = [
  { id: 'shipping', title: 'Shipping', subtitle: 'Contact & address' },
  { id: 'payment', title: 'Payment', subtitle: 'Card & promo' },
  { id: 'confirm', title: 'Confirm', subtitle: 'Review & pay' },
];

interface CheckoutOrderItem {
  id: string;
  name: string;
  variant: string;
  quantity: number;
  price: number;
}

const CHECKOUT_ITEMS: ReadonlyArray<CheckoutOrderItem> = [
  {
    id: 'chk-lens',
    name: 'Prism 50mm f/1.2 Optical Lens',
    variant: 'Solar Amber · E-Mount',
    quantity: 1,
    price: 320,
  },
  {
    id: 'chk-diffuser',
    name: 'Magnetic Optical Diffuser Kit',
    variant: '82mm Studio Soft',
    quantity: 1,
    price: 65,
  },
];

const CHECKOUT_SHIPPING_FEE = 15;
const CHECKOUT_TAX_RATE = 0.0825;

function CheckoutBillingFlowScreen() {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [fullName, setFullName] = useState<string>('Maya Lin');
  const [address, setAddress] = useState<string>('480 Howard St, Suite 900, San Francisco, CA');
  const [phone, setPhone] = useState<PhoneInputValue>({
    countryIso: 'US',
    dialCode: '+1',
    nationalDigits: '4155550199',
    formatted: '(415) 555-0199',
    e164: '+14155550199',
  });
  const [cardState, setCardState] = useState<PaymentCardValue | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [paymentCompleted, setPaymentCompleted] = useState<boolean>(false);

  const subtotal = useMemo(
    () => CHECKOUT_ITEMS.reduce((sum, item) => sum + item.price * item.quantity, 0),
    []
  );

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.code === 'PRISM20') {
      return Math.round(subtotal * 0.2 * 100) / 100;
    }
    if (appliedCoupon.code === 'FREESHIP') {
      return CHECKOUT_SHIPPING_FEE;
    }
    return 0;
  }, [appliedCoupon, subtotal]);

  const taxableSubtotal = Math.max(0, subtotal - (appliedCoupon?.code === 'PRISM20' ? discountAmount : 0));
  const estimatedTax = Math.round(taxableSubtotal * CHECKOUT_TAX_RATE * 100) / 100;
  const effectiveShipping =
    appliedCoupon?.code === 'FREESHIP' ? 0 : CHECKOUT_SHIPPING_FEE;
  const grandTotal =
    Math.round((taxableSubtotal + effectiveShipping + estimatedTax) * 100) / 100;

  const handleApplyCoupon = (code: string): AppliedCoupon | string => {
    if (code === 'PRISM20') {
      const next: AppliedCoupon = {
        code: 'PRISM20',
        label: 'Optical Launch 20% Off',
        discountText: `-$${(subtotal * 0.2).toFixed(2)}`,
      };
      setAppliedCoupon(next);
      return next;
    }
    if (code === 'FREESHIP') {
      const next: AppliedCoupon = {
        code: 'FREESHIP',
        label: 'Complimentary Express Shipping',
        discountText: `-$${CHECKOUT_SHIPPING_FEE.toFixed(2)}`,
      };
      setAppliedCoupon(next);
      return next;
    }
    return `Code "${code}" is not valid. Try PRISM20 or FREESHIP.`;
  };

  const handleCompletePayment = async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 650);
    });
    setPaymentCompleted(true);
  };

  const handleRestartCheckout = () => {
    setPaymentCompleted(false);
    setStepIndex(0);
  };

  return (
    <div className="@container w-full min-w-0 space-y-5">
      {/* Secure Checkout Header */}
      <header className="prism-slab p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
              style={{ color: 'var(--prism-primary-main)' }}
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                Express Optical Checkout
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Encrypted checkout with instant promo validation
              </p>
            </div>
          </div>
          <BadgeStatus label="TLS 1.3 Verified" tone="online" />
        </div>

        <Stepper
          steps={CHECKOUT_STEPS}
          activeStepIndex={paymentCompleted ? CHECKOUT_STEPS.length : stepIndex}
          onStepClick={(idx) => {
            if (!paymentCompleted) {
              setStepIndex(idx);
            }
          }}
        />
      </header>

      {/* Container-Aware Split: Mobile Single Column -> Web Two Column */}
      <div className="grid grid-cols-1 @3xl:grid-cols-[1.2fr_0.8fr] gap-5 items-start">
        {/* Active Checkout Step */}
        <div className="min-w-0 space-y-4">
          {stepIndex === 0 ? (
            <section className="prism-slab p-5 space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  1. Shipping & Delivery Contact
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Courier updates and signature notifications are sent to your verified phone.
                </p>
              </div>

              <TextInput
                label="Recipient Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
              />

              <TextInput
                label="Street Address & Postal Code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, suite, city, postal"
              />

              <InternationalPhoneInput
                label="Delivery Contact Phone"
                value={phone}
                onChange={setPhone}
              />

              <div className="pt-2 flex flex-wrap justify-end">
                <PrimaryButton
                  className="w-full @lg:w-auto"
                  onClick={() => setStepIndex(1)}
                >
                  Continue to Payment
                </PrimaryButton>
              </div>
            </section>
          ) : null}

          {stepIndex === 1 ? (
            <section className="prism-slab p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    2. Payment Method
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time network brand detection & Luhn checksum validation.
                  </p>
                </div>
                <span className="prism-crystal px-2.5 py-1 rounded-full text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  Test Visa: 4242 4242 4242 4242
                </span>
              </div>

              <PaymentCardInput
                defaultCardholderName={fullName}
                onChange={setCardState}
                onSubmit={(val) => {
                  setCardState(val);
                  setStepIndex(2);
                }}
                submitLabel="Verify Card & Review Order"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <SecondaryButton size="sm" onClick={() => setStepIndex(0)}>
                  Back to Shipping
                </SecondaryButton>
                <PrimaryButton size="sm" onClick={() => setStepIndex(2)}>
                  Continue to Confirm
                </PrimaryButton>
              </div>
            </section>
          ) : null}

          {stepIndex === 2 ? (
            <section className="prism-slab p-5 space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  3. Review & Authorize Payment
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Confirm recipient details and finalize your optical order.
                </p>
              </div>

              <div className="prism-well rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Ship To</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-right">
                    {fullName}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Address</span>
                  <span className="text-slate-700 dark:text-slate-200 text-right break-words">
                    {address}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">SMS Contact</span>
                  <span className="font-mono tabular-nums text-slate-800 dark:text-slate-100">
                    {phone.e164 || `${phone.dialCode} ${phone.formatted}`}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Payment Method</span>
                  <span className="font-mono tabular-nums text-slate-800 dark:text-slate-100 uppercase">
                    {cardState && cardState.cardNumber.length >= 4
                      ? `${cardState.brand} ·••• ${cardState.cardNumber.slice(-4)} (${
                          cardState.isValidLuhn ? 'Luhn OK' : 'Draft'
                        })`
                      : 'VISA ·••• 4242 (Express Token)'}
                  </span>
                </div>
              </div>

              {paymentCompleted ? (
                <AlertBanner
                  severity="success"
                  title="Payment Confirmed · Order #RF-2026-8841"
                  message={`Charged $${grandTotal.toFixed(2)}. Express courier tracking has been dispatched to ${
                    phone.e164 || phone.formatted
                  }.`}
                  actionLabel="New Checkout"
                  onAction={handleRestartCheckout}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <SecondaryButton size="sm" onClick={() => setStepIndex(1)}>
                    Edit Payment
                  </SecondaryButton>
                  <StatefulAsyncButton
                    idleLabel={`Pay $${grandTotal.toFixed(2)} Now`}
                    idleIcon={<CreditCard className="w-4 h-4" aria-hidden="true" />}
                    loadingLabel="Authorizing..."
                    successLabel="Payment Approved"
                    resetDelayMs={0}
                    onAction={handleCompletePayment}
                  />
                </div>
              )}
            </section>
          ) : null}
        </div>

        {/* Order Summary Well & Promo Coupon Engine */}
        <aside className="min-w-0 space-y-4">
          <div className="prism-slab p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Order Summary
              </h4>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {CHECKOUT_ITEMS.length} items
              </span>
            </div>

            <ul className="space-y-2.5">
              {CHECKOUT_ITEMS.map((item) => (
                <li
                  key={item.id}
                  className="prism-well rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.variant} · Qty {item.quantity}
                    </div>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                    ${item.price.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <PromoCouponInput
                appliedCoupon={appliedCoupon}
                onApply={handleApplyCoupon}
                onRemove={() => setAppliedCoupon(null)}
                placeholder="Try PRISM20 or FREESHIP"
              />
              {!appliedCoupon ? (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                  <span>Quick promo codes:</span>
                  <TagChip
                    label="Apply PRISM20 (-20%)"
                    onSelect={() => {
                      handleApplyCoupon('PRISM20');
                    }}
                  />
                </div>
              ) : null}
            </div>

            <dl className="prism-well rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-600 dark:text-slate-300">Subtotal</dt>
                <dd className="font-medium tabular-nums text-slate-900 dark:text-white">
                  ${subtotal.toFixed(2)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-600 dark:text-slate-300">Express Courier</dt>
                <dd className="font-medium tabular-nums text-slate-900 dark:text-white">
                  {effectiveShipping === 0 ? 'FREE' : `$${effectiveShipping.toFixed(2)}`}
                </dd>
              </div>
              {discountAmount > 0 && appliedCoupon ? (
                <div className="flex items-center justify-between gap-2">
                  <dt
                    className="font-medium"
                    style={{ color: 'var(--prism-success-dark)' }}
                  >
                    Promo ({appliedCoupon.code})
                  </dt>
                  <dd
                    className="font-semibold tabular-nums"
                    style={{ color: 'var(--prism-success-dark)' }}
                  >
                    -${discountAmount.toFixed(2)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-600 dark:text-slate-300">Estimated Tax (8.25%)</dt>
                <dd className="font-medium tabular-nums text-slate-900 dark:text-white">
                  ${estimatedTax.toFixed(2)}
                </dd>
              </div>
              <div className="pt-2.5 mt-1 border-t border-slate-300/40 dark:border-slate-700/50 flex items-center justify-between gap-2">
                <dt className="text-sm font-bold text-slate-900 dark:text-white">Total Due</dt>
                <dd className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                  ${grandTotal.toFixed(2)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ============================================================================
 * Screen 5: SaaS Pricing Matrix & Add-On Configurator
 * ============================================================================ */

const DEFAULT_GROWTH_TIER: PricingTier = {
  id: 'growth',
  name: 'Studio Growth',
  description: 'Full multi-brand design system & analytics suite',
  monthlyPrice: 79,
  annualPrice: 63,
  popular: true,
  badge: 'Most Popular',
  ctaLabel: 'Select Growth',
  features: [
    { text: 'Unlimited seats & 5 official theme packs', included: true },
    { text: 'Automated WCAG AA & strict lint CI telemetry', included: true },
    { text: 'Priority security releases & Figma token sync', included: true },
  ],
};

const SAAS_TIERS: ReadonlyArray<PricingTier> = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For indie teams building polished optical apps',
    monthlyPrice: 0,
    annualPrice: 0,
    ctaLabel: 'Select Starter',
    features: [
      { text: 'Up to 3 team seats & public previews', included: true },
      { text: 'Alabaster & Obsidian optical themes', included: true },
      { text: 'CLI Swizzle & enterprise governance', included: false },
    ],
  },
  DEFAULT_GROWTH_TIER,
  {
    id: 'enterprise',
    name: 'Enterprise Cloud',
    description: 'Dedicated infrastructure & architectural SLA',
    monthlyPrice: 249,
    annualPrice: 199,
    badge: 'Custom SLA',
    ctaLabel: 'Select Enterprise',
    features: [
      { text: 'SSO/SAML, SCIM provisioning & audit logs', included: true },
      { text: 'Dedicated solution architect & ADR reviews', included: true },
      { text: 'Multi-region failover with 99.99% uptime SLA', included: true },
    ],
  },
];

interface EnterpriseAddOnMeta {
  id: string;
  title: string;
  monthlyCost: number;
  option: RichSelectionCardOption;
}

const ENTERPRISE_ADDONS: ReadonlyArray<EnterpriseAddOnMeta> = [
  {
    id: 'dedicated-vpc',
    title: 'Dedicated VPC Isolation',
    monthlyCost: 140,
    option: {
      id: 'dedicated-vpc',
      title: 'Dedicated VPC (+$140/mo)',
      description: 'Single-tenant private cloud peering with customer-managed KMS encryption keys.',
      badge: 'Security',
      icon: <Shield className="w-4 h-4" aria-hidden="true" />,
    },
  },
  {
    id: 'sre-247',
    title: '24/7 SRE Escalation',
    monthlyCost: 220,
    option: {
      id: 'sre-247',
      title: '24/7 SRE On-Call (+$220/mo)',
      description: '15-minute P1 incident response with direct Slack Connect channel to core engineers.',
      badge: '99.99% SLA',
      icon: <Headphones className="w-4 h-4" aria-hidden="true" />,
    },
  },
  {
    id: 'soc2-pack',
    title: 'SOC2 Audit Pack',
    monthlyCost: 95,
    option: {
      id: 'soc2-pack',
      title: 'SOC2 Audit Pack (+$95/mo)',
      description: 'Continuous compliance evidence exports, penetration test attestations, and DPA.',
      badge: 'Compliance',
      icon: <FileCheck2 className="w-4 h-4" aria-hidden="true" />,
    },
  },
];

const ADDON_CARD_OPTIONS: RichSelectionCardOption[] = ENTERPRISE_ADDONS.map((item) => item.option);

const BILLING_FAQ_ITEMS: ReadonlyArray<AccordionItem> = [
  {
    id: 'faq-proration',
    title: 'How do mid-cycle plan upgrades and seat changes work?',
    body: 'Upgrades take effect immediately and are prorated down to the hour. Unused credit from your current tier automatically offsets your next monthly or annual invoice.',
  },
  {
    id: 'faq-startup',
    title: 'Who qualifies for Startup Credit codes like FOUNDER25?',
    body: 'Seed and Series A teams under $5M in funding receive 25% off Growth and Enterprise subscriptions plus add-ons for their first 12 months by applying FOUNDER25 at checkout.',
  },
  {
    id: 'faq-invoicing',
    title: 'Do you support annual purchase orders and wire transfers?',
    body: 'Yes. Enterprise and annual Growth subscriptions over $1,000/yr can settle via ACH, SEPA, international wire, or Net-30 corporate purchase orders.',
  },
  {
    id: 'faq-security',
    title: 'What is included in the SOC2 Type II Audit Pack?',
    body: 'You receive our latest independent SOC2 Type II report, quarterly OWASP dependency SBOMs, automated evidence snapshots, and countersigned GDPR/CCPA Data Processing Addendum.',
  },
];

function SaasPricingSubscriptionsScreen() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [selectedTierId, setSelectedTierId] = useState<string>('growth');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(['soc2-pack']);
  const [creditCoupon, setCreditCoupon] = useState<AppliedCoupon | null>(null);
  const [activationNotice, setActivationNotice] = useState<string | null>(null);

  const activeTier = useMemo(
    () => SAAS_TIERS.find((tier) => tier.id === selectedTierId) ?? DEFAULT_GROWTH_TIER,
    [selectedTierId]
  );

  const tierRate = billingCycle === 'annual' ? activeTier.annualPrice : activeTier.monthlyPrice;

  const activeAddOnDetails = useMemo(
    () => ENTERPRISE_ADDONS.filter((item) => selectedAddOns.includes(item.id)),
    [selectedAddOns]
  );

  const addOnsMonthlyTotal = useMemo(
    () => activeAddOnDetails.reduce((sum, item) => sum + item.monthlyCost, 0),
    [activeAddOnDetails]
  );

  const grossMonthly = tierRate + addOnsMonthlyTotal;

  const discountRate =
    creditCoupon?.code === 'FOUNDER25'
      ? 0.25
      : creditCoupon?.code === 'PRISM20'
        ? 0.2
        : 0;

  const creditSavings = Math.round(grossMonthly * discountRate * 100) / 100;
  const netMonthly = Math.max(0, Math.round((grossMonthly - creditSavings) * 100) / 100);
  const annualTotal = Math.round(netMonthly * 12 * 100) / 100;

  const handleApplyCredit = (code: string): AppliedCoupon | string => {
    if (code === 'FOUNDER25') {
      const next: AppliedCoupon = {
        code: 'FOUNDER25',
        label: 'Startup Accelerator Credit',
        discountText: '25% off',
      };
      setCreditCoupon(next);
      return next;
    }
    if (code === 'PRISM20') {
      const next: AppliedCoupon = {
        code: 'PRISM20',
        label: 'Design Systems Launch Credit',
        discountText: '20% off',
      };
      setCreditCoupon(next);
      return next;
    }
    return `Credit "${code}" not found. Try FOUNDER25 or PRISM20.`;
  };

  return (
    <div className="@container w-full min-w-0 space-y-6">
      {/* Pricing Hero Bar */}
      <header className="prism-slab p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="prism-emerald px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              Refractor Cloud Plans
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Transparent per-workspace pricing · Cancel anytime
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Scale Your Optical Design System
          </h3>
        </div>

        <BadgeStatus
          label={`Active Quote: ${activeTier.name} (${billingCycle === 'annual' ? 'Annual' : 'Monthly'})`}
          tone="online"
        />
      </header>

      {/* Core Pricing Matrix */}
      <PricingTierMatrix
        tiers={SAAS_TIERS}
        billingCycle={billingCycle}
        onBillingCycleChange={setBillingCycle}
        annualSavingsLabel="Save 20%"
        onSelectTier={(tier) => {
          setSelectedTierId(tier.id);
          setActivationNotice(null);
        }}
      />

      {/* Optional Enterprise Add-Ons */}
      <section className="prism-slab p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Enterprise Infrastructure Add-Ons
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Toggle optional security, SRE, and compliance modules to update your live quote.
            </p>
          </div>
          <span className="prism-crystal px-3 py-1 rounded-full text-xs font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
            +${addOnsMonthlyTotal}/mo add-ons
          </span>
        </div>

        <RichSelectionCards
          label="Optional enterprise add-ons"
          mode="multiple"
          columns={3}
          options={ADDON_CARD_OPTIONS}
          value={selectedAddOns}
          onChange={setSelectedAddOns}
        />
      </section>

      {/* Startup Credit & Live Subscription Quote Bar */}
      <div className="grid grid-cols-1 @2xl:grid-cols-[0.95fr_1.05fr] gap-5 items-start">
        <section className="prism-slab p-5 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Startup & Partner Credits
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Apply a startup accelerator or launch partner code for instant monthly savings.
          </p>
          <PromoCouponInput
            appliedCoupon={creditCoupon}
            onApply={handleApplyCredit}
            onRemove={() => setCreditCoupon(null)}
            placeholder="Try FOUNDER25 or PRISM20"
          />
          {!creditCoupon ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <TagChip
                label="Apply FOUNDER25 (-25%)"
                onSelect={() => {
                  handleApplyCredit('FOUNDER25');
                }}
              />
              <TagChip
                label="Apply PRISM20 (-20%)"
                onSelect={() => {
                  handleApplyCredit('PRISM20');
                }}
              />
            </div>
          ) : null}
        </section>

        <section className="prism-slab p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Live Subscription Quote
            </h4>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
            </span>
          </div>

          <dl className="prism-well rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-600 dark:text-slate-300">
                {activeTier.name} Plan ({billingCycle})
              </dt>
              <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">
                ${tierRate}/mo
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-600 dark:text-slate-300">
                Enterprise Add-Ons ({activeAddOnDetails.length})
              </dt>
              <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">
                +${addOnsMonthlyTotal}/mo
              </dd>
            </div>
            {creditSavings > 0 && creditCoupon ? (
              <div className="flex items-center justify-between gap-2">
                <dt
                  className="font-medium"
                  style={{ color: 'var(--prism-success-dark)' }}
                >
                  Credit ({creditCoupon.code})
                </dt>
                <dd
                  className="font-semibold tabular-nums"
                  style={{ color: 'var(--prism-success-dark)' }}
                >
                  -${creditSavings.toFixed(2)}/mo
                </dd>
              </div>
            ) : null}
            <div className="pt-2.5 mt-1 border-t border-slate-300/40 dark:border-slate-700/50 flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-sm font-bold text-slate-900 dark:text-white">
                Effective Monthly Rate
              </dt>
              <dd className="text-right">
                <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                  ${netMonthly.toFixed(2)}/mo
                </div>
                {billingCycle === 'annual' ? (
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    ${annualTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} billed yearly
                  </div>
                ) : null}
              </dd>
            </div>
          </dl>

          <PrimaryButton
            className="w-full"
            leadingIcon={<Sparkles className="w-4 h-4" aria-hidden="true" />}
            onClick={() =>
              setActivationNotice(
                `Configured ${activeTier.name} (${billingCycle}) with ${activeAddOnDetails.length} add-on(s) at $${netMonthly.toFixed(2)}/mo.`
              )
            }
          >
            Activate {activeTier.name} Workspace
          </PrimaryButton>

          {activationNotice ? (
            <AlertBanner
              severity="success"
              title="Subscription Configuration Ready"
              message={activationNotice}
              onDismiss={() => setActivationNotice(null)}
            />
          ) : null}
        </section>
      </div>

      {/* Billing & Security FAQ */}
      <section aria-label="Billing frequently asked questions" className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white px-1">
          Billing & Procurement FAQ
        </h4>
        <Accordion items={BILLING_FAQ_ITEMS} allowMultiple />
      </section>
    </div>
  );
}

/* ============================================================================
 * Standalone Copy-Pasteable Full TSX Code Snippets (Zero any / Zero unknown)
 * ============================================================================ */

const BROWSE_PRODUCTS_FULL_CODE = `import { useState } from 'react';
import {
  BadgeStatus, HistogramRangeSlider, PrimaryButton, PrismCard, RatingControl,
  SearchWithSuggestions, ShoppingCartDrawer, TagChip,
  type CartLineItem, type HistogramRangeValue,
} from '@refractor-ui/core';

interface ProductItem { id: string; name: string; category: string; price: number; rating: number; }

const PRODUCTS: ReadonlyArray<ProductItem> = [
  { id: 'lens-50', name: 'Prism 50mm f/1.2 Lens', category: 'Lenses', price: 320, rating: 5 },
  { id: 'key-light', name: 'Lumina Studio Key Light', category: 'Lighting', price: 185, rating: 5 },
  { id: 'cryo-dac', name: 'CryoDAC Reference Amp', category: 'Audio', price: 245, rating: 4 },
];

export function OpticalStorefrontPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [priceRange, setPriceRange] = useState<HistogramRangeValue>({ min: 50, max: 450 });
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartLineItem[]>([]);

  const visible = PRODUCTS.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      p.price >= priceRange.min && p.price <= priceRange.max &&
      p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const addToCart = (product: ProductItem) => {
    setCartItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      if (found) return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { id: product.id, name: product.name, unitPrice: product.price, quantity: 1 }];
    });
  };

  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-5">
      <header className="prism-slab p-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Refractor Optics Store</h1>
        <div className="flex items-center gap-3">
          <BadgeStatus label="In Cart" count={count} tone="counter" />
          <PrimaryButton size="sm" onClick={() => setCartOpen(true)}>Open Cart ({count})</PrimaryButton>
        </div>
      </header>
      <section className="prism-slab p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3 min-w-0">
          <SearchWithSuggestions
            value={query} onChange={setQuery}
            suggestions={PRODUCTS.map((p) => ({ id: p.id, label: p.name, category: p.category }))}
            onSelectSuggestion={(item) => setQuery(item.label)}
          />
          <div className="flex flex-wrap gap-2">
            {['All', 'Lenses', 'Lighting', 'Audio'].map((cat) => (
              <TagChip key={cat} label={cat} selected={category === cat} onSelect={() => setCategory(cat)} />
            ))}
          </div>
        </div>
        <HistogramRangeSlider
          label="Price Filter ($)" value={priceRange} onChange={setPriceRange} formatValue={(v) => \`$\${v}\`}
          bins={[{ min: 0, max: 150, count: 8 }, { min: 150, max: 300, count: 22 }, { min: 300, max: 500, count: 14 }]}
        />
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((product) => (
          <PrismCard
            key={product.id} kicker={product.category} title={product.name}
            footer={<><span className="font-bold tabular-nums">\${product.price}</span><PrimaryButton size="sm" onClick={() => addToCart(product)}>Add to Cart</PrimaryButton></>}
          >
            <RatingControl value={product.rating} onChange={() => undefined} label="Rating" />
          </PrismCard>
        ))}
      </div>
      <ShoppingCartDrawer mode="drawer" open={cartOpen} onOpenChange={setCartOpen} items={cartItems} onItemsChange={setCartItems} taxRate={0.0825} />
    </div>
  );
}`;

const PRODUCT_DETAIL_FULL_CODE = `import { useState } from 'react';
import {
  Accordion, Breadcrumbs, NumericStepper, PrimaryButton, Product360Viewer,
  ProductVariantSelector, RatingControl, SecondaryButton, type VariantGroup,
} from '@refractor-ui/core';

const GROUPS: ReadonlyArray<VariantGroup> = [
  {
    id: 'finish',
    label: 'Optical Finish',
    options: [
      { id: 'amber', label: 'Solar Amber', kind: 'color', swatchTone: 'primary', priceDelta: 0 },
      { id: 'crystal', label: 'Ice Crystal', kind: 'color', swatchTone: 'secondary', priceDelta: 30 },
      { id: 'emerald', label: 'Emerald Tide', kind: 'color', swatchTone: 'emerald', priceDelta: 50 },
    ],
  },
  {
    id: 'storage',
    label: 'Calibration LUT Memory',
    options: [
      { id: '256gb', label: '256GB', kind: 'size', priceDelta: 0 },
      { id: '512gb', label: '512GB', kind: 'size', priceDelta: 120 },
      { id: '1tb', label: '1TB Pro', kind: 'size', priceDelta: 260 },
    ],
  },
];

export function FlagshipProductDetailPage() {
  const [angle, setAngle] = useState(35);
  const [selected, setSelected] = useState<Record<string, string>>({ finish: 'amber', storage: '512gb' });
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [wishlisted, setWishlisted] = useState(false);

  const delta = GROUPS.reduce((sum, group) => {
    const match = group.options.find((opt) => opt.id === selected[group.id]);
    return sum + (match?.priceDelta ?? 0);
  }, 0);
  const total = (649 + delta) * quantity;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { id: 'store', label: 'Store' },
          { id: 'lenses', label: 'Cinema Lenses' },
          { id: 'prism-x1', label: 'Prism X1 Monolith' },
        ]}
        onNavigate={() => undefined}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Product360Viewer title="Prism X1 Cinema Monolith" angle={angle} onAngleChange={setAngle} heightPx={300} />
        <div className="prism-slab p-6 space-y-5 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="text-2xl font-bold">Refractor Prism X1</h1>
            <span className="text-2xl font-bold tabular-nums">\${total.toLocaleString()}</span>
          </div>
          <RatingControl label="Verified Reviews (318)" value={rating} onChange={setRating} />
          <ProductVariantSelector basePrice={649} groups={GROUPS} selected={selected} onChange={setSelected} />
          <div className="flex flex-wrap items-end gap-3">
            <NumericStepper label="Quantity" value={quantity} onChange={setQuantity} min={1} max={10} unit="qty" />
            <PrimaryButton>Add to Cart — \${total.toLocaleString()}</PrimaryButton>
            <SecondaryButton tone={wishlisted ? 'cobalt' : 'crystal'} onClick={() => setWishlisted((v) => !v)}>
              {wishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
            </SecondaryButton>
          </div>
        </div>
      </div>
      <Accordion
        allowMultiple
        items={[
          { id: 'specs', title: 'Optical Specifications', body: '14 elements in 11 groups, 685g magnesium chassis.' },
          { id: 'shipping', title: 'Shipping & Returns', body: 'Free next-day air courier with 30-day studio trial.' },
        ]}
      />
    </div>
  );
}`;

const NEW_PRODUCT_FORM_FULL_CODE = `import { useState } from 'react';
import {
  AlertBanner, CascadingSelect, ComboSplitButton, CreatableCombobox, CurrencyInput,
  FileDropzone, MeasurementUnitInput, NumericStepper, RichTextEditor, TextInput,
  type CurrencyInputValue, type MeasurementValue, type UploadedFileSummary,
} from '@refractor-ui/core';

export function MerchantNewProductForm() {
  const [title, setTitle] = useState('Prism 85mm Anamorphic Prime');
  const [sku, setSku] = useState('RF-ANA-85T14');
  const [taxonomy, setTaxonomy] = useState<string[]>(['optics', 'lenses']);
  const [price, setPrice] = useState<CurrencyInputValue>({ amount: 799, currency: 'USD' });
  const [weight, setWeight] = useState<MeasurementValue>({ amount: 840, unit: 'g' });
  const [stock, setStock] = useState(45);
  const [tag, setTag] = useState('flagship');
  const [description, setDescription] = useState('## Highlights\\nPrecision fluorite optics.');
  const [files, setFiles] = useState<UploadedFileSummary[]>([
    { name: 'prism-hero.webp', sizeBytes: 1_840_000, mimeType: 'image/webp' },
  ]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <header className="prism-slab p-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Create New Product</h1>
        <ComboSplitButton
          label="Publish Product"
          onPrimaryClick={() => setStatusMessage(\`Published \${title} (\${sku}) at \${price.amount} \${price.currency}.\`) }
          actions={[
            { id: 'draft', label: 'Save Draft', onSelect: () => setStatusMessage('Saved as staging draft.') },
            { id: 'schedule', label: 'Schedule Launch', onSelect: () => setStatusMessage('Scheduled for Monday 09:00 UTC.') },
          ]}
        />
      </header>
      {statusMessage ? (
        <AlertBanner severity="success" title="Inventory Updated" message={statusMessage} onDismiss={() => setStatusMessage(null)} />
      ) : null}
      <div className="prism-slab p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput label="Product Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextInput label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
        <CascadingSelect
          label="Taxonomy" value={taxonomy} onChange={(ids) => setTaxonomy(ids)}
          options={[{ id: 'optics', label: 'Optics', children: [{ id: 'lenses', label: 'Cinema Lenses' }] }]}
        />
        <CurrencyInput label="Unit Price" value={price} onChange={setPrice} />
        <MeasurementUnitInput
          label="Package Weight" value={weight} onChange={setWeight} convertOnUnitChange
          units={[{ id: 'g', label: 'g', factorToBase: 1 }, { id: 'kg', label: 'kg', factorToBase: 1000 }]}
        />
        <NumericStepper label="Initial Stock" value={stock} onChange={setStock} min={0} max={5000} unit="units" />
        <CreatableCombobox
          label="Merchandising Tag" value={tag} onChange={(next) => setTag(next)}
          defaultOptions={[{ value: 'flagship', label: 'Flagship Drop', group: 'Campaign' }]}
        />
        <FileDropzone
          files={files}
          onUploadFiles={(added) => setFiles((prev) => [...prev, ...added])}
          onRemoveFile={(name) => setFiles((prev) => prev.filter((f) => f.name !== name))}
        />
      </div>
      <RichTextEditor label="Product Description" value={description} onChange={setDescription} />
    </div>
  );
}`;

const CHECKOUT_FLOW_FULL_CODE = `import { useState } from 'react';
import {
  InternationalPhoneInput, PaymentCardInput, PrimaryButton, PromoCouponInput,
  StatefulAsyncButton, Stepper, TextInput, type AppliedCoupon, type PhoneInputValue,
} from '@refractor-ui/core';

const SUBTOTAL = 385;

export function OpticalCheckoutFlow() {
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState('Maya Lin');
  const [phone, setPhone] = useState<PhoneInputValue>({
    countryIso: 'US', dialCode: '+1', nationalDigits: '4155550199',
    formatted: '(415) 555-0199', e164: '+14155550199',
  });
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);

  const discount = coupon?.code === 'PRISM20' ? SUBTOTAL * 0.2 : 0;
  const total = (SUBTOTAL - discount) * 1.0825 + 15;

  const handleApplyPromo = (code: string): AppliedCoupon | string => {
    if (code === 'PRISM20') {
      const applied: AppliedCoupon = { code, label: '20% Launch Discount', discountText: '-20%' };
      setCoupon(applied);
      return applied;
    }
    return \`Code "\${code}" is invalid. Try PRISM20.\`;
  };

  return (
    <div className="space-y-5">
      <Stepper
        activeStepIndex={step} onStepClick={setStep}
        steps={[
          { id: 'shipping', title: 'Shipping', subtitle: 'Contact' },
          { id: 'payment', title: 'Payment', subtitle: 'Card' },
          { id: 'confirm', title: 'Confirm', subtitle: 'Pay' },
        ]}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="prism-slab p-5 space-y-4 min-w-0">
          {step === 0 ? (
            <>
              <TextInput label="Recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
              <InternationalPhoneInput label="Delivery Phone" value={phone} onChange={setPhone} />
              <PrimaryButton onClick={() => setStep(1)}>Continue to Payment</PrimaryButton>
            </>
          ) : step === 1 ? (
            <PaymentCardInput defaultCardholderName={recipient} onSubmit={() => setStep(2)} />
          ) : (
            <StatefulAsyncButton
              idleLabel={\`Pay $\${total.toFixed(2)} Now\`} loadingLabel="Authorizing..." successLabel="Payment Approved"
              onAction={async () => { await new Promise<void>((resolve) => setTimeout(resolve, 600)); }}
            />
          )}
        </div>
        <aside className="prism-slab p-5 space-y-4 min-w-0">
          <PromoCouponInput appliedCoupon={coupon} onApply={handleApplyPromo} onRemove={() => setCoupon(null)} />
          <div className="prism-well rounded-2xl p-4 flex items-center justify-between text-sm font-bold tabular-nums">
            <span>Total Due</span>
            <span>\${total.toFixed(2)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}`;

const SAAS_PRICING_FULL_CODE = `import { useState } from 'react';
import {
  Accordion, PricingTierMatrix, PromoCouponInput, RichSelectionCards,
  type AppliedCoupon, type BillingCycle, type PricingTier,
} from '@refractor-ui/core';

const GROWTH_TIER: PricingTier = {
  id: 'growth', name: 'Studio Growth', monthlyPrice: 79, annualPrice: 63, popular: true,
  features: [{ text: 'All 126 optical components & 5 themes', included: true }],
};

const TIERS: ReadonlyArray<PricingTier> = [
  { id: 'starter', name: 'Starter', monthlyPrice: 0, annualPrice: 0, features: [{ text: 'Core glass primitives', included: true }] },
  GROWTH_TIER,
  { id: 'enterprise', name: 'Enterprise Cloud', monthlyPrice: 249, annualPrice: 199, features: [{ text: 'SSO/SAML & 99.99% SLA', included: true }] },
];

const ADDON_COSTS: Record<string, number> = { vpc: 140, sre: 220, soc2: 95 };

export function SaasPricingConfigurator() {
  const [cycle, setCycle] = useState<BillingCycle>('annual');
  const [tierId, setTierId] = useState('growth');
  const [addOns, setAddOns] = useState<string[]>(['soc2']);
  const [credit, setCredit] = useState<AppliedCoupon | null>(null);

  const tier = TIERS.find((t) => t.id === tierId) ?? GROWTH_TIER;
  const base = cycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
  const extras = addOns.reduce((sum, id) => sum + (ADDON_COSTS[id] ?? 0), 0);
  const net = (base + extras) * (credit?.code === 'FOUNDER25' ? 0.75 : 1);

  return (
    <div className="space-y-6">
      <PricingTierMatrix tiers={TIERS} billingCycle={cycle} onBillingCycleChange={setCycle} onSelectTier={(chosen) => setTierId(chosen.id)} />
      <RichSelectionCards
        label="Enterprise Add-Ons" mode="multiple" columns={3} value={addOns} onChange={setAddOns}
        options={[
          { id: 'vpc', title: 'Dedicated VPC (+$140/mo)', badge: 'Security' },
          { id: 'sre', title: '24/7 SRE (+$220/mo)', badge: '99.99% SLA' },
          { id: 'soc2', title: 'SOC2 Audit Pack (+$95/mo)', badge: 'Compliance' },
        ]}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <PromoCouponInput
          appliedCoupon={credit}
          onApply={(code) => {
            if (code !== 'FOUNDER25') return 'Try FOUNDER25 for 25% startup credit.';
            const applied: AppliedCoupon = { code, label: 'Startup Credit', discountText: '25% off' };
            setCredit(applied);
            return applied;
          }}
          onRemove={() => setCredit(null)}
        />
        <div className="prism-slab p-4 flex items-center justify-between font-bold tabular-nums">
          <span>{tier.name} + {addOns.length} Add-Ons</span>
          <span>\${net.toFixed(2)}/mo</span>
        </div>
      </div>
      <Accordion
        items={[
          { id: 'faq-1', title: 'How does proration work?', body: 'Upgrades prorate immediately to the hour.' },
          { id: 'faq-2', title: 'Do you accept annual POs?', body: 'Yes, Net-30 invoicing is available on annual plans.' },
        ]}
      />
    </div>
  );
}`;

/* ============================================================================
 * Exported Commerce & Billing Example Screen Specifications
 * ============================================================================ */

export const COMMERCE_BILLING_EXAMPLES: ReadonlyArray<ExampleScreenSpec> = [
  {
    id: 'browse-products-catalog',
    title: 'Browse Products & Faceted Storefront',
    domain: 'commerce-billing',
    domainTitle: 'E-Commerce, Products & Billing',
    summary:
      'Complete optical storefront pairing predictive search suggestions, histogram price distribution filtering, category tag chips, rating-backed product cards, and a live slide-over shopping cart drawer.',
    devices: ['web', 'tablet', 'mobile'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'SearchWithSuggestions',
      'HistogramRangeSlider',
      'TagChip',
      'PrismCard',
      'RatingControl',
      'BadgeStatus',
      'PrimaryButton',
      'SecondaryButton',
      'ShoppingCartDrawer',
      'EmptyState',
      'AlertBanner',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Live multi-facet filtering synchronizes keyword search, category TagChips, and HistogramRangeSlider bounds in real time.',
      'Slide-over ShoppingCartDrawer tracks live bag count, automatic $25 bundle discounts over $300, tax calculation, and checkout confirmation.',
      'Container-responsive 1 -> 2 -> 3 column grid adapts cleanly from 390px mobile to wide desktop with zero horizontal overflow.',
      'One-click EmptyState recovery resets all active catalog filters cleanly.',
    ],
    fullCode: BROWSE_PRODUCTS_FULL_CODE,
    render: () => <BrowseProductsCatalogScreen />,
  },
  {
    id: 'product-detail-page',
    title: 'Product Detail Page (PDP) with 360° Orbit & Swatches',
    domain: 'commerce-billing',
    domainTitle: 'E-Commerce, Products & Billing',
    summary:
      'Flagship hardware PDP uniting breadcrumb navigation, interactive 360° optical orbit inspection, live color/memory/mount variant price deltas, quantity stepping, wishlist persistence, and expandable technical specs.',
    devices: ['web', 'tablet', 'mobile'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'Breadcrumbs',
      'Product360Viewer',
      'ProductVariantSelector',
      'RatingControl',
      'NumericStepper',
      'PrimaryButton',
      'SecondaryButton',
      'TagChip',
      'Accordion',
      'BadgeStatus',
      'AlertBanner',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Variant swatches dynamically recalculate unit price, multi-unit subtotal, SKU code, and the 360° viewer specimen title.',
      'Interactive Product360Viewer pairs pointer drag, keyboard arrows, and one-tap cardinal angle chips (0°, 90°, 180°, 270°).',
      'Purchase rail combines NumericStepper quantity controls, live-priced Add to Cart CTA, and stateful cobalt Wishlist toggle.',
      'Expandable Accordion organizes mechanical specs, express courier shipping, and box contents cleanly.',
    ],
    fullCode: PRODUCT_DETAIL_FULL_CODE,
    render: () => <ProductDetailPageScreen />,
  },
  {
    id: 'new-product-form',
    title: 'Create New Product / Merchant Inventory Form',
    domain: 'commerce-billing',
    domainTitle: 'E-Commerce, Products & Billing',
    summary:
      'Merchant catalog authoring console combining validated identity inputs, 3-tier cascading taxonomy, currency & auto-converting weight fields, creatable merchandising tags, rich markdown descriptions, gallery dropzone, and split publish controls.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'TextInput',
      'CascadingSelect',
      'CurrencyInput',
      'MeasurementUnitInput',
      'NumericStepper',
      'CreatableCombobox',
      'TagChip',
      'RichTextEditor',
      'FileDropzone',
      'ComboSplitButton',
      'BadgeStatus',
      'AlertBanner',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Live listing readiness inspector validates title, SKU, taxonomy depth, positive price, media uploads, and copy length continuously.',
      'MeasurementUnitInput automatically converts shipping weight across g, kg, and lb while CurrencyInput recalculates stocked inventory valuation.',
      'CreatableCombobox lets merchants attach preset or newly created merchandising tags rendered as removable emerald TagChips.',
      'ComboSplitButton supports immediate Publish, Save as Draft, Schedule Launch, and destructive template reset with inline validation feedback.',
    ],
    fullCode: NEW_PRODUCT_FORM_FULL_CODE,
    render: () => <NewProductFormScreen />,
  },
  {
    id: 'checkout-billing-flow',
    title: 'Mobile & Web Checkout, Payment & Promo Flow',
    domain: 'commerce-billing',
    domainTitle: 'E-Commerce, Products & Billing',
    summary:
      'Conversion-focused multi-step checkout combining clickable Stepper progression, international phone formatting, Luhn-checked payment card capture, live PRISM20 / FREESHIP promo calculation, and asynchronous payment authorization.',
    devices: ['mobile', 'web'],
    defaultPreviewFrame: 'mobile',
    componentsUsed: [
      'Stepper',
      'TextInput',
      'InternationalPhoneInput',
      'PaymentCardInput',
      'PromoCouponInput',
      'StatefulAsyncButton',
      'PrimaryButton',
      'SecondaryButton',
      'TagChip',
      'BadgeStatus',
      'AlertBanner',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Mobile-first single-column layout at 390px expands seamlessly into a split step form and sticky order summary well on Web.',
      'Applying PRISM20 (20% off) or FREESHIP ($15 off) immediately recalculates subtotal discount, estimated tax, and the Pay Now button amount.',
      'PaymentCardInput detects Visa/Mastercard/Amex networks and validates Luhn checksums before review confirmation.',
      'StatefulAsyncButton animates through authorization spinner to emerald approval and structured receipt confirmation.',
    ],
    fullCode: CHECKOUT_FLOW_FULL_CODE,
    render: () => <CheckoutBillingFlowScreen />,
  },
  {
    id: 'saas-pricing-subscriptions',
    title: 'SaaS Pricing Matrix & Add-On Configurator',
    domain: 'commerce-billing',
    domainTitle: 'E-Commerce, Products & Billing',
    summary:
      'High-converting SaaS pricing and subscription studio uniting annual/monthly PricingTierMatrix selection, multi-select enterprise add-on cards, startup credit promo codes, live invoice estimator, and billing FAQ accordion.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'PricingTierMatrix',
      'RichSelectionCards',
      'PromoCouponInput',
      'Accordion',
      'TagChip',
      'BadgeStatus',
      'PrimaryButton',
      'AlertBanner',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Synchronized billing estimator merges active PricingTierMatrix plan, monthly/annual toggle, enterprise add-ons, and startup credit percentages.',
      'Multi-select RichSelectionCards toggle Dedicated VPC, 24/7 SRE On-Call, and SOC2 Audit Pack with instant monthly cost updates.',
      'PromoCouponInput validates FOUNDER25 (25% off) and PRISM20 (20% off) startup credits with one-tap test chips.',
      'Billing & Procurement Accordion transparently answers proration, PO invoicing, and compliance deliverables.',
    ],
    fullCode: SAAS_PRICING_FULL_CODE,
    render: () => <SaasPricingSubscriptionsScreen />,
  },
];
