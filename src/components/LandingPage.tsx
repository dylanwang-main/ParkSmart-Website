/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import parkSmartLogoHd from '../assets/parksmart-logo-hd.png';
import { HeroDemo } from './HeroDemo';
import { PermitLot } from './PermitLot';
import { TimeLot } from './TimeLot';
import { LandingIntro } from './LandingIntro';

interface LandingPageProps {
  isExiting: boolean;
  onPlanClick: () => void;
}

const FAQ = [
  {
    q: 'Is this an official UCSD service?',
    a: 'No. ParkSmart is a student project and is not affiliated with UC San Diego.',
  },
  {
    q: 'Will it work with my permit?',
    a: 'You choose your permit type (A, B, S, SR, D, or V) and lots it cannot use are filtered out. Always check UCSD\'s permit pages for the final rules.',
  },
  {
    q: 'Is the data live?',
    a: 'No. Estimates come from past parking counts, not a live feed. Live status is something we are exploring.',
  },
  {
    q: 'Will it guarantee me a space?',
    a: 'No. It shows where you are most likely to find one, based on typical patterns. Lots can still be full.',
  },
  {
    q: 'Does it cost anything?',
    a: 'There is nothing to buy and nothing to sign up for.',
  },
  {
    q: 'Does it work for visitors?',
    a: 'Not yet. Visitor and daily-pay parking, with costs shown, is planned.',
  },
] as const;

const NEXT_UP = [
  'Visitor and daily-pay parking',
  'Color-coded availability',
  'Entrance photos',
  'Live status, if UCSD can share it',
  '"Did you find a spot?" check-ins',
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
  const heroRef = React.useRef<HTMLElement | null>(null);
  const [heroGone, setHeroGone] = React.useState(false);
  React.useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setHeroGone(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const handleSeeHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById('permit');
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
        <section ref={heroRef} className="lp-hero2 lp-dark" aria-label="ParkSmart introduction">
          <header className="lp-bar">
            <div className="lp-container lp-bar-inner">
              <span className="lp-wordmark">
                <img src={parkSmartLogoHd} alt="" className="lp-wordmark-logo" width={40} height={40} />
                ParkSmart
              </span>
              <button type="button" className="lp-btn lp-btn--yellow" onClick={onPlanClick}>
                Plan my parking
              </button>
            </div>
          </header>
          <div className="lp-container lp-hero2-grid">
            <div className="lp-hero2-copy">
              <h1 className="lp-h1">Know where to park before you get to campus.</h1>
              <p className="lp-lede">Tell it your trip. Get a first choice and a backup.</p>
              <div className="lp-top-actions">
                <button type="button" className="lp-btn lp-btn--yellow" onClick={onPlanClick}>
                  Plan my parking
                </button>
                <a href="#permit" className="lp-textlink" onClick={handleSeeHowItWorks}>
                  See how it thinks
                </a>
              </div>
              <p className="lp-fineprint">UCSD student prototype. Runs on sample data for now.</p>
            </div>
            <div className="lp-hero2-demo">{!introActive && <HeroDemo />}</div>
          </div>
        </section>

        <section id="permit" className="lp-block lp-block--yellow" aria-labelledby="permit-heading">
          <div className="lp-container">
            <div className="lp-block-head">
              <h2 id="permit-heading" className="lp-big">
                Your permit decides the map.
              </h2>
              <p className="lp-sub">Pick yours. Everything you can&apos;t use fades out.</p>
            </div>
            <PermitLot />
            <p className="lp-note">Simplified example lot. Real rules live on UCSD&apos;s permit pages.</p>
          </div>
        </section>

        <section className="lp-block lp-block--blue lp-dark" aria-labelledby="time-heading">
          <div className="lp-container">
            <div className="lp-block-head">
              <h2 id="time-heading" className="lp-big">
                Drag the clock.
              </h2>
              <p className="lp-sub">Watch a busy lot fill up through the day.</p>
            </div>
            <TimeLot />
            <p className="lp-note">Example pattern, not real UCSD data.</p>
          </div>
        </section>

        <section className="lp-block lp-block--navy lp-dark" aria-labelledby="honest-heading">
          <div className="lp-container lp-honest">
            <div>
              <h2 id="honest-heading" className="lp-big lp-big--yellow">
                A forecast, not a promise.
              </h2>
              <ul className="lp-marks">
                <li>Built on past counts, not live ones</li>
                <li>Detailed data covers the first two weeks of each quarter</li>
                <li>No reservations, no payments</li>
              </ul>
            </div>
            <div className="lp-next">
              <h3 className="lp-next-title">Coming next</h3>
              <ul className="lp-marks lp-marks--light">
                {NEXT_UP.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-block lp-block--paper" aria-labelledby="faq-heading">
          <div className="lp-container lp-faq">
            <h2 id="faq-heading" className="lp-big lp-big--navy">
              Quick answers.
            </h2>
            <div className="lp-faq-list">
              {FAQ.map((item) => (
                <details key={item.q} className="lp-faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <footer className="lp-footer lp-dark">
          <div className="lp-container lp-footer-inner">
            <div>
              <p className="lp-footer-text">
                Team lead: Yra. Built by Vivaan, Hanrong, Dylan, and Daira for UCSD DS3, Fall 2026.
              </p>
              <p className="lp-footer-text lp-footer-text--note">A student project, not an official UCSD service.</p>
            </div>
            <button type="button" className="lp-btn lp-btn--yellow" onClick={onPlanClick}>
              Plan my parking
            </button>
          </div>
        </footer>
      </div>

      <div className={`lp-sticky${heroGone && !introActive ? ' lp-sticky--on' : ''}`} aria-hidden={!heroGone}>
        <button type="button" className="lp-btn lp-btn--yellow" tabIndex={heroGone ? 0 : -1} onClick={onPlanClick}>
          Plan my parking
        </button>
      </div>
    </div>
  );
};
