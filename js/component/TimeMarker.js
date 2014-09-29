define(['d3', 'util'], function(){
  'use strict';

  d3.svg.timeMarker = function(x, options){
    var
        label,
        text1, 
        text2,
        lastValue,
        formatter1 = d3.time.format('%Y-%m-%d'),
        formatter2 = d3.time.format('%H:%M:%S')
    ;
    if(!options) options = {};

    function timeMarker(svg){
      label = 
        svg
        .append('g')
      ;

      label
        .append('rect')
        .attr('class', options.className ? options.className : 'time-marker')
        .attr('width', 70)
        .attr('height', 25)
        .attr('rx', 3)
        .attr('ry', 3)
      ;

      text1 = 
        label
          .append('text')
          .attr('dx', 35)
          .attr('dy', '1.1em')
          .attr('class', 'time-marker-date')
      ;

      text2 = 
        label
          .append('text')
          .attr('dx', 35)
          .attr('dy', '2em')
          .attr('class', 'time-marker-time')
      ;
      
      label
        .append('path')
        .attr('d', 'm31,25l8,0l-4,4z')
        .attr('class', options.className ? options.className : 'time-marker')
      
      timeMarker.hide();
    }

    timeMarker.hide = function(){
      label.style('opacity', 0);
    }

    timeMarker.set = function(value){
      lastValue = value;
      label
        .style('opacity', 1)
        .attr('transform', d3.util.translate(x(value) - 35, 0))
      ;

      text1.text(formatter1(new Date(value)));
      text2.text(formatter2(new Date(value)));
      return timeMarker;
    }

    timeMarker.refresh = function(){
      var domain = x.domain();
      if(domain[0] <= lastValue && lastValue <= domain[1])
        timeMarker.set(lastValue);
      else
        timeMarker.hide();
    }

    timeMarker.setVisibility = function(visibility)
    {
      label.style('display', visibility ? 'inline' : 'none');
    }

    return timeMarker;
  }
});
