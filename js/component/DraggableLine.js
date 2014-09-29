define(['d3', 'util'], function(){
  'use strict';

  d3.svg.draggableLine = function(options){
    var 
        x,
        range,
        line,
        lastValue,
        lastX,
        drag = d3.behavior.drag().on('dragstart', onDragStart).on('drag', onDrag).on('dragend', onDragEnd),
        handle,
        domain,
        xRange,
        g,
        active = true
    ;

    function onDragStart(){
      if(active)
        options.onDragStart();
    }

    function onDrag(){
      if(active) {
        if(d3.event.x < xRange[0])
          d3.event.x = xRange[0];
        if(d3.event.x > xRange[1])
          d3.event.x = xRange[1];
        g
          .attr('transform', d3.util.translate(d3.event.x, range[0]));
        options.onDrag();
      }
    }

    function onDragEnd(){
      if(active)
        options.onDragEnd();
    }

    
    function draggableLine(){
      g = this.append('g').attr('class', 'reference-line').attr('transform', d3.util.translate(0, range[0]));
      line = g.append('line').attr('x2', 0).attr('y2', range[1] - range[0]).style('pointer-events','none');
      handle = g.append('rect').attr('width', 13).attr('height', range[1] - range[0]).style('cursor', 'ew-resize').style('opacity', 0).attr('transform', d3.util.translate(-6, 0));
      g.call(drag);
    }

    draggableLine.scale = function(scale){
      x = scale;
      xRange = x.range();
      return draggableLine;
    };

    draggableLine.range = function(newRange){
      range = newRange;
      return draggableLine;
    };

    draggableLine.set = function(value){
      lastValue = value;
      lastX = x(value);
      if(line) {
        g
          .style('opacity', 1)
          .attr('transform', d3.util.translate(lastX, range[0]))
      }

      return draggableLine;
    };
    
    draggableLine.style = function(a, b){
      return line.style(a, b);
    }
    
    draggableLine.options = function(value){
      options = value;
      return draggableLine;
    }

/*    draggableLine.refresh = function(){
      var domain = x.domain();
      if(domain[0] <= lastValue && lastValue <= domain[1])
        draggableLine.set(lastValue);
      else
        draggableLine.hide();
    }*/

    draggableLine.setVisibility = function(visibility){
      g.style('display', visibility ? 'inline' : 'none');
    };

    draggableLine.enable = function(){
      active = true;
    }

    draggableLine.disable = function(){
      active = false;
    }
        
    return draggableLine;
  }

});
