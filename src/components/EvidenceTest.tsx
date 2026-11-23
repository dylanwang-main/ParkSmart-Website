/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * The accuracy screen: one result, two facts and the caveat. Figures are the supported holdout
 * results in docs/issue18_predictions.md (backend repo): 11,665 readings from 2025-10-08 on,
 * 21.047 pp mean absolute error; nearly full (10% or less open): 13.729 pp, forecasts averaging
 * 14.9% open against 2.2% actual (overestimates); 4,458 readings with no supported estimate.
 * The holdout was inspected during development and the live model is refit on all data, so the
 * copy calls this an earlier evaluation. tests/test_website_facts.py checks these strings.
 */
export const EvidenceTest: React.FC<{ heading: React.ReactNode }> = ({ heading }) => (
  <div className="et">
    <div className="et-head">
      {heading}
      <p className="et-intro">
        We checked the forecasts against UCSD&apos;s newest hand counts (October 2025 on), which were held out
        from the forecasts: 11,665 counts in all.
      </p>
    </div>

    <div className="et-bottom">
      <div className="et-result">
        <p className="et-big">
          Off by 21 points <span>on average</span>
        </p>
        <p className="et-explain">
          A lot forecast at 60% open was, on average, off by 21 percentage points from the real count.
        </p>
      </div>

      <ul className="et-facts">
        <li>
          <strong>Nearly full lots look more open than they are.</strong> Forecasts averaged about 15% open
          against about 2% in reality (off by about 14 points).
        </li>
        <li>
          <strong>No guessing.</strong> For 4,458 counts with no past survey at that time, ParkSmart showed no
          forecast.
        </li>
      </ul>
    </div>

    <p className="et-note lp-example">
      An earlier evaluation: we looked at these counts during development, and today&apos;s model is refit on all
      data. A guide, not a guarantee.
    </p>
  </div>
);
