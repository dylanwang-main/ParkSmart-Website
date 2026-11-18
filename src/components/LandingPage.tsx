/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RECOMMENDATION_SOURCE } from '../config';
import parkSmartLogoHd from '../assets/parksmart-logo-hd.png';
import { HeroDemo } from './HeroDemo';
import { PermitLot } from './PermitLot';
import { Pipeline } from './Pipeline';
import { ScoreMix } from './ScoreMix';
import { TimeLot } from './TimeLot';
import { LandingIntro } from './LandingIntro';

/** The hosted build talks to the AWS backend; other builds (previews) use labeled sample data. */
const LIVE = RECOMMENDATION_SOURCE === 'api';

interface LandingPageProps {
  isExiting: boolean;
  onPlanClick: () => void;
}

const LIMITS = [
  {
    lead: 'Past counts, not live ones.',
    text: 'There is no live feed, so a lot can be full when the estimate says it is usually open.',
  },
  {
    lead: 'Mostly the first two weeks of each quarter.',
    text: 'The detailed counts cover little else, and the model has not been checked across all ten weeks.',
  },
  {
    lead: 'Simplified permit rules.',
    text: LIVE
      ? 'Ordinary stalls only. Reserved, accessible, and A 24/7 stalls are left out, options that need holiday verification are not shown, and only your arrival moment is checked.'
      : 'Ordinary stalls only. Reserved, accessible, and A 24/7 stalls are left out, holidays count as weekdays, and only your arrival moment is checked.',
  },
  {
    lead: 'Scoring weights are starting points.',
    text: 'The default is a 65/35 mix. The other two presets still need review with experts.',
  },
  {
    lead: LIVE ? 'Historical estimates.' : 'Sample data in this preview.',
    text: LIVE
      ? 'Results come from past survey patterns through the hosted backend. Walk times are estimates for now.'
      : 'The numbers you see here are samples. The hosted app uses the real backend.',
  },
  {
    lead: 'No promises.',
    text: 'No reservations, no payments, and not an official UCSD service.',
  },
] as const;

const FAQ = [
  {
    q: 'Is this an official UCSD service?',
    a: 'No. ParkSmart is a student project and is not affiliated with UC San Diego.',
  },
  {
    q: 'Will it work with my permit?',
    a: 'You choose your permit type (A, B, S, SR, D, or V) and lots it cannot use are filtered out. Your permit letter is on your UCSD permit or in your parking account. Always check UCSD\'s permit pages for the final rules.',
  },
  {
    q: 'Is the data live?',
    a: 'No. Estimates come from past parking counts, not a live feed.',
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
    a: 'Partly. You can pick V (Visitor / Daily Pay) and see where visitors may park, but prices and pay-station rules are not covered. Check UCSD\'s visitor parking page before you go.',
  },
] as const;

/** The intro plays once per browser session, not on every reload or return from the planner. */
const INTRO_SEEN_KEY = 'parksmart:intro-seen';
let introPlayedThisLoad = false;

const shouldPlayIntro = (): boolean => {
  if (introPlayedThisLoad) return false;
  introPlayedThisLoad = true;
  try {
    if (window.sessionStorage.getItem(INTRO_SEEN_KEY)) return false;
  } catch {
    /* storage blocked: fall through and play once per load */
  }
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  } catch {
    /* no matchMedia: play it */
  }
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
  return true;
};

