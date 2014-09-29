define(['d3', 'util'], function(){
  'use strict';

  d3.svg.referenceLine = function(options){
    var 
        x,
        range,
        line,
        lastValue,
        g
    ;

    function referenceLine(){
      g = this.append('g')
      .attr('class', (options && options.className ? options.className : 'reference-line'))
      .attr('transform', d3.util.translate(0, range[1]));
      
      line = g.append('line').attr('x2', 0).attr('y2', range[0] - range[1]);
      referenceLine.hide();
    }

    referenceLine.scale = function(scale){
      x = scale;
      return referenceLine;
    };

    referenceLine.range = function(newRange){
      range = newRange;
      return referenceLine;
    };

    referenceLine.hide = function(){
      line
        .style('opacity', 0);
      return referenceLine;
    };
    
    referenceLine.set = function(value){
      lastValue = value;
      if(line)
        line
        .style('opacity', 1)
        .attr('transform', d3.util.translate(x(value), 0))

      return referenceLine;
    };
    
    referenceLine.style = function(a, b){
      return line.style(a, b);
    }

    referenceLine.attr = function(a, b){
      line.attr(a, b);
      return referenceLine;
    }
    
    referenceLine.refresh = function(){
      var domain = x.domain();
      if(domain[0] <= lastValue && lastValue <= domain[1])
        referenceLine.set(lastValue);
      else
        referenceLine.hide();
    }

    referenceLine.setVisibility = function(visibility){
      g.style('display', visibility ? 'inline' : 'none');
      return referenceLine;
    };

    return referenceLine;
  }

});
