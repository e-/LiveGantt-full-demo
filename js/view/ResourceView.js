define(['model', 'component/Popover', 
'd3', 'util', 'component/axis/TimeAxis', 'component/ReferenceLine', 'component/TimeMarker', 'component/Marker', 'component/scale/ResourceScale'], function(Model, Popover){

  var
      translate = d3.util.translate,
      url = d3.util.url,
      dateTimeTag = d3.util.dateTimeTag,
      intervalReader = d3.util.intervalReader,
      dynamic = {
        marginHorizontal: function(width, focused) {
          return width / 100 + 5;
        },
        marginVertical: function(height, focused) {
          return height / 50 + 5;
        },
        timeMarginLeft: function(width, focused){
          if(focused) return width / 100 + 30;
          return 3;
        },
        timeMarginRight: function(width, focused){
          if(focused) return width / 100;
          return 3;
        }
      }
  ;
  
  function setupGetter(r){
    return r.setupTime;
  }

  function utilizationGetter(r){
    return r.utilization;
  }

  function highlight(r){
    r.utilizationH.style('display', 'inline')
    r.setupH.style('display', 'inline')
    r.timeH.style('display', 'inline');
  }

  function unhighlight(r){
    r.utilizationH.style('display', 'none')
    r.setupH.style('display', 'none')
    r.timeH.style('display', 'none');
  }

  function ResourceView(project, manager, filter, options, window){
    var 
        width,
        height,
        filteredTime = filter.getTime(),
        timeX = d3.time.scale().domain([
          new Date(filteredTime[0]),
          new Date(filteredTime[1])
        ]),
        filteredResources = filter.getResources(),
        filteredResourceTypes = filter.getResourceTypes(),
        x = d3.scale.linear().domain(filteredTime).clamp(true),
        utilizationY = d3.scale.linear().domain([0, Math.min(d3.max(filteredResources, utilizationGetter) * 120, 100)]),
        utilizationX = d3.scale.resource(filteredResources).sort(null, function(a,b){
          return a.utilization - b.utilization;
        }).bandPadding(0),
        setupY = d3.scale.linear().domain([0, Math.ceil(d3.max(filteredResources, setupGetter) * 1.2)]),
        setupX = d3.scale.resource(filteredResources).sort(null, function(a,b){
          return a.setupTime - b.setupTime;
        }).bandPadding(0),
        utilizationAxis = d3.svg.axis().scale(utilizationY).orient('left').tickSize(3,1),
        setupAxis = d3.svg.axis().scale(setupY).orient('left').tickSize(3,1),
        utilizationG,
        setupG,
        scheduleG,
        margin,
        margin2 = 20,
        yAxisWidth = 0,
        timeMarginLeft = 70,
        timeMarginRight = 20,
        timeAxis = d3.svg.timeAxis().scale(timeX),
        timeG,
        y = d3.scale.resource(filteredResources).bandPadding(0),
        resourceG,
        editable = true,
        filteringType,
        filteringX, 
        filteringY,
        resourceInfo = filteredResources.map(function(r){return {resource:r};}), //1: util, 2:changeover, 3:time
        sortType = options.sortType || 1,
        selectedResourceInfo = [],
        nextFilter,
        isFiltering = false,
        colors = ['#3276b1', '#ff7f0e', '#2ca02c'],
        popover = Popover(window.$root.find('.summary-popover')),
        guideLine = d3.svg.referenceLine({className: 'guide-line'}).scale(x),
        svgId
    ;
    
    function titleFormatter(info){return info.resource.getName();}
    function contentFormatter(info){
      var li = [], resource = info.resource;
      li.push('Util: ' + d3.util.decimalFormat(resource.utilization * 100, 1) + '%');
      li.push('Ch: ' + intervalReader(resource.setupTime * 60 * 1000));
      li.push('&nbsp;&nbsp;Start: ' + dateTimeTag(resource.startAt));
      li.push('Finish: ' + dateTimeTag(resource.endAt));
      return '<ul><li>'+li.join('</li><li>')+'</li></ul>';
    }

    function view(g, focused, svg, id, isMain, defs){
      svgId = id;
      margin = dynamic.marginHorizontal(width, focused);
      margin2 = dynamic.marginVertical(height, focused);
      timeMarginLeft = dynamic.timeMarginLeft(width, focused);
      timeMarginRight = dynamic.timeMarginRight(width, focused);

      yAxisWidth = 30;
      utilizationX.range([margin + yAxisWidth + 5, width / 2 - margin]);
      utilizationY.range([height / 2 - margin2, margin2]);
      setupX.range([margin + yAxisWidth + 5, width / 2 - margin]);
      setupY.range([height / 2 - margin2, margin2]);
      timeAxis.height(height);
      timeAxis.ticks(d3.dynamic.ticks(width / 2));
      timeX.range([timeMarginLeft, width / 2 - timeMarginRight]);
      x.range([timeMarginLeft, width / 2 - timeMarginRight]);
      var availableRange = timeAxis.availableRange();
      y.range(availableRange.reverse()).sort(sortType);
      utilizationAxis.ticks(d3.dynamic.ticks(height / 2));
      setupAxis.ticks(d3.dynamic.ticks(height / 2));

      if(focused) {
        colors.forEach(function(color, i){
          var pattern = 
          defs
            .append('pattern')
              .attr('id', svgId + 'resource-stripe' + i)
              .attr('width', 32)
              .attr('height', 32)
              .attr('patternUnits', 'userSpaceOnUse')
              .attr('patternTransform', 'rotate(45)')
          pattern
            .append('rect')
              .attr('width', 16)
              .attr('height', 32)
              .attr('transform', 'translate(0,0)')
              .attr('fill', color)
          pattern
            .append('rect')
              .attr('width', 16)
              .attr('height', 32)
              .attr('transform', 'translate(16,0)')
              .attr('fill', d3.rgb(color).brighter(0.3))
        });
      }
 
      utilizationG = g.append('g');
      temp = 
      utilizationG
        .selectAll('rect.utilization')
        .data(filteredResources)
        .enter()
          .append('rect')
          .attr('width', function(r){return utilizationX.bandWidth(r);})
          .attr('height', function(r){return height / 2 - margin2 - utilizationY(r.utilization * 100);})
          .attr('transform', function(r){return translate(utilizationX(r), utilizationY(r.utilization * 100));})
          .style('fill', colors[0])
      if(focused) {
        temp
          .each(function(r, i){resourceInfo[i].utilizationX = utilizationX(r) + utilizationX.bandWidth(r) / 2; resourceInfo[i].utilizationRect = d3.select(this); resourceInfo[i].utilizationY = utilizationY(r.utilization * 100);})
          .on('mouseover', function(_, i){view.onMouseOver(resourceInfo[i]);})
          .on('mouseout', function(_, i){view.onMouseOut(resourceInfo[i]);})
      }
      ;

      utilizationG
        .selectAll('rect.highlight')
        .data(filteredResources)
        .enter()
          .append('rect')
          .attr('class', 'srce brush')
          .attr('width', function(r){return utilizationX.bandWidth(r);})
          .attr('height', function(r){return height / 2 - margin2 * 2;})
          .attr('transform', function(r){return translate(utilizationX(r), margin2);})
          .style('display', 'none')
          .style('pointer-events', 'none')
          .each(function(r, i){resourceInfo[i].utilizationH = d3.select(this);})

      setupG = g.append('g').attr('transform', translate(0, height / 2));
      temp = 
      setupG
        .selectAll('rect.setup')
        .data(filteredResources)
        .enter()
          .append('rect')
          .attr('width', function(r){return setupX.bandWidth(r);})
          .attr('height', function(r){return height / 2 - margin2 - setupY(r.setupTime);})
          .attr('transform', function(r){return translate(setupX(r), setupY(r.setupTime));})
          .style('fill', colors[1])
      ;
      if(focused) {
        temp
          .each(function(r, i){resourceInfo[i].setupX = setupX(r) + setupX.bandWidth(r) / 2; resourceInfo[i].setupRect = d3.select(this); resourceInfo[i].setupY = setupY(r.setupTime);})
          .on('mouseover', function(_, i){view.onMouseOver(resourceInfo[i]);})
          .on('mouseout', function(_, i){view.onMouseOut(resourceInfo[i]);})
      }
      ;



      setupG 
        .selectAll('rect.highlight')
        .data(filteredResources)
        .enter()
          .append('rect')
          .attr('class', 'srce brush')
          .attr('width', function(r){return setupX.bandWidth(r);})
          .attr('height', function(r){return height / 2 - margin2 * 2;})
          .attr('transform', function(r){return translate(setupX(r), margin2);})
          .style('display', 'none')
          .style('pointer-events', 'none')
          .each(function(r, i){resourceInfo[i].setupH = d3.select(this);})
                
      timeG = g.append('g').attr('transform', translate(width / 2, 0));
      
      timeG.call(timeAxis).style('font-size', d3.dynamic.fontSize(width))

      resourceG = 
      timeG
        .selectAll('g.resource')
        .data(filteredResources)
        .enter()
          .append('g')
          .attr('transform', function(r){return translate(0, y(r));})
          .each(function(r, i){resourceInfo[i].y = y(r) + y.bandWidth(r) / 2;})

      temp = 
      resourceG
        .append('rect')
        .attr('width', function(r){return x(r.endAtTime) - x(r.startAtTime);})
        .attr('height', function(r){return y.bandWidth(r);})
        .attr('transform', function(r){return translate(x(r.startAtTime), 0);})
        .style('fill', colors[2])

      if(focused) {
        temp
          .each(function(r, i){resourceInfo[i].timeRect = d3.select(this); resourceInfo[i].timeY = y(r);})
          .on('mouseover', function(_, i){view.onMouseOver(resourceInfo[i]);})
          .on('mouseout', function(_, i){view.onMouseOut(resourceInfo[i]);})
      }

      resourceG
        .append('rect')
        .attr('class', 'srce brush')
        .attr('width', function(r){return width / 2;})
        .attr('height', function(r){return y.bandWidth(r);})
        .attr('transform', function(r){return translate(timeMarginLeft, 0);})
        .style('display', 'none')
        .style('pointer-events', 'none')
        .each(function(r, i){resourceInfo[i].timeH = d3.select(this);})
      
      if(focused) {
        timeG
          .append('g')
          .selectAll('.resource-type-name')
          .data(filteredResourceTypes)
          .enter()
          .append('text')
            .attr('class', 'resource-type-name')
            .text(function(rt){return rt.getName();})
            .attr('transform', function(rt){
              return translate(timeMarginLeft - 3, 
                d3.min(rt.resources.filter(function(r){return filteredResources.indexOf(r) >= 0;}).map(y))
              );
            })
            .attr('dy', '0.8em')
        ;
      }
      utilizationG
        .append('line')
        .attr('x1', margin + yAxisWidth).attr('x2', width / 2 - margin + 4).attr('y1', height / 2 - margin2).attr('y2', height / 2 - margin2).attr('class', 'line')
      setupG
        .append('line')
        .attr('x1', margin + yAxisWidth).attr('x2', width / 2 - margin + 4).attr('y1', height / 2 - margin2).attr('y2', height / 2 - margin2).attr('class', 'line')
      var temp;
      temp = 
      utilizationG
        .append('g')
        .attr('class', 'utilization-axis')
        .call(utilizationAxis)
        .attr('transform', translate(yAxisWidth + margin, 0))
        .style('font-size', d3.dynamic.fontSize(width))
      if(focused) {
        temp
          .append('text')
            .text('Utilization (%)')
            .attr('dy', '.71em')
            .attr('dx', '-15px')
            .attr('y', '5px')
            .attr('transform', 'rotate(-90)')
      }
      temp = 
      setupG
        .append('g')
        .attr('class', 'utilization-axis')
        .call(setupAxis)
        .attr('transform', translate(yAxisWidth + margin, 0))
          .style('font-size', d3.dynamic.fontSize(width))
      if(focused) {
        temp
          .append('text')
            .text('Changeover (min)')
            .attr('dy', '.71em')
            .attr('dx', '-15px')
            .attr('y', '5px')
            .attr('transform', 'rotate(-90)')
      }

      if(focused) {
        utilizationG
          .append('text')
            .text('Resources')
            .style('text-anchor', 'end')
            .attr('transform', translate(width / 2 - margin, height / 2 - margin2 + 15))
            .style('font-size', d3.dynamic.fontSize(width))
        setupG
          .append('text')
            .text('Resources')
            .style('text-anchor', 'end')
            .attr('transform', translate(width / 2 - margin, height / 2 - margin2 + 15))
            .style('font-size', d3.dynamic.fontSize(width))

      }
      if(focused && editable) {
        var 
            drag = d3.behavior.drag()
                    .on('dragstart', function(){view.onFilteringStart(g, focused, svg);})
                    .on('drag', function(){view.onFiltering(g, focused, svg);})
                    .on('dragend', function(){view.onFilteringEnd(g, focused, svg);})
        svg.call(drag); 
        if(isMain)
          svg 
            .on('contextmenu', view.onFiltered);
        else 
          svg
            .on('contextmenu', function(){d3.event.preventDefault();});

      } else if(selectedResourceInfo.length) {
        selectedResourceInfo.forEach(highlight);
      }
    }

/*****************************

  Event Handlers

*****************************/
    
    view.onMouseOver = function(info){
      info.utilizationRect.style('fill', url(svgId + 'resource-stripe0'));
      info.setupRect.style('fill', url(svgId + 'resource-stripe1'));
      info.timeRect.style('fill', url(svgId + 'resource-stripe2'));
      var ex = d3.event.offsetX, ey = d3.event.offsetY, px, py;
      if(ex < width / 2) {
        if(ey < height / 2) {
          px = info.utilizationX;
          py = info.utilizationY;
        } else {
          px = info.setupX;
          py = info.setupY + height / 2;
        }
      } else { 
        px = ex;
        py = y(info.resource);
      }
      popover
        .show()
        .title(titleFormatter(info))
        .content(contentFormatter(info))
        .set(px, py, 0)
    }

    view.onMouseOut = function(info){
      info.utilizationRect.style('fill', colors[0]).style('stroke-width', '0px');
      info.setupRect.style('fill', colors[1]).style('stroke-width', '0px');
      info.timeRect.style('fill', colors[2]).style('stroke-width', '0px');
      popover.hide();
    }

    view.onFilteringStart = function(g, focused, svg){
      isFiltering = false;
      if(d3.event.sourceEvent.which === 1) {
        var x = d3.event.sourceEvent.offsetX,   
            y = d3.event.sourceEvent.offsetY

        if(x < width / 2) {
          if(y < height / 2) 
            filteringType = 1;
          else
            filteringType = 2;
        }
        else
          filteringType = 3;
        filteringX = x; filteringY = y;
        resourceInfo.forEach(unhighlight);
        isFiltering = true;
      }
    }

    view.onFiltering = function(g, focused, svg){
      if(isFiltering){
        //remove all highlights
        resourceInfo.forEach(unhighlight);
        var results = [], x = d3.event.x, y = d3.event.y, x1, x2, y1, y2;
      
        x1 = Math.min(filteringX, x);
        x2 = Math.max(filteringX, x);
        y1 = Math.min(filteringY, y);
        y2 = Math.max(filteringY, y);

        function comp1(r){return x1 <= r.utilizationX && r.utilizationX <= x2;}
        function comp2(r){return x1 <= r.setupX && r.setupX <= x2;}
        function comp3(r){return y1 <= r.y && r.y <= y2;}
      
        var comp;
        if(filteringType == 1)comp = comp1;
        else if(filteringType == 2)comp = comp2;
        else comp = comp3;

        selectedResourceInfo = resourceInfo.filter(comp);
        selectedResourceInfo.forEach(highlight);
      }
    }

    view.onFilteringEnd = function(g, focused, svg) {
      isFiltering = false;
    }

    view.onFiltered = function(g, focused, svg) {
      d3.event.stopPropagation();
      d3.event.preventDefault();

      nextFilter = filter.clone();
      if(selectedResourceInfo.length) {
        options.sortType = sortType;
        nextFilter.setResources(selectedResourceInfo.map(function(r){return r.resource;}));
        options.onFiltered(view, nextFilter);
      }
    }

/*****************************

  property getter, setter

*****************************/

    view.width = function(value) {
      if(!arguments.length) return width;
      width = value;
      return view;
    }

    view.height = function(value) {
      if(!arguments.length) return height;
      height = value;
      return view;
    }

    view.filter = function(){
      return filter;
    }

    view.options = function(){
      return options;
    }
    
    view.x = function(){
      return x;
    }

    view.type = function(){
      return 'ResourceView';
    }

    view.sortType = function(value) {
      if(!arguments.length) return sortType;
      
      sortType = value;
      y.sort(sortType);

      resourceG
        .each(function(r, i){resourceInfo[i].y = y(r) + y.bandWidth(r) / 2;})
        .transition()
        .attr('transform', function(r){return translate(0, y(r));});
    }
    
    view.class = function(){
      return ResourceView;
    }

    view.editable = function(value){
      if(!arguments.length) return editable;
      editable = value;
      return view;
    }

    view.composition = function(){
      return {
        panel: 200,
        svgs: [1]
      };
    }

    view.focusAt = function(time){
    }

    view.project = function(){
      return project;
    }

    view.nextFilter = function(){
      return nextFilter;
    }
 

    return view;
  }

  return ResourceView;
});