/** Public links for judges and teammates. All verified targets in this repo's docs. */
const LINKS = [
  { label: 'GitHub', href: 'https://github.com/yraclimaco/parksmart' },
  { label: 'Design doc', href: 'https://github.com/yraclimaco/parksmart/blob/main/docs/DesignDoc.md' },
  { label: 'UCSD QPASS surveys', href: 'https://rmp-wapps.ucsd.edu/TS/Survey/QPASS/Contents.html' },
  { label: 'Imagery: USGS NAIP', href: 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer' },
  { label: 'Map: OpenFreeMap, OpenStreetMap', href: 'https://openfreemap.org/' },
] as const;

/** Facts from ParkSmart's own dataset notes (docs/issue11_findings.md, docs/issue18_predictions.md). */
const PROBLEM_FACTS = [
  {
    lead: 'UCSD publishes survey counts, not a live feed.',
    text: 'UCSD Transportation posts QPASS survey workbooks after each quarter. Nothing tells you what is open right now.',
  },
  {
    lead: 'The detailed counts are early-quarter snapshots.',
    text: 'Surveys mostly cover the first weeks of a quarter, and several years and quarters are missing from the public archive.',
  },
  {
    lead: 'ParkSmart turns 76,102 survey readings into a forecast.',
    text: 'They span 86 facilities, from June 2018 to October 2026. Forecasts are typical conditions, not today\'s.',
  },
] as const;

const NEXT_ITEMS = [
  { name: 'Hosted planner and backend', status: LIVE ? 'Live' : 'Live in the hosted app', text: 'Historical estimates on AWS. Walk times are estimates for now.' },
  { name: 'Trip alerts', status: 'In progress', text: 'Weather and construction notes near your lot. Informational, never used to rank.' },
  { name: 'Mobile app', status: 'Planned', text: 'The same planner as an iOS app.' },
  { name: 'Live lot counts', status: 'Planned', text: 'Only if a validated source exists, always shown with its retrieval time.' },
] as const;

const SCREEN_COUNT = 9;
const TOP_LIMITS = 3;

export const LandingPage: React.FC<LandingPageProps> = ({ isExiting, onPlanClick }) => {
  const [introActive, setIntroActive] = React.useState(shouldPlayIntro);
  const heroRef = React.useRef<HTMLElement | null>(null);
  const [heroGone, setHeroGone] = React.useState(false);
  const [screen, setScreen] = React.useState(1);
  const docRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const root = docRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setScreen(Number((e.target as HTMLElement).dataset.screen));
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    root.querySelectorAll('[data-screen]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
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

      <div className="lp-doc" ref={docRef}>
        <section ref={heroRef} data-screen="1" className="lp-hero2 lp-dark" aria-label="ParkSmart introduction">
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
              <div className="lp-result" role="group" aria-label="Example result">
                <p className="lp-result-tag">Example result</p>
                <p className="lp-result-main">
                  <strong>Lot P503</strong> · 5 min walk · usually open
                </p>
                <p className="lp-result-backup">Backup: Lot P510</p>
              </div>
              <p className="lp-fineprint">{LIVE ? 'UCSD student prototype. Uses historical survey estimates, not live data.' : 'UCSD student prototype. This preview runs on sample data.'}</p>
            </div>
            <div className="lp-hero2-demo">{!introActive && <HeroDemo />}</div>
          </div>
        </section>

        <section data-screen="2" className="lp-block lp-block--paper" aria-labelledby="problem-heading">
          <div className="lp-container lp-faq">
            <h2 id="problem-heading" className="lp-big lp-big--navy">
              Nobody tells you what is open.
            </h2>
            <ul className="lp-fact-list">
              {PROBLEM_FACTS.map((item) => (
                <li key={item.lead}>
                  <strong>{item.lead}</strong> {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="permit" data-screen="3" className="lp-block lp-block--yellow" aria-labelledby="permit-heading">
          <div className="lp-container">
            <div className="lp-block-head">
              <h2 id="permit-heading" className="lp-big">
                Your permit decides the map.
              </h2>
              <div className="lp-sub-stack">
                <p className="lp-sub">Pick yours. Everything you can&apos;t use fades out.</p>
                <p className="lp-permit-help">Not sure which one you have? The letter is printed on your UCSD permit and listed in your parking account.</p>
              </div>
            </div>
            <PermitLot />
            <p className="lp-note">Simplified example lot. Real rules live on UCSD&apos;s permit pages.</p>
          </div>
        </section>

        <section data-screen="4" className="lp-block lp-block--blue lp-dark" aria-labelledby="time-heading">
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

        <section data-screen="5" className="lp-block lp-block--hood lp-dark" aria-labelledby="hood-heading">
          <div className="lp-container">
            <div className="lp-block-head">
              <h2 id="hood-heading" className="lp-big">
                Under the hood.
              </h2>
              <p className="lp-sub">Where a recommendation comes from, and how far along each part is.</p>
            </div>
            <Pipeline />
            <div className="lp-mix">
              <h3 className="lp-h3-light">How a pick is chosen</h3>
              <ScoreMix />
            </div>
          </div>
        </section>

        <section data-screen="6" className="lp-block lp-block--blue lp-dark" aria-labelledby="evidence-heading">
          <div className="lp-container lp-faq">
            <h2 id="evidence-heading" className="lp-big">
              Checked against what happened.
            </h2>
            <div className="lp-evidence">
              <p className="lp-evidence-num">
                21 <span>points off, on average</span>
              </p>
              <p className="lp-evidence-text">
                On 11,665 held-out survey readings from the newest dates, the forecast missed the actual open
                share by 21.0 percentage points on average (MAE). When a lot was nearly full, the miss was 13.7 points.
                The forecast is a historical average per lot, weekday and time. Scores come from ParkSmart&apos;s own
                test split; expert review is still planned.
              </p>
            </div>
          </div>
        </section>

        <section data-screen="7" className="lp-block lp-block--caution" aria-labelledby="limits-heading">
          <div className="lp-stripe" aria-hidden="true" />
          <div className="lp-container lp-limits">
            <h2 id="limits-heading" className="lp-big lp-big--navy">
              A forecast, not a promise.
            </h2>
            <div>
              <ul className="lp-limit-list">
                {LIMITS.slice(0, TOP_LIMITS).map((item) => (
                  <li key={item.lead}>
                    <strong>{item.lead}</strong> {item.text}
                  </li>
                ))}
              </ul>
              <details className="lp-more">
                <summary>More limits</summary>
                <ul className="lp-limit-list">
                  {LIMITS.slice(TOP_LIMITS).map((item) => (
                    <li key={item.lead}>
                      <strong>{item.lead}</strong> {item.text}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
          <div className="lp-stripe" aria-hidden="true" />
        </section>

        <section data-screen="8" className="lp-block lp-block--yellow" aria-labelledby="next-heading">
          <div className="lp-container lp-faq">
            <h2 id="next-heading" className="lp-big">
              What is next.
            </h2>
            <ul className="lp-next-list">
              {NEXT_ITEMS.map((item) => (
                <li key={item.name}>
                  <span className="lp-status">{item.status}</span>
                  <strong>{item.name}</strong> {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section data-screen="9" className="lp-block lp-block--paper" aria-labelledby="faq-heading">
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
              <nav className="lp-footer-links" aria-label="Project links and sources">
                {LINKS.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label}
                  </a>
                ))}
              </nav>
            </div>
            <button type="button" className="lp-btn lp-btn--yellow" onClick={onPlanClick}>
              Plan my parking
            </button>
          </div>
        </footer>
      </div>

      {!introActive && (
        <p className="lp-counter" aria-label={`Screen ${screen} of ${SCREEN_COUNT}`}>
          {screen} of {SCREEN_COUNT}
        </p>
      )}

      <div className={`lp-sticky${heroGone && !introActive ? ' lp-sticky--on' : ''}`} aria-hidden={!heroGone}>
        <button type="button" className="lp-btn lp-btn--yellow" tabIndex={heroGone ? 0 : -1} onClick={onPlanClick}>
          Plan my parking
        </button>
      </div>
    </div>
  );
};
