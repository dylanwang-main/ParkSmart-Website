/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import App from './App.tsx';
import { Landing } from './Landing.tsx';

/** Hash that opens the planner; anything else shows the landing page. */
export const PLANNER_HASH = '#/planner';

/** True when the URL hash points at the planner. */
export function isPlannerHash(hash: string): boolean {
  return hash === PLANNER_HASH || hash.startsWith(`${PLANNER_HASH}/`);
}

/**
 * Landing page first, planner second. A hash route keeps hosting simple: a static host
 * (Amplify) serves one index.html and needs no rewrite rules.
 */
export default function Root() {
  const [showPlanner, setShowPlanner] = useState(() => isPlannerHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setShowPlanner(isPlannerHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return showPlanner ? <App /> : <Landing plannerHref={PLANNER_HASH} />;
}
