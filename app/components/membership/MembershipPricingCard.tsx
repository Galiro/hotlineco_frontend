interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price_monthly_cents: number;
  price_yearly_cents: number | null;
  max_hotlines: number;
  max_phone_numbers: number;
  max_audio_files_per_hotline: number;
  max_audio_storage_mb: number;
  max_minutes_monthly: number;
  features: string[];
  sort_order: number;
}

interface MembershipPricingCardProps {
  plan: PricingPlan;
  onSelect: () => void;
  isSelecting: boolean;
  isPopular?: boolean;
  billingCycle?: 'monthly' | 'yearly';
}

export function MembershipPricingCard({ 
  plan, 
  onSelect, 
  isSelecting, 
  isPopular = false,
  billingCycle = 'monthly'
}: MembershipPricingCardProps) {
  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const formatStorage = (mb: number) => {
    if (mb >= 1000) {
      return `${(mb / 1000).toFixed(1)}GB`;
    }
    return `${mb}MB`;
  };

  const formatMinutes = (minutes: number) => {
    if (minutes >= 1000) {
      return `${(minutes / 1000).toFixed(1)}K`;
    }
    return `${minutes}`;
  };

  const getYearlyDiscount = () => {
    if (!plan.price_yearly_cents || plan.price_monthly_cents === 0) return 0;
    const monthlyYearly = plan.price_monthly_cents * 12;
    const discount = ((monthlyYearly - plan.price_yearly_cents) / monthlyYearly) * 100;
    return Math.round(discount);
  };

  const discount = getYearlyDiscount();

  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 ${
      isPopular ? 'ring-2 ring-blue-500 scale-105' : ''
    }`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {plan.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {plan.description}
        </p>
        
        <div className="mb-4">
          <div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              ${formatPrice(billingCycle === 'yearly' && plan.price_yearly_cents ? plan.price_yearly_cents : plan.price_monthly_cents)}
              <span className="text-lg font-normal text-gray-600 dark:text-gray-400">
                /{billingCycle === 'yearly' ? 'year' : 'month'}
              </span>
            </div>
            {billingCycle === 'yearly' && plan.price_yearly_cents && discount > 0 && (
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                Save {discount}% vs monthly
              </div>
            )}
            {billingCycle === 'monthly' && plan.price_yearly_cents && discount > 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Save {discount}% with yearly billing
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Hotlines</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {plan.max_hotlines === 50 ? '50+' : plan.max_hotlines}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Phone Numbers</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {plan.max_phone_numbers === 50 ? '50+' : plan.max_phone_numbers}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Audio Files per Hotline</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {plan.max_audio_files_per_hotline === 100 ? '100+' : plan.max_audio_files_per_hotline}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Storage</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatStorage(plan.max_audio_storage_mb)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Monthly Minutes</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatMinutes(plan.max_minutes_monthly)}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-8">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300 text-sm">
              {feature}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={onSelect}
        disabled={isSelecting}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
          isPopular
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-700 dark:hover:bg-gray-600'
        } ${
          isSelecting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isSelecting ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
            Processing...
          </div>
        ) : (
          'Choose Plan'
        )}
      </button>
    </div>
  );
}
