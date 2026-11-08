/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, CalendarClock, Footprints, History, MapPinned, ShieldCheck } from 'lucide-react';
import parkSmartLogo from './assets/parksmart-logo.png';
import ucsdLogo from './assets/ucsd-logo.png';

interface LandingProps {
  /** Where "Open the planner" goes. */
  plannerHref: string;
}

const STEPS = [
  {
    icon: CalendarClock,
    title: 'Tell us your trip',
    body: 'Pick your destination, when you will arrive and your permit type.',
  },
  {
    icon: History,
    title: 'We check the history',
    body: 'We keep only lots your permit can use, then look up how full each one usually was at that time in past UCSD parking surveys.',
  },
  {
    icon: MapPinned,
    title: 'Get a first choice and a backup',
    body: 'See both on the map with walking time and routes, and choose whether a short walk or more open space matters more.',
  },
];

const TIERS = [
  { color: '#1E8E5A', range: '20% or more open', note: 'Spaces open' },
  { color: '#D98A00', range: '10–20% open', note: 'Getting tight' },
  { color: '#C0392B', range: 'Under 10% open', note: 'Usually full' },
];

/**
 * Front page: says what ParkSmart is and is not, then sends people to the planner.
 * Wording stays with what the data supports: historical estimates, not live counts.
 */
export const Landing: React.FC<LandingProps> = ({ plannerHref }) => {
  return (
    <div className="h-full overflow-y-auto bg-paper text-ink">
      <header className="bg-white border-b border-line">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-2.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky/50">
            <img src={parkSmartLogo} alt="" aria-hidden="true" className="w-9 h-9 block" />
            <span className="font-serif text-[24px] font-semibold leading-none tracking-[-0.01em] text-navy">ParkSmart</span>
          </a>
          <a
            href={plannerHref}
            className="px-4 py-2 rounded-lg bg-navy text-white text-[14px] font-semibold hover:bg-navy-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky/50"
          >
            Open the planner
          </a>
        </div>
      </header>

      <section className="bg-navy text-white border-b-4 border-gold">
        <div className="max-w-5xl mx-auto px-5 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <p className="text-[13px] font-semibold tracking-wide uppercase text-sun">UC San Diego parking planner</p>
          <h1 className="mt-3 max-w-2xl font-serif text-[40px] sm:text-[56px] font-semibold leading-[1.05] tracking-[-0.02em]">
            Know where to park before you arrive.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/85">
            ParkSmart compares the UCSD parking you are allowed to use by arrival time, how full it usually
            is, and how far it is from where you are going. You get a first choice and a backup.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={plannerHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sun text-navy text-[16px] font-semibold hover:bg-[#ffd633] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Open the planner <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </a>
            <span className="text-[13px] text-white/70">Free. No account needed.</span>
          </div>
        </div>
      </section>

      <main>
        <section aria-labelledby="how" className="max-w-5xl mx-auto px-5 py-14">
          <h2 id="how" className="font-serif text-[30px] font-semibold text-navy tracking-[-0.01em]">
            How it works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="p-5 rounded-2xl bg-white border border-line">
                <div className="flex items-center gap-2 text-gold">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span className="text-[12px] font-semibold uppercase tracking-wide">Step {i + 1}</span>
                </div>
                <h3 className="mt-2 font-serif text-[20px] font-semibold text-navy leading-snug">{title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="numbers" className="bg-white border-y border-line">
          <div className="max-w-5xl mx-auto px-5 py-14 grid gap-8 md:grid-cols-2">
            <div>
              <h2 id="numbers" className="font-serif text-[30px] font-semibold text-navy tracking-[-0.01em]">
                What the numbers mean
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">
                Each percentage is how much of a lot was open at about that time in past UCSD parking
                surveys. It is a pattern from the past, not a count of what is open right now, and it is
                never a promise of a space.
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Detailed counts mostly cover the first weeks of each quarter, so estimates are strongest
                then and weaker later in the term.
              </p>
            </div>
            <div className="space-y-2.5 self-center">
              {TIERS.map((tier) => (
                <div key={tier.note} className="flex items-center gap-3 p-3.5 rounded-xl bg-paper border border-line">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} aria-hidden="true" />
                  <span className="text-[15px] font-semibold text-navy">{tier.range}</span>
                  <span className="ml-auto text-[13px] text-muted">{tier.note}</span>
                </div>
              ))}
              <p className="flex items-center gap-2 px-1 pt-1 text-[13px] text-muted">
                <Footprints className="w-4 h-4 shrink-0" aria-hidden="true" />
                Walking time is shown on every result so you can trade distance for space.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="about" className="max-w-5xl mx-auto px-5 py-14">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-navy shrink-0 mt-1" aria-hidden="true" />
            <div>
              <h2 id="about" className="font-serif text-[26px] font-semibold text-navy tracking-[-0.01em]">
                About this project
              </h2>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink">
                ParkSmart is a student project from the UC San Diego Data Science Student Society (DS3). It
                is unofficial and not affiliated with UC San Diego or UCSD Transportation. It uses public
                data: UCSD QPASS parking surveys, parking space inventory reports and published permit
                rules. Always check posted signs and UCSD Transportation before you park.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <a
              href={plannerHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-navy text-white text-[16px] font-semibold hover:bg-navy-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky/50"
            >
              Open the planner <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="max-w-5xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted">
          <span>Unofficial student project. Estimates are historical, not live availability.</span>
          <img src={ucsdLogo} alt="UC San Diego" className="h-[18px] w-auto block" />
        </div>
      </footer>
    </div>
  );
};
