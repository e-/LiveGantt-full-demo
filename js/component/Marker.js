define(['d3', 'util'], function(){
  'use strict';

  var translate = d3.util.translate;

  d3.svg.marker = function(options){
    var
        g,
        text,
        isLeft = options.direction == 'left',
        isRight = options.direction == 'right'
    ;

    if(!options) options = {};

    function marker(svg){
      g = 
        svg
        .append('g')
        .attr('class', options.className || 'marker')
      ;

      g
        .append('rect')
        .attr('width', options.width)
        .attr('height', options.height)
        .attr('rx', 3)
        .attr('ry', 3)
      ;

      text = 
        g
          .append('text')
          .attr('dx', options.width / 2)
          .attr('dy', options.dy || '1em')
          .text(options.text || '')
      ;
      
      if(isLeft){
        g
          .append('path')
          .attr('d', 
          'm0,' + 
          (options.height/2-4)+'l-4,4l4,4z')
        ;
      }
      else if(isRight){
        g
          .append('path')
          .attr('d', 'm' + 
          options.width + ',' + 
          (options.height / 2 - 4) +
          'l4,4l-4,4z')
        ;
      }
      else {
        g
          .append('path')
          .attr('d', 'm31,25l8,0l-4,4z')
        ;
      }

      marker.hide();
    }

    marker.hide = function(){
      g.style('opacity', 0);
    }

    marker.set = function(x, y){
      //lastValue = value;
      g
        .style('opacity', 1)
      ;

      if(isLeft){
        g
          .attr('transform', translate(x + 4, y - options.height / 2))
      }
      else if(isRight){
        g
          .attr('transform', translate(x - 4 - options.width, y - options.height / 2))
      }
      return marker;
    }

    marker.text = function(newText){
      text.text(newText);
      return marker;
    }

    marker.refresh = function(){
      var domain = x.domain();
      if(domain[0] <= lastValue && lastValue <= domain[1])
        timeMarker.set(lastValue);
      else
        timeMarker.hide();
    }

    marker.setVisibility = function(visibility)
    {
      g.style('display', visibility ? 'inline' : 'none');
    }

    return marker;
  }
});
