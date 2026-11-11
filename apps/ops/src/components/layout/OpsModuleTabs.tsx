'use client';

import React from 'react';
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  Car,
  CheckCircle,
  CheckCircle2,
  FileText,
  ListFilter,
  Map,
  Navigation,
  ShieldAlert,
  Ticket,
  Truck,
  UploadCloud,
  UserCheck,
} from 'lucide-react';
import { SubNavTab, SubNavTabs } from '../../../../corporate/src/components/layout/SubNavTabs';

type Module = 'live' | 'rosters' | 'bookings' | 'routes' | 'safety';

const TABS: Record<Module, { title: string; tabs: SubNavTab[] }> = {
  live: {
    title: 'Live Operations & Commuter Tracking',
    tabs: [
      { href: '/live', label: 'Live Operations Map', icon: <Map size={15} /> },
      { href: '/live/employees', label: 'Employee Live Tracking', icon: <UserCheck size={15} /> },
      { href: '/live/trips', label: 'Live Trip Details', icon: <Car size={15} /> },
      { href: '/live/exceptions', label: 'Tracking Exceptions', icon: <AlertTriangle size={15} /> },
    ],
  },
  rosters: {
    title: 'Shifts & Employee Rosters',
    tabs: [
      { href: '/rosters/shifts', label: 'Shift Templates', icon: <CalendarClock size={15} /> },
      { href: '/rosters/calendar', label: 'Roster Calendar', icon: <Calendar size={15} /> },
      { href: '/rosters/import', label: 'Import & Preview', icon: <UploadCloud size={15} /> },
      { href: '/rosters/approve', label: 'Approval & Publish', icon: <CheckCircle size={15} /> },
    ],
  },
  bookings: {
    title: 'Bookings & Commute Requests',
    tabs: [
      { href: '/bookings/overview', label: 'Bookings Overview', icon: <Ticket size={15} /> },
      { href: '/bookings', label: 'Booking Queue', icon: <ListFilter size={15} /> },
      { href: '/bookings/details', label: 'Booking Details', icon: <FileText size={15} /> },
      { href: '/bookings/approvals', label: 'Approval Inbox', icon: <CheckCircle2 size={15} /> },
    ],
  },
  routes: {
    title: 'Routes & Trips',
    tabs: [
      { href: '/routes', label: 'Route Planner', icon: <Navigation size={15} /> },
      { href: '/routes/active', label: 'Active Routes', icon: <Map size={15} /> },
      { href: '/routes/allocation', label: 'Fleet Allocation', icon: <Truck size={15} /> },
      { href: '/routes/details', label: 'Route Details', icon: <FileText size={15} /> },
    ],
  },
  safety: {
    title: 'Safety & Incident Management',
    tabs: [
      { href: '/safety', label: 'Safety Overview', icon: <ShieldAlert size={15} /> },
      { href: '/safety/cockpit', label: 'SOS Cockpit', icon: <AlertTriangle size={15} /> },
      { href: '/safety/incidents/details', label: 'Incident Details', icon: <FileText size={15} /> },
      { href: '/safety/incidents/resolve', label: 'Incident Resolution', icon: <CheckCircle2 size={15} /> },
      { href: '/safety/reports', label: 'Safety Reports', icon: <FileText size={15} /> },
    ],
  },
};

export function OpsModuleTabs({ module }: { module: Module }) {
  const { title, tabs } = TABS[module];
  return <SubNavTabs title={title} tabs={tabs} />;
}
