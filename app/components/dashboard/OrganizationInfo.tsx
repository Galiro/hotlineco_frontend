import { useAuth } from '../../lib/useAuth';
import type { Org } from '../../lib/useOrg';

interface OrganizationInfoProps {
  currentOrg: Org;
  user: any;
}

export function OrganizationInfo({ currentOrg, user }: OrganizationInfoProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {currentOrg.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Plan: {currentOrg.plan}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Created: {new Date(currentOrg.created_at).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Owner: {user?.email}
          </p>
        </div>
      </div>
    </div>
  );
}
