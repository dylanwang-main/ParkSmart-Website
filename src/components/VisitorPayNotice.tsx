/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Receipt } from 'lucide-react';
import { VISITOR_RATES_URL, formatRate, visitorPricingAt } from '../data/visitorRates.ts';

interface VisitorPayNoticeProps {
  /** Arrival time the search was for. */
  arrival: Date;
}

/**
 * Separate "Visitor daily pay" panel for V searches, so pay-to-park rates are not mixed
 * up with permit parking. Rates are the published La Jolla campus visitor rates.
 */
export const VisitorPayNotice: React.FC<VisitorPayNoticeProps> = ({ arrival }) => {
  const pricing = visitorPricingAt(arrival);
  return (
    <section aria-label="Visitor daily pay" className="p-3 rounded-xl bg-white border border-line space-y-1.5">
      <h4 className="flex items-center gap-1.5 text-[13px] font-bold text-navy">
        <Receipt className="w-4 h-4" aria-hidden="true" /> Visitor daily pay
      </h4>
      <p className="text-[13px] text-ink">
        <span className="font-semibold">{formatRate(pricing)}</span>
        <span className="text-muted">
          {pricing.tier === 'evening_weekend' ? ' (after 5 p.m. weekdays and weekends)' : ' (weekday daytime)'}
        </span>
      </p>
      {!pricing.inPayHours && (
        <p className="text-[12px] font-medium text-[#835300]">
          This arrival is outside posted pay hours (main campus 7 a.m.–9 p.m. weekdays, 10:30 a.m.–9 p.m.
          weekends). Check posted signs.
        </p>
      )}
      <p className="text-[11px] text-muted leading-snug">
        Pay at a pay station or with ParkMobile; fees are waived on university holidays. La Jolla campus
        rates only.{' '}
        <a href={VISITOR_RATES_URL} target="_blank" rel="noopener noreferrer" className="underline text-navy">
          Current UCSD rates
        </a>
      </p>
    </section>
  );
};
