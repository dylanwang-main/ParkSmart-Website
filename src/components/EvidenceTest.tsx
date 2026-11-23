/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

/**
 * The accuracy screen, laid out like the other split screens: heading and intro on the left, one
 * result card on the right, the caveat under the intro. Figures are the supported holdout results in
 * docs/issue18_predictions.md (backend repo): 11,665 readings from 2025-10-08 on, 21.047 pp mean
 * absolute error; nearly full (10% or less open): 13.729 pp, forecasts averaging 14.907% open
 * against 2.193% actual (overestimates); 4,458 readings with no supported estimate. The holdout was
 * inspected during development and the live model is refit on all data, so the copy calls this an
 * earlier evaluation. tests/test_website_facts.py checks these strings.
 */
export const EvidenceTest: React.FC<{ heading: React.ReactNode }> = ({ heading }) => (
  <>
    <div className="lp-split-head">
      {heading}
      <p className="lp-sub et-sub">
        Tested on UCSD&apos;s newest hand counts (October 2025 on), held out from the forecasts: 11,665 counts in
        all.
      </p>
    </div>

    <div className="et" role="group" aria-label="Test results">
      <p className="et-label">Average miss</p>
      <p className="et-big">Off by 21 points</p>
      <p className="et-explain">A lot forecast at 60% open was, on average, off by 21 percentage points.</p>

      <ul className="et-stats">
        <li>
          <strong className="et-num">15% vs 2%</strong>
          <span>
            Nearly full lots look more open than they are: average forecast vs. real share open, off by about 14
            points.
          </span>
        </li>
        <li>
          <strong className="et-num">4,458</strong>
          <span>counts had no past survey at that time, so ParkSmart showed no forecast instead of guessing.</span>
        </li>
      </ul>
    </div>

    <p className="lp-note lp-split-note lp-example">
      An earlier evaluation: we looked at these counts during development, and today&apos;s model is refit on all
      data. A guide, not a guarantee.
    </p>
  </>
);
