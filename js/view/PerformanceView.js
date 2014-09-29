define(['model', 'simplify', 'System',
'd3', 'util', 'component/axis/TimeAxis', 'component/ReferenceLine', 'component/TimeMarker', 'component/Marker'
], function(Model, Simplify, System){
  'use strict';

  // global definitions
  var
      translate = d3.util.translate
  ;

  function PerformanceView(project, manager, filter, options, window){
    // local definitions 
    var 
        g,
        width,
        height,
        filteredTime = filter.getTime(),
        timeX = d3.time.scale().domain([
          new Date(filteredTime[0]),
          new Date(filteredTime[1])
        ]).clamp(true),
        x = d3.scale.linear().domain(
          filteredTime
        ).clamp(true),
        percentY = d3.scale.linear().domain([0, 100]),
        timeAxis = d3.svg.timeAxis().scale(timeX),
        aggrTimeIndex = project.getAggrTimeIndex(filteredTime[1] - filteredTime[0]),
        aggrTimeInterval = project.getAggrTimeInterval(filteredTime[1] - filteredTime[0]),
        countY = d3.scale.linear().domain([
          0, 
          Math.max(
            Math.floor(
              d3.max(
                project.aggrSetup[aggrTimeIndex].map(function(s){return s.y;})
              ) * 1.5
            ), 
            Math.floor(
              project.resources.length * 0.15
            )
          )
        ]),
        countAxis = d3.svg.axis().scale(countY).orient('right').tickSize(3, 1),
        percentAxis = d3.svg.axis().scale(percentY).orient('left').tickSize(3,1),
        startAt = project.startAt,
        startAtTime = project.startAtTime,
        utilizationLine = d3.svg.line().x(
          function(d){return x(d.x)}
        ).y(
          function(d){return percentY(d.y);}
        ),
        temp,
        brush,
        brushedDomain,
        referenceLine = d3.svg.referenceLine().scale(x),
        guideLine = d3.svg.referenceLine({className: 'guide-line'}).scale(x),
        timeMarker = d3.svg.timeMarker(x),
        currentTimeLine = d3.svg.referenceLine().scale(x),
        currentTimeMarker = d3.svg.timeMarker(x, {className: 'time-marker-2'}),
        utilizationMarker = d3.svg.marker({width:30, height:20,direction:'left',className:'marker utilization-marker'}),
        setupMarker = d3.svg.marker({width:30, height:20, direction:'right', className:'marker setup-marker'}),
        lastReferenced,
        editable = true,
        nextFilter,
        marginLeft,
        marginRight
        ;

    function updateCurrentTimeLine(){
      if(options.isCurrentTimeVisible) {
        if(filteredTime[0] <= System.getCurrentTime().getTime() && System.getCurrentTime().getTime() < filteredTime[1]) {
          currentTimeLine.set(System.getCurrentTime().getTime());
          currentTimeMarker.set(System.getCurrentTime().getTime());
        }
      } else {
        currentTimeLine.hide();
        currentTimeMarker.hide();
      }
    }
      
    function setReferenceLine(time, propagation){
      var referenced = Math.round((time - project.startAtTime) / aggrTimeInterval) * aggrTimeInterval;
      if(/*lastReferenced != referenced && */referenced < (project.endAtTime - project.startAtTime)) {
        if(propagation)
          manager.handleEvent('focusAt', {at:referenced + project.startAtTime}, window);
        if(!options.isReferenceLineVisible)return;

        lastReferenced = referenced;
        referenceLine.set(referenced + project.startAtTime);
        timeMarker.set(referenced + project.startAtTime);
        var utilizationY = project.utilization[referenced / project.unitTimeInterval].y,
            setupY = project.aggrSetup[aggrTimeIndex][referenced / aggrTimeInterval].y;
        utilizationMarker.set(
          x(referenced + project.startAtTime),
          percentY(utilizationY)
        ).text(utilizationY + '%');
        setupMarker.set(
          x(referenced + project.startAtTime),
          countY(setupY)
        ).text(setupY);
      }
    }

    function view(g, focused, svg, id, isMain)
    {
      //rendering 
      
      marginLeft = d3.dynamic.timeXMarginLeft(width, height, focused);
      marginRight = d3.dynamic.timeXMarginRight(width, height, focused);

      //update width and height
      timeX.range([marginLeft, width - marginRight]);
      x.range([marginLeft, width - marginRight]);
      timeAxis.height(height);
      percentAxis.ticks(d3.dynamic.ticks(height));
      countAxis.ticks(d3.dynamic.ticks(height));
      timeAxis.ticks(d3.dynamic.ticks(width));
      var availableRange = timeAxis.availableRange();
      availableRange[1] += 3;
      percentY.range(availableRange);
      countY.range(availableRange);
      referenceLine.range(availableRange);
      guideLine.range(availableRange);
      currentTimeLine.range(availableRange);
      //render
      g
        .append('g')
        .call(timeAxis)
        .style('font-size', d3.dynamic.fontSize(width));

      g
        .append('g')
        .attr('class', 'setup')
        .selectAll('rect')
        .data(project.aggrSetup[aggrTimeIndex])
        .enter()
          .append('rect')
          .attr('x', function(d){return x(d.x1)})
          .attr('y', function(d){return countY(d.y);})
          .attr('width', function(d){return x(d.x2) - x(d.x1);})
          .attr('height', function(d){return - countY(d.y) + availableRange[0];})
      ;
 

      g
        .append('g')
          .attr('class', 'utilization')
          .append('path')
          .attr('d', utilizationLine(
            project.utilization
          ))
        ;
      
      temp = 
      g
        .append('g')
          .attr('transform', translate(marginLeft, 0))
          .attr('class', 'utilization-axis axis')
          .call(percentAxis)
          .style('font-size', d3.dynamic.fontSize(width));
      d3.util.adjustLabel(temp);
      if(width > 500)
        temp
          .append('text')
            .text('Utilization (%)')
            .attr('y', 6)
            .attr('dy', '.71em')
            .attr('dx', '-35px')
            .attr('transform', 'rotate(-90)')
      temp = 
      g
        .append('g')
          .attr('transform', translate(width - marginRight, 0))
          .attr('class', 'setup-axis axis')
          .call(countAxis)
          .style('font-size', d3.dynamic.fontSize(width));
      d3.util.adjustLabel(temp);
      
      if(focused){
      var q = g.append('g').attr('transform', translate(width / 2 - 50, availableRange[1] - 3));
      q.append('rect').attr('width', 110).attr('height', 34).style('fill', 'rgba(0,0,0,0.05)');
      q.append('text').text('Util : ' + Math.round(project.json.util * 1000) / 10 + '%').style('fill', 'black').attr('dy', '1em').style('font-size','0.9em').attr('dx', '2em');
      q.append('text').text('Makespan : ' + project.json.makespan).style('fill', 'black').attr('dy', '2.2em').style('font-size', '0.9em').attr('dx', '0.5em');
      }

      if(width > 500)
        temp
          .append('text')
            .text('Setup Change (#)')
            .attr('dy', '.71em')
            .attr('dx', '-35px')
            .attr('y', '-15px')
            .attr('transform', 'rotate(-90)')

      if(focused && editable) {
        brush = d3.svg.brush().x(x).on('brush', view.brushed)
        if(brushedDomain)
          brush.extent(brushedDomain);
        temp = 
        g
          .append('g')
          .attr('class', 'brush')
          .call(brush)
          .selectAll('rect')
            .attr('y', availableRange[1] - 1)
            .attr('height', availableRange[0] - availableRange[1] + 1)
            .on('contextmenu', function(){
              d3.event.preventDefault();
              if(isMain)
                view.oncontextmenu();
            });

        if(brushedDomain) {
          temp
            .select('.extent')
            .attr('x', x(brushedDomain[0]))
            .attr('width', x(brushedDomain[1]) - x(brushedDomain[0]))
        }
            
        g.call(currentTimeLine);
        g.call(currentTimeMarker);

        updateCurrentTimeLine();
       } else if(brushedDomain) {
        g
        .append('g')
        .attr('class', 'brush')
        .append('rect')
          .attr('y', availableRange[1] - 1)
          .attr('height', availableRange[0] - availableRange[1] + 1)
          .attr('x', x(brushedDomain[0]))
          .attr('width', x(brushedDomain[1]) - x(brushedDomain[0]))
      }
      if(focused) {
        g.call(referenceLine);
        g.call(timeMarker);
        g.call(utilizationMarker);
        g.call(setupMarker);
        g.call(guideLine);
        guideLine.attr('class', 'guide-line');
        svg.on('mousemove', view.onMouseMove)
      }
    }
    
    view.brushed = function(){
      brushedDomain = brush.empty() ? null : brush.extent();
    };

    view.oncontextmenu = function(){
      if(!brush.empty()) {
        nextFilter = filter.clone();
        nextFilter.setTime(brush.extent());
        options.onFiltered(view, nextFilter);
      }
    }

    view.onMouseMove =  function(){ //cursor moved
      guideLine.hide();
      setReferenceLine(x.invert(d3.event.offsetX), true);
    }

    view.width = function(value){
      if(!arguments.length) return width;
      width = value;
      return view;
    }

    view.height = function(value){
      if(!arguments.length) return height;
      height = value;
      return view;
    }

    view.filter = function(){
      return filter;
    };
    
    view.nextFilter = function(){
      return nextFilter;
    }
    
    view.x = function(){
      return x;
    };

    view.type = function(){
      return 'PerformanceView';
    }

    view.options = function(){
      return options;
    }

    view.isReferenceLineVisible = function(value){
      if(!arguments.length) return options.isReferenceLineVisible;
      options.isReferenceLineVisible = value;
      
      referenceLine.setVisibility(options.isReferenceLineVisible);
      timeMarker.setVisibility(options.isReferenceLineVisible);
      utilizationMarker.setVisibility(options.isReferenceLineVisible);
      setupMarker.setVisibility(options.isReferenceLineVisible);
      return view;
    }

    view.isCurrentTimeVisible = function(value){
      if(!arguments.length) return options.isCurrentTimeVisible;
      options.isCurrentTimeVisible = value;
      updateCurrentTimeLine();
 
      return view;
    }

    view.class = function(){
      return PerformanceView;
    }

    view.editable = function(v){
      editable = v;
    }
    
    view.composition = function(){
      return {
        panel: 200,
        svgs: [1]
      };
    }

    view.focusAt = function(time){
      if(time) {
        setReferenceLine(time, false);
      } else {
        referenceLine.hide();
        timeMarker.hide();
        utilizationMarker.hide();
        setupMarker.hide();
      }
    }

    view.project = function(){
      return project;
    }

    return view;
  }
  
  return PerformanceView;
});

