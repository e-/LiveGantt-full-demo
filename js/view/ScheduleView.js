define([
'System', 
'component/Popover',
'component/aggregate', 
'component/PollTimer', 

'd3', 
'util', 
'component/axis/TimeAxis', 
'component/ReferenceLine', 
'component/scale/ResourceScale', 
'component/DraggableLine'
], function(System, Popover, aggregate, PollTimer){
  var
      translate = d3.util.translate,
      url = d3.util.url,
      dynamic = {
        marginLeft: function(width, focused){
          if(focused) 
            return 30 + width / 50;
          return width / 50;
          return 6 + width / 20;
        },
        marginRight: function(width) {
          return width / 50;
          return 3 + width / 50;
        },
        resourceFontSize: function(width) {
          return '0.05em';
          return Math.floor((0.1 + width / 2000) * 10) * 0.1 + 'em'
        }
      };
  ;

  function ScheduleView(project, manager, filter, options, window) {
    var 
        width,
        height,
        filteredTime = filter.getTime(),
        filteredPackages = filter.getPackages(),
        filteredResources = filter.getResources(),
        filteredResourceTypes = filter.getResourceTypes(),
        filteredTasks = filter.getTasks(),
        timeX = d3.time.scale().domain([
          new Date(filteredTime[0]),
          new Date(filteredTime[1])
        ]).clamp(true),
        x = d3.scale.linear().domain(filteredTime).clamp(true),
        y = d3.scale.resource(filteredResources).bandPadding(0),
        timeAxis = d3.svg.timeAxis().scale(timeX),
        marginLeft,
        marginRight,
        resourceG,
        focusAtTime = filteredTime[0],
        aggregated,
        focusLine = d3.svg.draggableLine(), 
        timeMarker = d3.svg.timeMarker(x, {className: 'time-marker-3'}),
        focusLineG,
        timeMarkerG,
        recursionCount = 0,
        currentTimeLine = d3.svg.referenceLine(),
        currentTimeMarker = d3.svg.timeMarker(x, {className: 'time-marker-2'}),
        isCurrentTimeVisible = false,
        highlightFocused = true,
        dirty = true,
        aggrTaskRects,
        popover = Popover(window.$root.find('.summary-popover')),
        reschedulePopover = Popover(window.$root.find('.reschedule-popover')),
        availableRange,
        resourceLabels,
        clipCircle,
        consTasks = filteredResources.map(function(r){return r.aggrTasksByPackage;}).reduce(function(a,b){return a.concat(b);}),
        consTaskRects,
        taskG,
        taskRects,
        pollTimer = new PollTimer(700),
        previewTimer = new PollTimer(100),
        activeTask,
        isZoomed = false,
        editable = true,
        previewTask,
        previewResource,
        previewIndex,
        focusLineCover,
        rectG,
        isTaskDragging = false,
        sortType = options.sortType || 1,
        resourceG,
        guideLine = d3.svg.referenceLine({className: 'guide-line'}).scale(x),
        svgId,
        mode = 1,
        nonSetupFilteredTasks = filteredTasks.filter(nonSetupTaskFilter),
        fakeTask,
        reschedulable = true
        ;
      

    function opacityGetter(aggr){
      if(filter.packageFiltered()) {
        if(filteredPackages.indexOf(aggr.package) >= 0) {
          if(!highlightFocused) return 1;
          return aggr.level == 0 ? 1 : 0.5;         
        } else return 0.1;
      } else {
        if(!highlightFocused) return 1;
        if(aggr.level == 0 && !aggr.finished) {
          if(aggr.backward) return 0.3;
          return 1;
        }
        else 
          return 0.3;
      }
    }
    function opacityGetter2(cons) { //for aggregation level 2
      if(filter.packageFiltered()) {
        if(filteredPackages.indexOf(cons.package) >= 0) {
          if(!highlightFocused) return 1;
          return cons.startAtTime < focusAtTime && focusAtTime < cons.endAtTime ? 1 : 0.5;
        }
        return 0.2;
      }
      if(highlightFocused) {
        if(cons.startAtTime <= focusAtTime && focusAtTime < cons.endAtTime)
          return 1;
        return 0.3;
      } 

      return 1;
    }


    function widthGetter(r){return r.width;}
    function heightGetter(r){return r.height;}
    function transformGetter(r){return translate(r.x, r.y);}
    function packageColorGetter(r){return r.package.color;}
    function taskDefinitionColorGetter(r){return r.taskDefinition.color;}
    function taskRescheduleMapper(t){return {id:t.id, resourceId:t.resourceId,taskDefinitionId:t.taskDefinitionId};}
    function nonSetupTaskFilter(t){
      if(!project.regardChangeoverAsTask) 
        return true;
      return t.setup == 0;
    }
    function enableExploreMode(g, focused, svg) {
      mode = 1;
      focusLine.enable();
      svg.select('.zoomTasks').remove();
      svg.select('.aggrTasks').style('opacity', 1);
      if(aggrTaskRects)
        aggrTaskRects.style('pointer-events','all');
      if(focused) {
        if(taskG)
          taskG.style('display', 'none');
        svg
          .on('contextmenu', function(){
            d3.event.preventDefault();
          })
        ;
      }
    }

    function enableFocusMode(g, focused, svg) {
      mode = 2;
      focusLine.disable();
      svg.select('.aggrTasks').style('opacity', 0.5);
      if(aggrTaskRects)
        aggrTaskRects.style('opacity', opacityGetter).style('pointer-events','none');
      if(focused) {
        if(taskG)
          taskG.style('display', 'none');
        svg
          .on('click', null)
          .on('contextmenu', null)
          .on('contextmenu', function(){
            enableExploreMode(g, focused, svg);
            d3.event.preventDefault();
            d3.event.stopPropagation();
          });
      }
    }

    function enableDragMode(task, g, focused, svg) {
      mode = 3;
      var self = this;
      if(aggrTaskRects)
        aggrTaskRects.filter(function(aggr){
          return aggr.tasks[0].resourceType.id != task.taskDefinition.resourceTypeId;
        }).style('opacity', function(aggr){
          return 0.0;
        });
      if(focused) {
        svg
          .on('click', null)
          .on('contextmenu', null)
          .on('contextmenu', function(){
            d3.event.stopPropagation();
            d3.event.preventDefault();
            task.x = x(task.startAtTime);
            task.y = y(task.resource);
            if(options.aggregationLevel == 3) {
              d3.select(self).transition().attr('transform', translate(task.x, task.y));
            } else {
              fakeTask.remove();
              d3.select(self).style('opacity', 1);
            }
            enablePopover();
            reschedulePopover.disable();
            pollTimer.clear();
            enableFocusMode(g, focused, svg);
          });
      }
    }

    function enablePopover(){
      popover.enable();
    }

    function disablePopover(){
      popover.disable();
    }

    function findResourceByY(yValue){
      var i = 0, length = filteredResources.length;
      for(i=0;i<length;++i){
        var 
            resource = filteredResources[i],
            minY = y(resource),
            maxY = minY + y.bandWidth()
        ;
        if(minY <= yValue && yValue < maxY)
          return resource;
      }
      return null;
    }
    
    function findTaskIndexByX(resource, xValue) {
      var i = 0, length = resource.nonSetupTasks.length;
      for(i=0;i<length;++i){
        var 
            task = resource.nonSetupTasks[i],
            minX = x(task.startAtTime)
       ;
       if(xValue < minX) return i;
      }
      return i;
    }
   

/************************************************
  
  Rendering


************************************************/

    function aggrContentFormatter(aggr){
      var li = [];
      if(!aggr.backward) {
        if(aggr.x1 - focusAtTime > 0) {
          li.push('Start after ' + d3.util.intervalReader(aggr.x1 - focusAtTime));
        } else {
          li.push('<strong>Working</strong>');
        }
      }
      li.push('Avg. Duration: ' + d3.util.intervalReader(aggr.x2 - aggr.x1));
      if(!aggr.backward) {
        var count = {}, total=0;
        aggr.next.forEach(function(nextAggr){
          if(!count[nextAggr.package.id])
            count[nextAggr.package.id] = [0, nextAggr.package];
          count[nextAggr.package.id][0]+=nextAggr.resources.length;
          total+=nextAggr.resources.length;
        });
        var array = [];
        Object.keys(count).forEach(function(key){
          array.push([key, count[key][0], count[key][1]]);
        });
        array.sort(function(a,b){return b[1] - a[1];});
        array.forEach(function(a){
          li.push('<strong>' + a[1] + '</strong> ' + '<span class="bullet2" style="background:'+a[2].color+'"></span>' + a[2].getName() + ' task' + (a[1] > 1 ? 's' : '') + ' follow' + (a[1] > 1 ? '' : 's') + '.');
        });
        var remain = aggr.resources.length - total;
        if(remain){
          li.push('<strong>' + remain + '</strong>' + ' resource' + (remain > 1 ? 's' : '') + ' will finish.');
        }
      }
  
      return '<ul><li>' + li.join('</li><li>') + '</li></ul>';
    }

    function aggrTitleFormatter(aggr){
      return '<span class="bullet" style="background-color:'+aggr.package.color+'"></span>' + aggr.package.getName() + ' <small>('+aggr.resources[0].resourceType.getName()+', ' + aggr.resources.length + ' resource' + ((aggr.resources.length > 1) ? 's' : '') + ')</small>'
    }

    function consTitleFormatter(cons){
      return '<span class="bullet" style="background-color:'+cons.package.color+'"></span>' + cons.package.getName() + ' (' + cons.resource.getName() + ')';
    }

    function consContentFormatter(cons){
      return '<ul><li>' + 
                'Start: ' + d3.util.dateTimeTag(new Date(cons.startAtTime)) + '</li><li>' + 
                'Finish: ' + d3.util.dateTimeTag(new Date(cons.endAtTime)) + '</li><li>' + 
                d3.util.intervalReader(cons.endAtTime - cons.startAtTime) + '</li><li>'  + 
             '</li></ul>'
    }

    function taskTitleFormatter(task){
      return '<span class="bullet" style="background-color:'+task.taskDefinition.color+'"></span>' + task.taskDefinition.getName() + ' <small>('+task.resource.getName()+')</small>';
    }

    function taskContentFormatter(task){
      var ir;
      if(focusAtTime < task.startAtTime) {
        ir = 'Start after ' + d3.util.intervalReader(task.startAtTime - focusAtTime) + '</li><li>Duration: ' + d3.util.intervalReader(task.endAtTime - task.startAtTime) + '</li><li>';
      } else {
        ir = 'Duration: ' + d3.util.intervalReader(task.endAtTime - task.startAtTime) + '</li><li>';
      }
                 
      return '<ul><li>' + ir + 
                '&nbsp;&nbsp;Start: ' + d3.util.dateTimeTag(new Date(task.startAtTime)) + '</li><li>' + 
                'Finish: ' + d3.util.dateTimeTag(new Date(task.endAtTime)) + 
             '</li></ul>'
    }
      
    function rescheduleContentFormatter(json){
      var ul = []
      ul.push(
          'These values are an example.'
      );
      ul.push(
        'Makespan: ' + d3.util.numberWithCommas(json.makespan) + ' ('+ (
        (json.makespan >= project.stat.makespan) ? ('+' + (json.makespan - project.stat.makespan)) : json.makespan - project.stat.makespan
         ) + ')'
      );


      ul.push(
        'Utilization: ' + d3.util.decimalFormat(json.util * 100, 1) + '% ('+ (
        (json.util >= project.stat.utilization) ? ('+' + d3.util.decimalFormat(100 * (json.util - project.stat.utilization), 3)) :
              d3.util.decimalFormat((json.util - project.stat.utilization) * 100, 3)
         ) + '%)'
      );

      return '<ul><li>'+ul.join('</li><li>')+'</li></ul>'
    }


    function view(g, focused, svg, id, isMain, defs, isLastContainer)
    {
      reschedulable = isLastContainer && isMain;
      marginLeft = d3.dynamic.timeXMarginLeft(width, height, focused);
      marginRight = d3.dynamic.timeXMarginRight(width, height, focused);
      popover.offset(d3.util.$$(svg).position());
      timeX.range([marginLeft, width - marginRight]);
      x.range([marginLeft, width - marginRight]);
      timeAxis.height(height);
      timeAxis.ticks(d3.dynamic.ticks(width))
      availableRange = timeAxis.availableRange();
      focusLine.range(availableRange).scale(x);
      y.range(availableRange.reverse());
      currentTimeLine.range(availableRange).scale(x);
      guideLine.range(availableRange);
      
      svgId = id;

      if(focused) {
        project.packages.forEach(function(package){
          var pattern = 
          defs
            .append('pattern')
              .attr('id', svgId + 'stripe' + package.id)
              .attr('width', 32)
              .attr('height', 32)
              .attr('patternUnits', 'userSpaceOnUse')
              .attr('patternTransform', 'rotate(45)')
          pattern
            .append('rect')
              .attr('width', 16)
              .attr('height', 32)
              .attr('transform', 'translate(0,0)')
              .attr('fill', package.color)
          pattern
            .append('rect')
              .attr('width', 16)
              .attr('height', 32)
              .attr('transform', 'translate(16,0)')
              .attr('fill', d3.rgb(package.color).brighter(0.3))
        });
        
        clipCircle = defs  
          .append('clipPath')
            .attr('id', id + 'circle')
            .append('circle')
        
        focusLine.options({
          onDragStart: view.onFocusLineDragStart,
          onDrag: function(){view.onFocusLineDrag(g, focused, svg);},
          onDragEnd: function(){view.onFocusLineDragEnd(g, focused, svg);}
        });
      }
      
      g
        .append('g')
        .call(timeAxis)
        .style('font-size', d3.dynamic.fontSize(width))
      ;
      
      rectG = g.append('g').attr('class', 'rect')
      view.refresh(rectG, focused, svg, !isLastContainer);

      if(focused){
        if(options.aggregationLevel > 1) {
          focusLineCover = g.append('rect').attr('width', width).attr('height', height).style('display', 'none').attr('fill', 'transparent');
          focusLineG = g.append('g').call(focusLine);
          focusLine.set(focusAtTime).style('stroke-width', '2px').style('opacity', 0.8);
          
          timeMarkerG = g.append('g').call(timeMarker);
          timeMarker.set(focusAtTime);
        } else {
          focusLineG = g.append('g').call(focusLine);
          focusLine.set(focusAtTime).style('stroke-width', '2px').style('opacity', 0.8);
          timeMarkerG = g.append('g').call(timeMarker);
          timeMarker.set(focusAtTime);


        }
        
        g.call(currentTimeLine);
        g.call(currentTimeMarker);
        
        if(filteredTime[0] <= System.getCurrentTime().getTime() && System.getCurrentTime().getTime() < filteredTime[1]) {
          currentTimeLine.set(System.getCurrentTime().getTime()).setVisibility(isCurrentTimeVisible);
          currentTimeMarker.set(System.getCurrentTime().getTime()).setVisibility(isCurrentTimeVisible);
        }

       g.call(guideLine);
        svg.on('mousemove', view.onMouseMove);
        
        if(taskG) taskG.remove();
        taskG = g.append('g').style('display', 'none').attr('clip-path', url(id + 'circle'));

      }
        resourceLabels =
        g
          .append('g')
          .selectAll('.resource-type-name')
          .data(filteredResourceTypes)
          .enter()
          .append('text')
            .attr('class', 'resource-type-name')
            .text(function(rt){return rt.getName();})
            .attr('transform', function(rt){
              return translate(marginLeft - 5, 
                d3.min(filter.getResourcesFromResourceType(rt).map(y))
              );
            })
            .attr('dy', focused ? '0.8em' : '1.5em')
            .attr('display', function(rt){
              return filter.getResourcesFromResourceType(rt).length > 0 ? 'inline' : 'none';
            })
            .style('font-size', focused ? '1.5em' : '0.4em');
        ;
 
      enableExploreMode(g, focused, svg);
    }

    view.refresh = function(g, focused, svg){
      if(options.aggregationLevel >= 2) {
        dirty = false;
        aggregated = aggregate(filteredResources, filteredResourceTypes, focusAtTime, filteredTime);
        y.order(aggregated[1]);
        aggregated = aggregated[0];
      }

      if(options.aggregationLevel == 3){
        aggregated.forEach(function(aggr){
          aggr.x = x(aggr.x1);
          aggr.y = d3.min(aggr.resources.map(function(r){return y(r);}));
          aggr.height = d3.sum(aggr.resources.map(function(r){return y.bandWidth(r);}));
          aggr.width = x(aggr.x2) - x(aggr.x1);
          if(aggr.width < 0){
          }
        });

        g.select('g.aggrTasks').remove();
        aggrTaskRects = 
        g
          .append('g')
            .attr('class', 'aggrTasks')
            .selectAll('.aggrTask')
            .data(aggregated)
            .enter()
              .append('rect')
              .attr('class', 'aggrTask')
              .attr('transform', transformGetter)
              .attr('height', heightGetter)
              .attr('width', widthGetter)
              .attr('fill', packageColorGetter)
              .style('opacity', opacityGetter)
              .each(function(a){
                a.rect = d3.select(this);
              })
              ; 

        if(focused)
          attachAggrTaskHandlers(g, focused, svg);
      } else if(options.aggregationLevel == 2){
        consTasks.forEach(function(task){
          task.x = x(task.startAtTime);
          task.y = y(task.resource);
          task.width = x(task.endAtTime) - x(task.startAtTime);
          task.height = y.bandWidth();
        });

        g.select('g.consTasks').remove();
        consTaskRects = 
          g 
          .append('g')
            .attr('class', 'consTasks')
            .selectAll('.consTask')
            .data(consTasks)
            .enter()
              .append('rect')
                .attr('class', 'consTask')
                .attr('transform', transformGetter)
                .attr('height', heightGetter)
                .attr('width', widthGetter)
                .attr('fill', packageColorGetter)
                .style('opacity', opacityGetter2)
        if(focused)
          attachConsTaskHandlers(g, focused, svg);
      } else {
        y.sort(sortType);
        g.selectAll('g.resource').remove();
        resourceG = 
        g
          .selectAll('g.resource')
          .data(filteredResources)
          .enter()
          .append('g')
            .attr('transform', function(r){return translate(0, y(r));});
        var taskDrag = d3.behavior.drag()
          .on('drag', view.onTaskDrag)
          .on('dragstart', function(task){view.onTaskDragStart.call(this, task, g, focused, svg)})
          .on('dragend', function(task){view.onTaskDragEnd.call(this, task, g, focused, svg);})
          ;

        
        var temp =         
        resourceG
          .selectAll('.task')
          .data(function(r){return r.tasks;})
          .enter()
            .append('rect')
              .attr('class', 'task')
              .attr('transform', function(t){return translate(x(t.startAtTime), 0);})
              .attr('height', function(t){return y.bandWidth();})
              .attr('width', function(t){return x(t.endAtTime) - x(t.startAtTime);})
              .attr('fill', function(t){return t.package.color})
        if(focused) {
          temp
              .each(function(task){
                task.x = x(task.startAtTime);
                task.y = y(task.resource);
              })
              .on('mouseover', function(task){
                task.x = x(task.startAtTime);
                task.y = y(task.resource);
                task.height = y.bandWidth(task.resource);
                task.width = x(task.endAtTime) - task.x;
                view.onTaskMouseOver.call(this, task, g);
              })
              .on('mouseout', function(task){
                view.onTaskMouseOut.call(this, task, g);
              })
           temp.call(taskDrag);
        }
      }
    }

    view.onMouseMove = function(){
      guideLine.hide();
      manager.handleEvent('focusAt', {at: 0}, window);
    }
   
    function recursiveHighlight(aggr, opacity){
      if(!aggr || !aggr.next || aggr.next.length == 0) return;
      var max = -1, maxAggr = null;
      aggr.next.forEach(function(nextAggr){
        if(nextAggr.resources.length > max) {
          max = nextAggr.resources.length;
          maxAggr = nextAggr;
        }
      });
      maxAggr.rect.style('opacity', (typeof opacity == 'function' ? opacity(maxAggr) :  opacity));
      recursiveHighlight(maxAggr, opacity);
    }

    view.onAggrTaskMouseOver = function(aggr) {
      var r = d3.select(this);
      aggrTaskRects.sort(function(a, b){
        return a == aggr;
      });

      r.attr('fill', url(svgId + 'stripe' + aggr.package.id));
      r.style('stroke-width', '1px').style('stroke', 'black');
      popover
        .show()
        .title(aggrTitleFormatter(aggr))
        .content(aggrContentFormatter(aggr))
        .set(aggr.x + aggr.width / 2, aggr.y, aggr.height);
      aggr.rect.style('opacity', 1);
      recursiveHighlight(aggr, 0.9);
    }

    view.onAggrTaskMouseOut = function(aggr) {
      d3.select(this).attr('fill', aggr.package.color);
      d3.select(this).style('stroke', 'none');
      popover.hide();
      aggr.rect.style('opacity', opacityGetter(aggr));
      recursiveHighlight(aggr, opacityGetter);
    }
   
    view.onAggrTaskRightClick = function(aggr, g, focused, svg){
      svg.select('g g.zoomTasks').remove();
      var tasks = aggr.tasks
            .map(function(consTask){return consTask.tasks;})
            .reduce(function(arr, a){return arr.concat(a);})
            .filter(
              aggr.backward ? 
              function(task){return task.endAtTime <= focusAtTime;} :
              function(task){return task.endAtTime > focusAtTime;}
            )
/*            .filter(function(task){return task.startAtTime >= focusAtTime || task.endAtTime > focusAtTime;})*/,
          taskDrag = d3.behavior.drag()
            .on('drag', view.onTaskDrag)
            .on('dragstart', function(task){view.onTaskDragStart.call(this, task, g, focused, svg)})
            .on('dragend', function(task){view.onTaskDragEnd.call(this, task, g, focused, svg);})

      tasks.forEach(function(task){
        task.x = x(task.startAtTime);
        task.y = y(task.resource);
        task.height = y.bandWidth(task.resource);
        task.width = x(task.endAtTime) - task.x;
      });

      svg
        .select('g')
        .append('g')
        .attr('class', 'zoomTasks')
        .selectAll('.task')
        .data(tasks)
        .enter()
          .append('rect')
          .attr('class', 'task')
          .attr('width', widthGetter)
          .attr('height', heightGetter)
          .attr('transform', transformGetter)
          .attr('fill', taskDefinitionColorGetter)
          .style('stroke-width', '1px')
          .style('stroke', function(task){return task.package.darkColor;})
          .on('mouseover', function(task){view.onTaskMouseOver.call(this, task, g)})
          .on('mouseout', function(task){view.onTaskMouseOut.call(this, task, g);})
          .call(taskDrag)
          ;
      enableFocusMode(g, focused, svg);
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }

    view.onTaskMouseOver = function(task, g) {
      d3.select(this).style('stroke-width', '1px').style('stroke', 'black');
      popover
        .show()
        .title(taskTitleFormatter(task))
        .content(taskContentFormatter(task))
        .set(task.x + task.width / 2, task.y, task.height);

      if(options.aggregationLevel == 3) {
        var d,
            ds = [];
        
        d = task.taskDefinition.prevTaskDefinition;
        while(d){
          ds.push(d);
          d = d.prevTaskDefinition;
        }
        d = task.taskDefinition.nextTaskDefinition;
        while(d){
          ds.push(d);
          d = d.nextTaskDefinition;
        }

        
        /*g
          .append('g')
            .attr('class', 'precedence')
            .selectAll('task.pre')
            .data(ds.map(function(d){return d.tasks;}).reduce(function(a, b){return a.concat(b);}))
            .enter()
            .append('rect')
              .attr('class', 'pre')
              .attr('transform', function(t){return translate(x(t.startAtTime), y(t.resource));})
              .attr('height', function(t){return y.bandWidth();})
              .attr('width', function(t){return x(t.endAtTime) - x(t.startAtTime);})
              .attr('fill', function(t){return t.taskDefinition.color})*/
      }
    }

    view.onTaskMouseOut = function(task, g) {
      popover.hide();
      if(options.aggregationLevel == 1) {
        d3.select(this).style('stroke-width', '0px').style('stroke', 'black');
      }
      else {
//        g.select('g.precedence').remove();
      }
    }
   

/*****************************
    
    Rescheduling


*****************************/

    view.onTaskDragStart = function(task, g, focused, svg){
      isTaskDragging = false;
      if(d3.event.sourceEvent.which === 1 && task.packageId != project.setupPackageId && reschedulable) {
        popover.disable();
        reschedulePopover.hide().enable();
        activeTask = task;

        enableDragMode.call(this, task, g, focused, svg);
        pollTimer.onPoll = function(){
          view.onTaskStay(task, g, focused, svg);
        };
        pollTimer.event = {x:d3.event.sourceEvent.offsetX, y:d3.event.sourceEvent.offsetY};
        pollTimer.start();
        isZoomed = false;
        isTaskDragging = true;
        //for dragging
        if(options.aggregationLevel == 3) {
          svg.selectAll('.task').sort(function(a, b){ // move focused task to the top
            if(a.id != task.id) return -1;
            return 1;
          });
          taskG.selectAll('.task').remove();
          taskRects = 
            taskG
              .selectAll('.task')
              .data(nonSetupFilteredTasks)
              .enter()
                .append('rect')
                  .attr('transform', function(task){return translate(x(task.startAtTime), y(task.resource));})
                  .attr('height', function(task){return y.bandWidth()})
                  .attr('width', function(task){return x(task.endAtTime) - x(task.startAtTime);})
                  .attr('fill', function(task){return task.taskDefinition.color;})
                  .style('stroke-width', '1px')
                  .style('stroke', function(task){return task.package.darkColor;})
        } else {
          d3.select(this).style('opacity', 0);
          fakeTask = 
          g.append('rect')
            .attr('transform', translate(x(task.startAtTime), y(task.resource)))
            .attr('height', y.bandWidth())
            .attr('width', x(task.endAtTime) - x(task.startAtTime))
            .attr('fill', task.package.color)
            .style('stroke', 'black')
            .style('stroke-width', '1px')
        }
      }
    }

    view.onTaskDrag = function(task){
      if(isTaskDragging) {
        task.x += d3.event.dx; //move the focused task
        task.y += d3.event.dy;
        if(options.aggregationLevel == 3) {
          d3.select(this).attr('transform', translate(task.x, task.y));
          if(isZoomed) { // if zoomed, move the circle
            clipCircle.attr('cx', d3.event.x).attr('cy', d3.event.y);
            previewTimer.restart();
          } else {
            pollTimer.restart();
          }
          pollTimer.event = d3.event;
        } else {
          fakeTask.attr('transform', translate(task.x, task.y));
          previewTimer.restart();
        }
      }
    }

    view.onTaskDragEnd = function(task, g, focused, svg){
      if(d3.event.sourceEvent.which === 1 && isTaskDragging) {
        var
          targetResource = findResourceByY(task.y),
          taskIndex = findTaskIndexByX(targetResource, task.x);

        if(isZoomed && (!targetResource.nonSetupTasks[taskIndex] || targetResource.nonSetupTasks[taskIndex].id != task.id)) {
          var sequence = [];
          
          filteredResources.map(function(resource){
            var tasks = resource.tasks.filter(nonSetupTaskFilter).map(taskRescheduleMapper).filter(function(t){return t.id!=task.id;});
            if(resource === targetResource) {
              var mapped = taskRescheduleMapper(task);
              mapped.resourceId = targetResource.id;
              tasks.splice(taskIndex, 0, mapped);
            }
            sequence = sequence.concat(tasks);
          });
          
          /*Backend.reschedule(sequence, function(json){
            options.onRescheduled(json, view, filter);
          });*/

          
          task.x = x(task.startAtTime);
          task.y = y(task.resource);
          d3.select(this).transition().attr('transform', translate(task.x, task.y));
          clipCircle.transition().attr('r', 0);
          taskG.transition().style('opacity', 0).each('end', function(){d3.select(this).style('display', 'none')});
          enablePopover();
          reschedulePopover.disable();
          pollTimer.clear();
          isTaskDragging = false;
        } else { //revert dragged bar
          task.x = x(task.startAtTime);
          task.y = y(task.resource);
          if(options.aggregationLevel == 3) {
            d3.select(this).transition().attr('transform', translate(task.x, task.y));
          } else {
            fakeTask.remove();
            d3.select(this).style('opacity', 1);
          }
          enablePopover();
          reschedulePopover.disable();
          pollTimer.clear();
          enableFocusMode(g, focused, svg);
        }
      }
    }
    
    view.onTaskStay = function(task, g, focused, svg){ 
      var event = pollTimer.event;
      taskG.style('opacity', 0).style('display', 'inline')
        .transition()
          .style('opacity', 1);
      clipCircle.attr('cx', event.x).attr('cy', event.y).attr('r', 0)
        .transition()
          .attr('r', 150);
      isZoomed = true;
      pollTimer.clear();
      
      previewTimer.onPoll = view.onLoadPreview;
      view.onLoadPreview();
      previewTimer.start();
    }

    view.onLoadPreview = function(){
      var task = activeTask,
          targetResource = findResourceByY(task.y);
      if(targetResource == null) return;
      var
          taskIndex = findTaskIndexByX(targetResource, task.x),
          sequence = [],
          minX = x.domain()[0],
          maxX = x.domain()[1],
          popoverX = task.x + task.width / 2
      ;
      if(taskIndex >= 1 && targetResource.nonSetupTasks[taskIndex-1]) {minX = x(targetResource.nonSetupTasks[taskIndex-1].endAtTime);}
      if(targetResource.nonSetupTasks[taskIndex]) {maxX = x(targetResource.nonSetupTasks[taskIndex].startAtTime);}
      if(popoverX < minX)popoverX = minX;
      if(popoverX > maxX)popoverX = maxX;
      
      if(previewTask === task && previewResource === targetResource && previewIndex === taskIndex){ 
        reschedulePopover.show().set(popoverX, y(targetResource));
      } else {
        filteredResources.map(function(resource){
          var tasks = resource.nonSetupTasks.map(taskRescheduleMapper).filter(function(t){return t.id!=task.id;});
          if(resource === targetResource) {
            var t = taskRescheduleMapper(task);
            t.resourceId = resource.id;
            tasks.splice(taskIndex, 0, t);
          }
          sequence = sequence.concat(tasks);
        });
        
        reschedulePopover
          .show()
          .title('Rescheduling ' + task.getName())
          .content(rescheduleContentFormatter({makespan: 4500, util: 0.8}))
          .set(popoverX, y(targetResource));

        /*Backend.reschedule(sequence, function(json){
          previewTask = task;
          previewResource = targetResource;
          previewIndex = taskIndex;
          reschedulePopover
            .show()
            .title('Rescheduling ' + task.getName())
            .content(rescheduleContentFormatter(json))
            .set(popoverX, y(targetResource));
        });*/
      }
    }


/*****************************

   focus line

*****************************/

    view.onFocusLineDragStart = function(){
      focusLineCover.style('display', 'inline');
    }

    view.onFocusLineDrag = function(g, focused, svg){
      focusAtTime = x.invert(d3.event.x);
      view.refresh(rectG, focused, svg);
      timeMarker.set(focusAtTime);
      manager.handleEvent('focusAt', {at: focusAtTime}, window);
    }

    view.onFocusLineDragEnd = function(g, focused, svg){
      focusLineCover.style('display', 'none');
/*      if(aggregationLevel == 3) attachAggrTaskHandlers(g, focused, svg);
      else if(aggregationLevel == 2) attachConsTaskHandlers(g, focused, svg);*/
    }

/****************************
  
   task handlers

****************************/

    function attachAggrTaskHandlers(g, focused, svg) {
      aggrTaskRects
        .on('mouseover', view.onAggrTaskMouseOver)
        .on('mouseout', view.onAggrTaskMouseOut)
        .on('contextmenu', function(aggr){view.onAggrTaskRightClick(aggr, g, focused, svg);})
    }

    function attachConsTaskHandlers(g, focused, svg) {
      consTaskRects
        .on('mouseover', function(aggr){
          d3.select(this).attr('fill', url(svgId + 'stripe' + aggr.package.id));
          popover
            .show()
            .title(consTitleFormatter(aggr))
            .content(consContentFormatter(aggr))
            .set(aggr.x + aggr.width / 2, aggr.y, aggr.height);
        })
        .on('mouseout', function(aggr){
          d3.select(this).attr('fill', aggr.package.color);
          popover.hide();
        })
        .on('contextmenu', view.onConsTaskRightClick)
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
      return 'ScheduleView';
    }

    view.isReferenceLineVisible = function(value){
      if(!arguments.length) return isReferenceLineVisible;
      isReferenceLineVisible = value;
      
      focusLine.setVisibility(isReferenceLineVisible);
      timeMarker.setVisibility(isReferenceLineVisible);
      utilizationMarker.setVisibility(isReferenceLineVisible);
      setupMarker.setVisibility(isReferenceLineVisible);
      return view;
    }

    view.isCurrentTimeVisible = function(value){
      if(!arguments.length) return isCurrentTimeVisible;
      isCurrentTimeVisible = value;

      currentTimeLine.setVisibility(isCurrentTimeVisible);
      currentTimeMarker.setVisibility(isCurrentTimeVisible);
      return view;
    }

    view.highlightFocused = function(value){
      if(!arguments.length) return highlightFocused;
      highlightFocused = value;
      if(options.aggregationLevel == 3){ 
        aggrTaskRects.transition().style('opacity', opacityGetter);
      } else {
        consTaskRects.transition().style('opacity', opacityGetter2);
      }

      return view;
    }

    view.aggregationLevel = function(value){
      if(!arguments.length) return options.aggregationLevel;
      options.aggregationLevel = value;
    }

    view.sortType = function(value){
      if(!arguments.length) return sortType;
      sortType = value;
      y.sort(sortType);
      
      resourceG
        .transition()
        .attr('transform', function(r){return translate(0, y(r))});

      ;

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

    view.class = function(){
      return ScheduleView;
    }

    view.focusAt = function(time, focusAt){
      if(focusAt) {
        guideLine.hide();
      } else {
        guideLine.set(time);
      }
    }

    view.project = function(){
      return project;
    }

    return view;
  }


  return ScheduleView;

});
