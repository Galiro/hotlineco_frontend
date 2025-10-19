import type { PhoneNumber } from '../../lib/stores/dashboardStore';

interface AvailablePhoneNumbersProps {
  phoneNumbers: PhoneNumber[];
  hotlines: any[];
}

export function AvailablePhoneNumbers({ phoneNumbers, hotlines }: AvailablePhoneNumbersProps) {
  const usedPhoneIds = hotlines.map(h => h.phone_number_id).filter(Boolean);
  const availableNumbers = phoneNumbers.filter(pn => !usedPhoneIds.includes(pn.id));
  
  if (availableNumbers.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        📞 Available Phone Numbers
      </h3>
      <div className="space-y-2">
        {availableNumbers.map((number) => (
          <div key={number.id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  {number.e164}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Region: {number.region} • Status: {number.status}
                </p>
              </div>
              <div className="px-2 py-1 rounded text-xs font-medium bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                Available
              </div>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              Ready to be assigned to a new hotline
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
