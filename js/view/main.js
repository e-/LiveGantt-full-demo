define([
  'view/Manager',
  'view/PackageView',
  'view/PerformanceView',
  'view/ScheduleView',
  'view/RescheduleView',
  'view/ResourceView'
], function(
  Manager,
  PackageView,
  PerformanceView,
  ScheduleView,
  RescheduleView,
  ResourceView
) {
  'use strict';

  return {
    Manager: Manager,
    PackageView: PackageView,
    PerformanceView: PerformanceView,
    ScheduleView: ScheduleView,
    RescheduleView: RescheduleView,
    ResourceView: ResourceView
  }
});
