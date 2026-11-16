/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import parkSmartLogoHd from '../assets/parksmart-logo-hd.png';

interface LandingPageProps {
  isExiting: boolean;
  onPlanClick: () => void;
}

interface StallSpec {
  id: number;
  mobileVisible: boolean;
  variant: 'standard' | 'first' | 'backup';
  carTint?: '#2C4468' | '#3A5679' | '#4A6690';
  arriving?: boolean;
  plate?: {
    label: string;
    tone: 'yellow' | 'white';
  };
}

const STALLS: readonly StallSpec[] = [
  { id: 1, mobileVisible: false, variant: 'standard', carTint: '#3A5679' },
  { id: 2, mobileVisible: false, variant: 'standard', carTint: '#2C4468' },
  { id: 3, mobileVisible: true, variant: 'standard', carTint: '#4A6690' },
  {
    id: 4,
    mobileVisible: true,
    variant: 'first',
    arriving: true,
    plate: { label: 'First choice', tone: 'yellow' },
  },
  {
    id: 5,
    mobileVisible: true,
    variant: 'backup',
    plate: { label: 'Backup', tone: 'white' },
  },
  { id: 6, mobileVisible: true, variant: 'standard', carTint: '#2C4468' },
  { id: 7, mobileVisible: false, variant: 'standard' },
];

const HOW_IT_WORKS_STEPS = [
  {
    number: '1',
    title: 'Tell us your trip',
    description: 'Add your destination, arrival time, permit type, and starting point.',
  },
  {
    number: '2',
    title: 'We filter and estimate',
    description:
      "Lots your permit can't use are removed. The rest are scored on historical availability, driving time, and walking time.",
  },
  {
    number: '3',
    title: 'Get a recommendation',
    description: 'See a first choice, a backup, and a plain explanation of why.',
  },
] as const;

const WHY_QUESTIONS = ['Can my permit park here?', 'Will it be full when I arrive?'] as const;

const WHAT_YOU_GET_ITEMS = [
  {
    label: 'Permit-safe results',
    description: "Lots your permit can't use never appear.",
  },
  {
    label: 'Expected availability',
    description: 'Based on historical public parking data.',
  },
  {
    label: 'Drive and walk time',
    description: 'See the whole trip, not just the lot.',
  },
  {
    label: 'Visible reasoning',
    description: 'Every pick explains why it was chosen.',
  },
] as const;

/**
 * Top-down simplified car SVG (rounded rectangle body + darker windshield & rear window blocks).
 */
