/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import parkSmartLogoHd from '../assets/parksmart-logo-hd.png';
import plannerForm from '../assets/planner-form.png';
import plannerResult from '../assets/planner-result.png';
import { LandingIntro } from './LandingIntro';

interface LandingPageProps {
  isExiting: boolean;
  onPlanClick: () => void;
}

const PLANNED = [
  'Visitor and daily-pay parking, with costs shown',
  'Color-coded availability and larger walking times',
  'Entrance photos for parking structures',
] as const;

const EXPLORING = [
  'Live parking status, if UCSD can share it',
  'A "Did you find a spot?" check-in to improve the estimates',
] as const;

/** The intro plays once per page load, not every time someone returns from the planner. */
let introPlayedThisLoad = false;

const shouldPlayIntro = (): boolean => {
  if (introPlayedThisLoad) return false;
  introPlayedThisLoad = true;
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
};

export const LandingPage: React.FC<LandingPageProps> = ({ isExiting, onPlanClick }) => {
  const [introActive, setIntroActive] = React.useState(shouldPlayIntro);
  const handleSeeHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById('how-it-works');
    if (!target) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div
      className={`ps-landing${isExiting ? ' ps-landing--exiting' : ''}${introActive ? ' ps-landing--intro' : ''}`}
    >
      {introActive && <LandingIntro onDone={() => setIntroActive(false)} />}

      <div className="lp-doc">
        <header className="lp-bar">
          <div className="lp-container lp-bar-inner">
            <span className="lp-wordmark">
              <img src={parkSmartLogoHd} alt="" className="lp-wordmark-logo" width={40} height={40} />
              ParkSmart
            </span>
            <button type="button" className="lp-btn lp-btn--asphalt" onClick={onPlanClick}>
              Plan my parking
            </button>
          </div>
        </header>

        <main>
          <section className="lp-top" aria-label="ParkSmart introduction">
            <div className="lp-container lp-top-grid">
              <div>
                <h1 className="lp-h1">Know where to park before you get to campus.</h1>
                <p className="lp-lede">
                  Tell ParkSmart where you&apos;re going, when you&apos;ll arrive, and which permit you have. It picks
                  a first-choice lot and a backup, and says why.
                </p>
                <div className="lp-top-actions">
                  <button type="button" className="lp-btn lp-btn--asphalt" onClick={onPlanClick}>
                    Plan my parking
                  </button>
                  <a href="#how-it-works" className="lp-textlink" onClick={handleSeeHowItWorks}>
                    How it works
                  </a>
                </div>
                <p className="lp-fineprint">
                  A student prototype for UC San Diego. It runs on sample data until the real data is connected.
                </p>
              </div>
              <figure className="lp-top-shot">
                <img
                  src={plannerResult}
                  alt="A ParkSmart result: Lot P503, a 5 minute walk to Geisel Library, usually open, with the reason it was chosen."
                  width={708}
                  height={826}
                />
              </figure>
            </div>
          </section>

          <section className="lp-sec" aria-labelledby="problem-heading">
            <div className="lp-container lp-sec-grid">
              <h2 id="problem-heading" className="lp-h2">
                The problem
              </h2>
              <p className="lp-statement">
                Most drivers on campus find out two things after they arrive: whether their permit works in that lot,
                and whether there is any room. ParkSmart answers both before you leave.
              </p>
            </div>
          </section>

          <section id="how-it-works" className="lp-sec" aria-labelledby="how-heading">
            <div className="lp-container lp-sec-grid">
              <h2 id="how-heading" className="lp-h2">
                How it works
              </h2>
              <div className="lp-walk">
                <div className="lp-walk-row">
                  <div className="lp-steps">
                    <div>
                      <h3 className="lp-h3">You describe the trip</h3>
                      <p className="lp-body">
                        Pick a destination, a day and time, and your permit (A, B, S, SR, D, or V). Choose whether you
                        would rather walk less or find more space, and how far you are willing to walk.
                      </p>
                    </div>
                    <div>
                      <h3 className="lp-h3">It answers with a pick and a reason</h3>
                      <p className="lp-body">
                        Lots your permit can&apos;t use are removed. The rest are ranked by how much space is usually
                        open at that time and how far you would walk. You get a first choice, a backup, and a plain
                        explanation of each.
                      </p>
                      <p className="lp-caption">Screens show sample data.</p>
                    </div>
                  </div>
                  <figure className="lp-shot lp-shot--form">
                    <img
                      src={plannerForm}
                      alt="The ParkSmart planner form with destination, arrival date and time, permit type, priority, and maximum walk."
                      width={766}
                      height={902}
                    />
                  </figure>
                </div>
              </div>
            </div>
          </section>

          <section className="lp-sec" aria-labelledby="data-heading">
            <div className="lp-container lp-sec-grid">
              <h2 id="data-heading" className="lp-h2">
                What the estimates rest on
              </h2>
              <div className="lp-prose">
                <p className="lp-body">
                  Public information only: past parking counts by lot and time of day, lot capacities, UCSD&apos;s
                  published permit rules, and campus map data. There is no live feed yet.
                </p>
                <p className="lp-body">
                  The detailed counts mostly cover the first two weeks of each quarter, so estimates for later weeks
                  are less certain. Read every number as a typical day, not a promise. ParkSmart does not reserve
                  spaces or take payments.
                </p>
              </div>
            </div>
          </section>

          <section className="lp-sec" aria-labelledby="next-heading">
            <div className="lp-container lp-sec-grid">
              <h2 id="next-heading" className="lp-h2">
                What&apos;s next
              </h2>
              <div className="lp-next">
                <div>
                  <h3 className="lp-h3">Planned</h3>
                  <ul className="lp-list">
                    {PLANNED.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="lp-h3">Still exploring</h3>
                  <ul className="lp-list">
                    {EXPLORING.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="lp-footer">
          <div className="lp-container lp-footer-inner">
            <div>
              <p className="lp-footer-text">
                Team lead: Yra. Built by Vivaan, Hanrong, Dylan, and Daira for UCSD DS3, Fall 2026.
              </p>
              <p className="lp-footer-text lp-footer-text--note">
                A student project, not an official UCSD service.
              </p>
            </div>
            <button type="button" className="lp-btn lp-btn--yellow" onClick={onPlanClick}>
              Plan my parking
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
