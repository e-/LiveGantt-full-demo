define([
  'backend/load',
  'backend/reschedule'
], function(
  load,
  reschedule
) {
  'use strict';

  return {
    load: load,
    reschedule: reschedule
  }
});
