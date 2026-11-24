'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './PageLoadingSkeleton.module.css';

type SkeletonVariant = 'auth' | 'dashboard' | 'form' | 'map' | 'table' | 'detail' | 'chart' | 'profile';

function getVariant(pathname: string): SkeletonVariant {
  const path = pathname.toLowerCase();
  if (path.includes('login') || path.includes('auth')) return 'auth';
  if (path.includes('map') || path.includes('live') || path.includes('tracking')) return 'map';
  if (path.endsWith('/details') || path.endsWith('/resolve')) return 'detail';
  if (path.includes('company-profile')) return 'profile';
  if (
    path.includes('dashboard') ||
    path.includes('analytics') ||
    path.includes('overview') ||
    path.includes('billing') ||
    path.includes('reports') ||
    path.includes('employee-support')
  ) {
    return 'dashboard';
  }
  if (path.includes('create') || path.includes('edit') || path.includes('settings') || path.includes('onboarding')) {
    return 'form';
  }
  if (
    path.includes('pricing') ||
    path.includes('finance') ||
    path.includes('reports') ||
    path.includes('notifications') ||
    path.includes('support') ||
    path.includes('billing') ||
    path.includes('employees') ||
    path.includes('users') ||
    path.includes('drivers') ||
    path.includes('vendors') ||
    path.includes('trips') ||
    path.includes('routes') ||
    path.includes('assignments') ||
    path.includes('requirements') ||
    path.includes('settlements') ||
    path.includes('verifications') ||
    path.includes('disputes') ||
    path.includes('coupons') ||
    path.includes('companies') ||
    path.includes('exceptions') ||
    path.includes('rosters') ||
    path.includes('safety') ||
    path.includes('offices') ||
    path.includes('bookings') ||
    path.includes('cancellations') ||
    path.includes('audit') ||
    path.includes('blogs') ||
    path.includes('feature-flags')
  ) {
    return 'table';
  }
  return 'detail';
}