const TopDownCar: React.FC<{ bodyColor: string; windowColor: string; className?: string }> = ({
  bodyColor,
  windowColor,
  className,
}) => (
  <svg
    viewBox="0 0 72 118"
    className={className ? `lp-car ${className}` : 'lp-car'}
    aria-hidden="true"
  >
    <rect x="4" y="4" width="64" height="110" rx="16" fill={bodyColor} />
    <rect x="13" y="25" width="46" height="22" rx="6" fill={windowColor} />
    <rect x="15" y="76" width="42" height="16" rx="5" fill={windowColor} />
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({ isExiting, onPlanClick }) => {
  const handleSeeHowItWorks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById('how-it-works');
    if (!target) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className={`ps-landing${isExiting ? ' ps-landing--exiting' : ''}`}>
      {/* SECTION 1: HERO */}
      <section className="lp-hero" aria-label="ParkSmart introduction">
        <header className="lp-topbar">
          <div className="lp-container lp-topbar-inner">
            <span className="lp-wordmark">
              <img src={parkSmartLogoHd} alt="" className="lp-wordmark-logo" width={52} height={52} />
              ParkSmart
            </span>
            <button type="button" className="lp-btn lp-btn--yellow" onClick={onPlanClick}>
              Plan my parking
            </button>
          </div>
        </header>

        <div className="lp-hero-body">
          <div className="lp-container">
            <h1 className="lp-h1">Know where to park before you get to campus.</h1>
            <p className="lp-subhead">
              Tell ParkSmart where you&apos;re going, when you&apos;ll arrive, and your permit type. It recommends a
              first-choice lot and a backup, based on historical parking data.
            </p>
            <div className="lp-hero-actions">
              <button type="button" className="lp-btn lp-btn--yellow" onClick={onPlanClick}>
                Plan my parking
              </button>
              <a href="#how-it-works" onClick={handleSeeHowItWorks} className="lp-hero-link">
                See how it works
              </a>
            </div>
          </div>
        </div>

        {/* SIGNATURE MOMENT: Full-width row of 7 parking stalls */}
        <div className="lp-lot-stage" aria-hidden="true">
          <div className="lp-stalls-grid">
            {STALLS.map((stall) => (
              <div
                key={stall.id}
                className={`lp-stall lp-stall--${stall.variant}${
                  stall.mobileVisible ? '' : ' lp-stall--outer'
                }`}
              >
                <div className="lp-plate-slot">
                  {stall.plate && (
                    <span className={`lp-sign-plate lp-sign-plate--${stall.plate.tone}`}>
                      {stall.plate.label}
                    </span>
                  )}
                </div>

                <div className="lp-stall-bay">
                  {stall.variant === 'first' && <div className="lp-stall-fill" />}

                  <svg
                    className="lp-stall-lines"
                    viewBox="0 0 180 180"
                    preserveAspectRatio="none"
                  >
                    {stall.variant === 'first' ? (
                      <>
                        <path
                          d="M3 180 V3 H177 V180"
                          fill="none"
                          stroke="#FFCD00"
                          strokeWidth="6"
                          strokeLinecap="square"
                          vectorEffect="non-scaling-stroke"
                        />
                        <rect
                          x="48"
                          y="16"
                          width="84"
                          height="8"
                          rx="3"
                          fill="#FFCD00"
                          fillOpacity="0.85"
                        />
                      </>
                    ) : stall.variant === 'backup' ? (
                      <>
                        <path
                          d="M3 180 V3 H177 V180"
                          fill="none"
                          stroke="#F7F8FA"
                          strokeOpacity="0.85"
                          strokeWidth="4"
                          strokeDasharray="10 8"
                          vectorEffect="non-scaling-stroke"
                        />
                        <rect
                          x="48"
                          y="16"
                          width="84"
                          height="8"
                          rx="3"
                          fill="#F7F8FA"
                          fillOpacity="0.55"
                        />
                      </>
                    ) : (
                      <>
                        <path
                          d="M2 180 V2 H178 V180"
                          fill="none"
                          stroke="#F7F8FA"
                          strokeOpacity="0.85"
                          strokeWidth="4"
                          strokeLinecap="square"
                          vectorEffect="non-scaling-stroke"
                        />
                        <rect
                          x="48"
                          y="16"
                          width="84"
                          height="8"
                          rx="3"
                          fill="#F7F8FA"
                          fillOpacity="0.55"
                        />
                      </>
                    )}
                  </svg>

                  {stall.carTint && (
                    <TopDownCar bodyColor={stall.carTint} windowColor="#182B49" />
                  )}

                  {stall.arriving && (
                    <TopDownCar
                      bodyColor="#F7F8FA"
                      windowColor="#182B49"
                      className="lp-car--arriving"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main>
        {/* SECTION 2: WHY IT EXISTS */}
        <section className="lp-section lp-section--white" aria-labelledby="why-heading">
          <div className="lp-container lp-two-col lp-two-col--why">
            <div>
              <h2 id="why-heading" className="lp-h2 lp-h2--why">
                Parking on campus is guesswork.
              </h2>
              <p className="lp-body">
                Which lots can your permit use? How full will they be when you arrive? Most drivers find out after they
                get there. ParkSmart answers both before you leave.
              </p>
            </div>
            <div className="lp-why-lot" aria-hidden="true">
              {WHY_QUESTIONS.map((question) => (
                <figure key={question} className="lp-why-stall">
                  <span className="lp-why-mark">?</span>
                  <figcaption>{question}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: HOW IT WORKS */}
        <section id="how-it-works" className="lp-section lp-section--asphalt" aria-labelledby="how-heading">
          <div className="lp-container">
            <h2 id="how-heading" className="lp-h2">
              How it works
            </h2>
            <div className="lp-steps-grid">
              {HOW_IT_WORKS_STEPS.map((step, index) => {
                const isLast = index === HOW_IT_WORKS_STEPS.length - 1;
                return (
                  <article key={step.number} className={`lp-step-stall${isLast ? ' lp-step-stall--parked' : ''}`}>
                    <div className="lp-step-number" aria-hidden="true">
                      {step.number}
                    </div>
                    <h3 className="lp-step-title">{step.title}</h3>
                    <p className="lp-step-desc">{step.description}</p>
                    {isLast && <TopDownCar bodyColor="#F7F8FA" windowColor="#182B49" className="lp-step-car" />}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 5: WHAT YOU GET */}
        <section className="lp-section lp-section--white" aria-labelledby="what-heading">
          <div className="lp-container lp-two-col">
            <div>
              <h2 id="what-heading" className="lp-h2">
                Built to be checked, not just trusted.
              </h2>
              <div className="lp-park-sign" aria-hidden="true">
                P
              </div>
            </div>
            <div className="lp-features-list">
              {WHAT_YOU_GET_ITEMS.map((item) => (
                <div key={item.label} className="lp-feature-row">
                  <h3 className="lp-feature-label">{item.label}</h3>
                  <p className="lp-feature-desc">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 6: HONEST LIMITS */}
        <section className="lp-section lp-section--yellow" aria-label="Estimates disclaimer">
          <div className="lp-container">
            <p className="lp-limits-text">
              ParkSmart estimates conditions from historical data. It can&apos;t guarantee a space will be open when
              you arrive.
            </p>
            <button type="button" className="lp-btn lp-btn--asphalt" onClick={onPlanClick}>
              Plan my parking
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container">
          <p className="lp-footer-text">
            Built by Vivaan, Hanrong, Dylan, and Daira for UCSD DS3, Fall 2026. A student project, not an official UCSD
            service.
          </p>
        </div>
      </footer>
    </div>
  );
};
