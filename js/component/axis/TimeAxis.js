define(['d3', 'util'], function(){
  'use strict';

  var 
    translate = d3.util.translate,
    dynamic = {
      bottomAxisVisibility:  function(height) {
        return height > 300;
      }
    }
   ;

  d3.svg.timeAxis = function(){
    var 
      height,
      axisTop = d3.svg.axis().orient('bottom'),
      axisBottom = d3.svg.axis().orient('top'),
      axisMainLine = d3.svg.axis().orient('bottom'),
      axisTopG,
      axisBottomG,
      axisMainLineG,
      g,
      reservedHeight
    ;   

    function createG(){
      g = this.attr('class', 'time-axis axis')
      axisMainLineG = g.append('g').attr('transform', d3.util.translate(0, height + 55)).attr('class', 'mainline-axis');
      g.append('rect').attr('class', 'top-axis-container').attr('width', '100%').attr('height', reservedHeight).style('fill', '#eee');
      axisTopG = g.append('g').attr('class', 'top-axis').attr('transform', translate(0, reservedHeight * 0.2));
      
      if(dynamic.bottomAxisVisibility(height)) {
        g.append('rect').attr('transform', translate(0, height-reservedHeight)).attr('class', 'bottom-axis-container').attr('width', '100%').attr('height', reservedHeight).style('fill', '#eee');
      
        axisBottomG = g.append('g').attr('class', 'bottom-axis').attr('transform', translate(0, height - reservedHeight * 0.2));
      }
    }

    function timeAxis(){
      if(g != this) createG.call(this);
      
      axisMainLine.tickSize(-height - 50, 0).tickPadding(-reservedHeight);
      axisTop.tickSize(0, 0, 0);
      axisMainLineG.call(axisMainLine);
      axisTopG.call(axisTop);

      if(dynamic.bottomAxisVisibility(height)) {
        axisBottom.tickSize(0, 0, 0);
        axisBottomG.call(axisBottom);
      }
    }

    timeAxis.scale = function(scale){
      axisTop.scale(scale);
      axisMainLine.scale(scale);
      axisBottom.scale(scale);
      return timeAxis;
    };

    timeAxis.height = function(newHeight){
      height = newHeight;
      reservedHeight = 16 + newHeight / 80;
      return timeAxis;
    };

    timeAxis.ticks = function(v){
      axisTop.ticks(v);
      axisMainLine.ticks(v);
      if(dynamic.bottomAxisVisibility(height)) {
        axisBottom.ticks(v);
      }
    };

    timeAxis.availableRange = function(){
      if(dynamic.bottomAxisVisibility(height)) {
        return [
          height - reservedHeight - 1,
          reservedHeight
        ];
      } else {
        return [
          height ,
          reservedHeight
        ];
      }
    }
    
    timeAxis.style = function(a, b){
      axisTop.style(a, b);
      axisMainLine.style(a, b);
      if(dynamic.bottomAxisVisibility(height)) {
        axisBottom.style(a, b);
      }
    }

    return timeAxis;
  };
});

