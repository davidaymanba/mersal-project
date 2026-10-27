import { notFound } from 'next/navigation';

/** Sends unknown paths to the localized not-found page instead of Next's default one. */
export default function CatchAllPage() {
  notFound();
}
