import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CardsGridSkeleton,
  DashboardSkeleton,
  DetailPanelSkeleton,
  DrawerSkeleton,
  TablePageSkeleton,
} from '../components/common/Skeletons';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  StatusBadge,
} from '../components/common/StatePrimitives';

describe('Adaptive Skeletons & State Primitives', () => {
  it('renders dimension-matched adaptive skeletons with aria-busy=true instead of generic spinners', () => {
    const dashHtml = renderToStaticMarkup(<DashboardSkeleton />);
    const tableHtml = renderToStaticMarkup(<TablePageSkeleton />);
    const drawerHtml = renderToStaticMarkup(<DrawerSkeleton />);
    const cardsHtml = renderToStaticMarkup(<CardsGridSkeleton />);
    const detailHtml = renderToStaticMarkup(<DetailPanelSkeleton />);

    expect(dashHtml).toContain('aria-busy="true"');
    expect(dashHtml).toContain('Loading fleet dashboard');
    expect(tableHtml).toContain('Loading table view');
    expect(drawerHtml).toContain('Loading details drawer');
    expect(cardsHtml).toContain('aria-busy="true"');
    expect(detailHtml).toContain('aria-busy="true"');
  });

  it('renders EmptyState, ErrorState with retry button, StatusBadge, and ConfirmDialog states', () => {
    const emptyHtml = renderToStaticMarkup(
      <EmptyState
        title="No Fleet Drivers"
        description="Share your Fleet Code with onboarding drivers."
        action={<button type="button">Copy Code</button>}
      />,
    );
    expect(emptyHtml).toContain('No Fleet Drivers');
    expect(emptyHtml).toContain('Copy Code');

    const errHtml = renderToStaticMarkup(
      <ErrorState message="Network timeout" onRetry={() => undefined} />,
    );
    expect(errHtml).toContain('Network timeout');
    expect(errHtml).toContain('Retry');

    const qualifiedBadge = renderToStaticMarkup(<StatusBadge status="IN_PROGRESS" />);
    expect(qualifiedBadge).toContain('IN PROGRESS');

    const closedConfirm = renderToStaticMarkup(
      <ConfirmDialog
        isOpen={false}
        title="Hidden"
        description="Should not mount"
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(closedConfirm).toBe('');

    const openConfirm = renderToStaticMarkup(
      <ConfirmDialog
        isOpen
        title="Regenerate Fleet Code?"
        description="Previous code stops working for new registrations."
        confirmLabel="Regenerate"
        onConfirm={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(openConfirm).toContain('role="dialog"');
    expect(openConfirm).toContain('Regenerate Fleet Code?');
    expect(openConfirm).toContain('Regenerate');
  });
});
