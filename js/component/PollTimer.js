define(function(){
  'use strict';

  function PollTimer(pollTime){
    this.pollTime = pollTime;
    this.timer = null;
  }

  PollTimer.prototype = {
    start: function(){
      this.timer = setTimeout(this.onPoll, this.pollTime);
    },
    restart: function(){
      clearTimeout(this.timer);
      this.start();
    },
    clear: function(){
      clearTimeout(this.timer);
    }
  };

  return PollTimer;
});