export function SkeletonBone({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <span aria-hidden="true" className={`${styles.bone} ${className}`} style={style} />;
}

const Bone = SkeletonBone;

function MetricBones() {
  return (
    <div className={styles.metrics}>
      {Array.from({ length: 4 }, (_, index) => (
        <div className={styles.metric} key={index}>
          <Bone className={styles.metricLabel} />
          <Bone className={styles.metricValue} />
          <Bone className={styles.metricHint} />
        </div>
      ))}
    </div>
  );
}

function TableBones() {
  return (
    <div className={styles.table}>
      <div className={styles.tableHeader}>
        {Array.from({ length: 5 }, (_, index) => <Bone key={index} />)}
      </div>
      {Array.from({ length: 6 }, (_, row) => (
        <div className={styles.tableRow} key={row}>
          {Array.from({ length: 5 }, (_, column) => (
            <Bone className={column === 0 ? styles.firstCell : ''} key={column} />
          ))}
        </div>
      ))}
    </div>
  );
}

export type ContentSkeletonKind =
  | 'metric'
  | 'metrics'
  | 'chart'
  | 'table'
  | 'list'
  | 'form'
  | 'profile'
  | 'drawer'
  | 'map';

export function ContentLoadingSkeleton({
  kind,
  label,
  count = 4,
  height,
}: {
  kind: ContentSkeletonKind;
  label?: string;
  count?: number;
  height?: number | string;
}) {
  const itemCount = Number.isFinite(count) ? Math.max(1, Math.min(12, Math.floor(count))) : 4;
  const loadingLabel = label ?? `Loading ${kind === 'metrics' ? 'metrics' : kind}…`;
  const metric = (key: number) => (
    <div className={styles.metric} key={key}>
      <Bone className={styles.metricLabel} />
      <Bone className={styles.metricValue} />
      <Bone className={styles.metricHint} />
    </div>
  );

  return (
    <div
      className={styles.component}
      data-kind={kind}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={loadingLabel}
    >
      <span className={styles.srOnly}>{loadingLabel}</span>
      {kind === 'metric' ? (
        metric(0)
      ) : kind === 'metrics' ? (
        <div className={styles.metrics}>{Array.from({ length: itemCount }, (_, index) => metric(index))}</div>
      ) : kind === 'chart' ? (
        <Bone className={styles.chart} style={height === undefined ? undefined : { height }} />
      ) : kind === 'table' ? (
        <div className={styles.panel}>
          <div className={styles.toolbar}><Bone /><Bone className={styles.toolbarAction} /></div>
          <TableBones />
        </div>
      ) : kind === 'list' ? (
        <div className={styles.panel}>
          {Array.from({ length: itemCount }, (_, index) => <Bone className={styles.listItem} key={index} />)}
        </div>
      ) : kind === 'form' ? (
        <div className={styles.panel}>
          <Bone className={styles.panelTitle} />
          <div className={styles.formGrid}>
            {Array.from({ length: itemCount }, (_, index) => <Bone className={styles.input} key={index} />)}
          </div>
          <Bone className={styles.textarea} />
          <Bone className={styles.button} />
        </div>
      ) : kind === 'profile' ? (
        <div className={styles.panel}>
          <div className={styles.profileHeading}>
            <Bone className={styles.profileAvatar} />
            <div className={styles.profileIdentity}>
              <Bone className={styles.metricValue} />
              <Bone className={styles.subtitle} />
            </div>
          </div>
          <div className={styles.formGrid}>
            {Array.from({ length: itemCount }, (_, index) => <Bone className={styles.input} key={index} />)}
          </div>
        </div>
      ) : kind === 'drawer' ? (
        <div className={styles.drawer}>
          <Bone className={styles.panelTitle} />
          {Array.from({ length: itemCount }, (_, index) => <Bone className={styles.listItem} key={index} />)}
          <Bone className={styles.button} />
        </div>
      ) : (
        <div
          className={styles.mapPanel}
          style={height === undefined ? undefined : { height, boxSizing: 'border-box' }}
        >
          <Bone
            className={styles.mapSurface}
            style={height === undefined ? undefined : { minHeight: 0 }}
          />
        </div>
      )}
    </div>
  );
}

export function LazyMount({
  children,
  fallback,
  minHeight,
  rootMargin = '240px',
}: {
  children: ReactNode;
  fallback: ReactNode;
  minHeight?: number | string;
  rootMargin?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shouldRender) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return (
    <div ref={containerRef} style={minHeight === undefined ? undefined : { minHeight }}>
      {shouldRender ? children : fallback}
    </div>
  );
}

export function PageLoadingSkeleton({
  variant: variantOverride,
  pathname: pathnameOverride,
}: {
  variant?: SkeletonVariant;
  pathname?: string;
} = {}) {
  const currentPathname = usePathname() ?? '';
  const pathname = pathnameOverride ?? currentPathname;
  const variant = variantOverride ?? getVariant(pathname);

  return (
    <section
      className={styles.page}
      data-variant={variant}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={variant === 'chart' ? 'Loading chart' : 'Loading page'}
    >
      <span className={styles.srOnly}>
        {variant === 'chart' ? 'Loading chart content' : 'Loading page content'}
      </span>
      {variant !== 'auth' && variant !== 'chart' && (
        <header className={styles.heading}>
          <Bone className={styles.title} />
          <Bone className={styles.subtitle} />
        </header>
      )}

      {variant === 'chart' ? (
        <div className={styles.panel}>
          <Bone className={styles.panelTitle} />
          <Bone className={styles.chart} />
        </div>
      ) : variant === 'profile' ? (
        <div className={styles.panel}>
          <div className={styles.profileHeading}>
            <Bone className={styles.profileAvatar} />
            <div className={styles.profileIdentity}>
              <Bone className={styles.metricValue} />
              <Bone className={styles.subtitle} />
            </div>
          </div>
          <div className={styles.formGrid}>
            {Array.from({ length: 4 }, (_, index) => <Bone className={styles.input} key={index} />)}
          </div>
        </div>
      ) : variant === 'auth' ? (
        <div className={styles.authCard}>
          <Bone className={styles.logo} />
          <Bone className={styles.title} />
          <Bone className={styles.subtitle} />
          <Bone className={styles.input} />
          <Bone className={styles.input} />
          <Bone className={styles.button} />
        </div>
      ) : variant === 'dashboard' ? (
        <>
          <MetricBones />
          <div className={styles.dashboardGrid}>
            <div className={styles.panel}>
              <Bone className={styles.panelTitle} />
              <Bone className={styles.chart} />
            </div>
            <div className={styles.panel}>
              <Bone className={styles.panelTitle} />
              <Bone className={styles.chart} />
            </div>
          </div>
          <div className={styles.panel}>
            <Bone className={styles.panelTitle} />
            <TableBones />
          </div>
        </>
      ) : variant === 'map' ? (
        <div className={styles.mapGrid}>
          <div className={styles.mapPanel}><Bone className={styles.mapSurface} /></div>
          <div className={styles.panel}>
            <Bone className={styles.panelTitle} />
            {Array.from({ length: 5 }, (_, index) => <Bone className={styles.listItem} key={index} />)}
          </div>
        </div>
      ) : variant === 'form' ? (
        <div className={styles.panel}>
          <Bone className={styles.panelTitle} />
          <div className={styles.formGrid}>
            {Array.from({ length: 6 }, (_, index) => <Bone className={styles.input} key={index} />)}
          </div>
          <Bone className={styles.textarea} />
          <Bone className={styles.button} />
        </div>
      ) : variant === 'table' ? (
        <div className={styles.panel}>
          <div className={styles.toolbar}><Bone /><Bone className={styles.toolbarAction} /></div>
          <TableBones />
        </div>
      ) : (
        <>
          <div className={styles.panel}>
            <Bone className={styles.panelTitle} />
            <div className={styles.formGrid}>
              {Array.from({ length: 4 }, (_, index) => <Bone className={styles.input} key={index} />)}
            </div>
          </div>
          <div className={styles.panel}>
            <Bone className={styles.panelTitle} />
            {Array.from({ length: 5 }, (_, index) => <Bone className={styles.listItem} key={index} />)}
          </div>
        </>
      )}
    </section>
  );
}
