define([
  'adapter/PerformanceViewAdapter',
  'adapter/PackageViewAdapter',
  'adapter/ScheduleViewAdapter',
  'adapter/RescheduleViewAdapter',
  'adapter/ResourceViewAdapter'
], function(
  PerformanceViewAdapter,
  PackageViewAdapter,
  ScheduleViewAdapter,
  RescheduleViewAdapter,
  ResourceViewAdapter
) {
  'use strict';

  return {
    PerformanceViewAdapter: PerformanceViewAdapter,
    PackageViewAdapter: PackageViewAdapter,
    ScheduleViewAdapter: ScheduleViewAdapter,
    RescheduleViewAdapter: RescheduleViewAdapter,
    ResourceViewAdapter: ResourceViewAdapter
  }
});

