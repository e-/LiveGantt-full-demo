define(['d3', 'util'], function(){
  'use strict';

  var translate = d3.util.translate;

  d3.brush = function(x, height, options){
    var 
        value,
        rect,
        handle,
        handleG
    ;

    function brush(){
      this
        .style('pointer-events', 'all');
      rect = 
      this
        .append('rect')
          .attr('width', x(value) - 70)
          .attr('height', height - 60)
          .attr('x', 70)
          .attr('y', 30)
          .style('fill', 'black')
          .style('opacity', '0.7')
      ;
      var dragging = false;
      handleG = this.append('g')
        .append('g')
          .style('cursor', 'ew-resize')
          .attr('transform', translate(x(value), 0))

      handle = 
        handleG
          .append('rect')
            .attr('width', 6)
            .attr('x', -3)
            .attr('height', height - 60)
            .attr('y', 30)
            .style('visibility', 'hidden')
            .on('mousedown', function(){
              dragging = true;
            })
            .on('mousemove', function(){
              if(dragging) {
                value = x.invert(d3.event.x);
                handle.attr('transform', translate(x(value), 0));
                rect.attr('width', x(value) - 70);
              }
            })
            .on('mouseup', function(){
              dragging = false;
            });
      ;
    }

    brush.set = function(newValue){
      value = newValue;
      brush.refresh();
      return brush;
    }

    brush.refresh = function(){
      if(rect) {
        rect
          .attr('width', x(value) - 70)
        ;
      }
      return brush;
    }

    return brush;
  }

});
