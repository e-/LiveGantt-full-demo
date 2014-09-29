define(['model', 'System', 'simplify', 'component/Popover',
'd3', 'util', 'component/axis/TimeAxis', 'component/ReferenceLine', 'component/TimeMarker', 'component/Marker', 'component/scale/HierarchicalScale'
], function(Model, System, Simplify, Popover){
  var 
      translate = d3.util.translate,
      wrap = d3.util.timeWrap,
      url = d3.util.url,
      rgb = d3.util.rgb,
      dynamic = {
        marginLeft: function(width){
          return 6 + width / 20;
        },
        marginRight: function(width) {
          return 3 + width / 50;
        },
        packageFontSize: function(height) {
          return Math.floor((0.3 + height / 500) * 10) * 0.1 + 'em'
        },
        taskDefinitionFontSize: function(height){
          return Math.min(Math.floor((0.3 + height / 50) * 10) * 0.1, 0.8) + 'em'
        }
      };

  
  function PackageView(project, manager, filter, options, window) {
    var
        width,
        height,
        filteredTime = filter.getTime(),
        filteredPackages = filter.getPackages(),
        filteredTaskDefinitions = filteredPackages.map(function(t){return t.taskDefinitions}).reduce(function(a,b){return a.concat(b);}),
        visiblePackages = [],
        selectedPackages = [],
        fannedPackages = [],
        timeX = d3.time.scale().domain([
          new Date(filteredTime[0]),
          new Date(filteredTime[1])
        ]).clamp(true),
        x = d3.scale.linear().domain(filteredTime).clamp(true),
        sortType = d3.scale.sortType.DEFAULT,
        timeAxis = d3.svg.timeAxis().scale(timeX),
        packageColors = ['#eff3ff', '#bdd7e7', '#6baed6', '#2171b5'],
        taskDefinitionColors = ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
        schema = {
          root: {
            type: Model.Package,
            getter: 'packages',
            children: 'taskDefinition',
            size: 36,
            padding: 0.05,
            isVisible: function(m){return isVisible(m);}
          },
          taskDefinition: {
            type: Model.TaskDefinition,
            getter: 'taskDefinitions',
            children: null,
            size: 12,
            padding: 0.05,
            isVisible: function(m){return isVisible(m.package) && isFanned(m.package);}
          },
          stretch: true
        },
        y = d3.scale.hierarchical({packages: filteredPackages}, schema).sort(sortType),
        marginLeft,
        marginRight,
        packageG,
        packageLabels,
        packageGradients,
        packageDetails,
        packageEventReceivers,
        packageProgressPaths,
        taskDefinitionG,
        taskDefinitionLables,
        taskDefinitionStockPaths,
        percentY = d3.scale.linear().domain([0, 100]),
        progressLine = d3.svg.line().x(function(d){return x(d.x);}).y(function(d){return percentY(d.percent);}),
        brush,
        brushedDomain,
        brushG,
        editable = true,
        nextFilter,
        currentTimeLine = d3.svg.referenceLine().scale(x),
        currentTimeMarker = d3.svg.timeMarker(x, {className: 'time-marker-2'}),
        guideLine = d3.svg.referenceLine({className: 'guide-line'}).scale(x),
        popover = Popover(window.$root.find('.summary-popover')),
        referenceLine = d3.svg.referenceLine().scale(x),
        timeMarker = d3.svg.timeMarker(x),
        minColor = d3.rgb('#3276b1'),
        zeroColor = d3.rgb(255, 255, 255),
        maxColor = d3.rgb('#ff7f0e')
    ;

    function isVisible(package)
    {
      if(visiblePackages.length == 0) return true;
      return visiblePackages.indexOf(package) >= 0;
    }
    
    function isFanned(package){return fannedPackages.indexOf(package) >= 0;}
    function isSelected(package){return selectedPackages.indexOf(package) >= 0;}
    function pathFinisher(d){return 'L' + (width - marginRight) + ',' + y.bandSize(d);}
    function pathStarter(d){return 'M' + (width - marginRight) + ',' + y.bandSize(d) + 'L0,0';}

    function packageTitleFormatter(package, index) {
      return '<span class="bullet" style="background-color:' + package.color + '"></span> ' + package.getName();
    }

    function packageContentFormatter(package, index){
      return 'Progress: ' + package.progress[index].number + ' / ' + package.count + ' (' + package.progress[index].percent + '%)';
    }

    function taskDefinitionTitleFormatter(taskDefinition, index) {
      return '<span class="bullet" style="background-color:' + taskDefinition.color + '"></span> ' + taskDefinition.getName();
    }

    function taskDefinitionContentFormatter(taskDefinition, index){
      return 'WIP: ' + taskDefinition.stock[index].number + ' / ' + taskDefinition.package.count + ' (' + taskDefinition.stock[index].percent + '%)';
    }

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





    function view(g, focused, svg, id, isMain, defs)
    {
      marginLeft = d3.dynamic.timeXMarginLeft(width, height, focused);
      marginRight = d3.dynamic.timeXMarginRight(width, height, focused);
      timeX.range([marginLeft, width - marginRight]);
      x.range([marginLeft, width - marginRight]);
      timeAxis.height(height);
      timeAxis.ticks(d3.dynamic.ticks(width))
      var availableRange = timeAxis.availableRange();
      y.range(availableRange.reverse()).refresh();
      currentTimeLine.range(availableRange);
      guideLine.range(availableRange);
      referenceLine.range(availableRange);
      
      filteredPackages.forEach(function(package){
        var 
            lg = defs.append('linearGradient').attr('id', id + 'grad' + package.id).attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%').attr('gradientUnits', 'userSpaceOnUse'),
            length = package.deltaProgress.length, 
            prevStop,
            prevOffset, 
            offset,
            grads = [],
            color;

        package.deltaProgress.forEach(function(d, i){
          offset = (x(project.getTimeFromIndex(i - 0.5, project.progressAggrCount * project.unitTimeInterval)) - marginLeft) / (width - marginLeft - marginRight);
          color = d3.util.colorScale(d, package.minDeltaProgress, package.maxDeltaProgress, minColor, zeroColor, maxColor);
/*          if(offset == prevOffset) {
            console.log('qwe');
          } else {*/
            grads.push([offset, color]);
//            console.log(d / package.maxDeltaProgress);
            prevOffset = offset;
//          }
        });
 //       grads.push([offset, color]);
        lg.selectAll('stop').data(grads).enter().append('stop').attr('offset', function(g){return g[0];}).attr('stop-color', function(g){return g[1];});
      });

      filteredTaskDefinitions.forEach(function(taskDefinition){
        var 
            lg = defs.append('linearGradient').attr('id', id + 'grad2' + taskDefinition.id).attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%').attr('gradientUnits', 'userSpaceOnUse'),
            length = taskDefinition.deltaStock.length,
            prevStop,
            prevOffset, 
            offset,
            grads = [],
            color;

        taskDefinition.deltaStock.forEach(function(d, i){
          offset = (x(project.getTimeFromIndex(i, project.progressAggrCount * project.unitTimeInterval)) - marginLeft) / (width - marginLeft - marginRight);
          color = d3.util.colorScale(d, taskDefinition.minDeltaStock, taskDefinition.maxDeltaStock, minColor, zeroColor, maxColor);
          if(offset == prevOffset) {
          } else {
            grads.push([offset, color]);
            prevOffset = offset;
          }
        });
        grads.push([offset, color]);
        lg.selectAll('stop').data(grads).enter().append('stop').attr('offset', function(g){return g[0];}).attr('stop-color', function(g){return g[1];}).attr('stop-opacity', 0.8);
      });
 
      g
        .append('g')
        .call(timeAxis)
        .style('font-size', d3.dynamic.fontSize(width));

      packageG = 
      g
        .selectAll('g.package')
        .data(filteredPackages)
        .enter()
        .append('g')
          .attr('class', 'package')
          .attr('transform', function(package){
            return translate(0, y(package));
          })
          .style('opacity', function(d){return isVisible(d) + 0;});
      ;

      var temp;
      
      packageEventReceivers = 
      packageG
        .append('rect')
        .attr('height', function(package){
          return y.bandSize(package);
        })
        .attr('width', width)
        .style('fill', 'transparent');
      
      if(focused) {
        packageEventReceivers
          .on('click', view.onPackageClick);
      }
      
      packageEventReceivers
        .filter(function(package){return isSelected(package);})
        .style('fill', 'black')
        .style('opacity', 0.15)

      packageLabels = 
      packageG
        .append('text')
        .text(function(package){
          return package.getName();
        })
        .attr('dy', function(package){
          return y.bandSize(package) / 2;
        })
        .attr('dx', marginLeft / 2 - 4)
        .attr('class', 'package-name')
        .style('font-size', dynamic.packageFontSize(height));

      if(focused){ 
        packageLabels
          .on('click', view.onPackageClick);

        packageDetails = 
        packageG
          .append('image')
            .attr('class', 'cp')
            .attr('width', 12)
            .attr('height', 12)
            .attr('xlink:href', './images/zoom.png')
            .attr('transform', function(package){
              return translate(marginLeft - 20, y.bandSize(package) / 2 - 3);
            })
            .on('click', function(package){
              if(fannedPackages.indexOf(package) >= 0)
                Array.remove(fannedPackages, package);
              else
                fannedPackages.push(package);
              view.refresh();
            })
      }
/*      packageGradients = 
      packageG
        .append('rect')
          .attr('width', width - marginLeft - marginRight)
          .attr('height', function(d){return y.bandSize(d);})
          .attr('x', marginLeft)
          .attr('fill', function(d){return url(id + 'grad' + d.id)})
*/
      packageProgressPaths =
      packageG
        .append('g')
          .append('path')
            .attr('class', 'progress-path')
            .attr('d', function(d){
              percentY.range([y.bandSize(d), 0]);
              return progressLine(d.progressZipped) + pathFinisher(d);
            })
            .attr('fill', function(d){return url(id + 'grad' + d.id)})

      taskDefinitionG = 
        g
          .selectAll('g.taskDefinition')
          .data(filteredTaskDefinitions)
          .enter()
          .append('g')
            .attr('class', 'taskDefinition')
            .attr('transform', function(taskDefinition){
              return translate(0, y(taskDefinition));
            })
            .style('opacity', function(d){return isFanned(d.package) + 0;});
      taskDefinitionLabels = 
        taskDefinitionG
          .append('text')
          .attr('dy', function(taskDefinition){return y.bandSize(taskDefinition) / 2;})
          .attr('dx', marginLeft - 5)
          .text(function(taskDefinition){
            return taskDefinition.getName();
          })
          .attr('class', 'task-definition-name')
      
      if(width < 250) 
        taskDefinitionLabels.style('display', 'none');
      taskDefinitionStockPaths = 
      taskDefinitionG
        .append('g')
          .append('path')
            .attr('class', 'stock-path')
            .attr('d', function(d){
              percentY.range([y.bandSize(d), 0]);
              return progressLine(d.stockZipped) + pathFinisher(d);
            })
            .style('fill', function(d){return url(id + 'grad2' + d.id)})
            //.style('fill', '#74c476')
            ;

      if(focused && editable) {
        brush = d3.svg.brush().x(x).on('brush', view.brushed);
        if(brushedDomain)
          brush.extent(brushedDomain);
        brushG = g.append('g')
        temp = 
        brushG
          .attr('class', 'brush')
          .call(brush)
          .selectAll('rect')
            .attr('y', availableRange[0] - 1)
            .attr('height', availableRange[1] - availableRange[0] + 2)
        svg
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
         
      } else if(brushedDomain) {
          g
          .append('g')
          .attr('class', 'brush')
          .append('rect')
            .attr('y', availableRange[0] - 1)
            .attr('height', availableRange[1] - availableRange[0] + 2)
            .attr('x', x(brushedDomain[0]))
            .attr('width', x(brushedDomain[1]) - x(brushedDomain[0]))
      }
      if(focused) {
        g.call(referenceLine);
        g.call(timeMarker);
        svg
          .on('mousemove', view.onMouseMove)
          .on('mouseout', view.onMouseOut)
      }
      g.call(currentTimeLine);
      g.call(currentTimeMarker);
      g.call(guideLine);
      updateCurrentTimeLine();
    }
    
    view.onPackageClick = function(package){
      if(!editable) return false;
      if(isSelected(package)) {
        view.unselect(package);
      } else {
        view.select(package);
      }
    }

    view.brushed = function(){
      brushedDomain = brush.empty() ? null : brush.extent();
    }

    view.oncontextmenu = function(){
      var filtered = false;
      
      nextFilter = filter.clone();
      if(!brush.empty()) {
        filtered = true;
        nextFilter.setTime(brush.extent());
      }
      var selected = [];
      if(selectedPackages.length > 0) selected = selectedPackages;
      else if(selectedPackages.length == 0 && visiblePackages.length != filteredPackages.length) selected = visiblePackages;
      if(selected.length > 0) {
        filtered = true;
        nextFilter.setPackages(selected);
      }
      if(filtered) {
        options.onFiltered(view, nextFilter);
      }
    }
    
    view.onMouseMove = function(){
      guideLine.hide();
      manager.handleEvent('focusAt', {at: x.invert(d3.event.offsetX)}, window);
      if(!options.isReferenceLineVisible)
        return;

      //identify package
      var px = d3.event.offsetX, py = d3.event.offsetY, pointed;
      var focusAtTime = Math.floor(x.invert(px)), index = project.getIndex(focusAtTime);
    
      if(px < marginLeft || px > width - marginRight) {
        popover.hide();
        return;
      }

      filteredPackages.forEach(function(package){
        if(y(package) <= py && py <= y(package) + y.bandSize(package)) 
          pointed = package;
      });
      filteredTaskDefinitions.forEach(function(taskDefinition){
          if(pointed)return;
          if(y(taskDefinition) <= py && py <= y(taskDefinition) + y.bandSize(taskDefinition))
            pointed = taskDefinition;
      });
     
      if(pointed) {
        percentY.range([y(pointed) + y.bandSize(pointed), y(pointed)]);
        if(pointed instanceof Model.Package) {
          popover 
            .show()
            .title(packageTitleFormatter(pointed, index))
            .content(packageContentFormatter(pointed, index))
            .set(x(focusAtTime), percentY(pointed.progress[index].percent), 0);
        } else {
          popover
            .show()
            .title(taskDefinitionTitleFormatter(pointed, index))
            .content(taskDefinitionContentFormatter(pointed, index))
            .set(x(focusAtTime), percentY(pointed.stock[index].percent), 0)
        }
      } else {
        popover.hide();
      }
      
      referenceLine.set(focusAtTime);
      timeMarker.set(focusAtTime);
    }
    
    view.onMouseOut = function(){
      popover.hide();
      referenceLine.hide();
      timeMarker.hide();
    }

    view.refresh = function(){
      y.refresh();
      packageG
        .transition()
        .attr('transform', function(package){return translate(0, y(package));})
        .style('opacity', function(d){return isVisible(d) + 0;});
      packageEventReceivers
        .transition()
        .style('opacity', function(package){
          return package.selected * 0.15;
        })
        .attr('height', function(package){
          var last = package.taskDefinitions[package.taskDefinitions.length-1];
          return y(last) - y(package) +  y.bandSize(last) * 1.05;
        });


      packageProgressPaths
        .attr('d', function(d){
          percentY.range([y.bandSize(d), 0]);
          return progressLine(d.progressZipped) + pathFinisher(d);
        })

      packageLabels
        .transition()
        .attr('dy', function(package){return y.bandSize(package) / 2;})
        .style('opacity', function(package){
          return isVisible(package) + 0;
        });
      packageDetails
        .transition()
        .attr('transform', function(package){return translate(marginLeft - 20, y.bandSize(package) / 2 - 3);})
        .style('opacity', function(package){
          return isVisible(package) + 0;
        });
      
      taskDefinitionG
        .transition()
        .attr('transform', function(taskDefinition){return translate(0, y(taskDefinition));})
        .style('opacity', function(d){
          return isFanned(d.package) + 0;
        })

      taskDefinitionStockPaths
        .attr('d', function(d){
          percentY.range([y.bandSize(d), 0]);
          return progressLine(d.stockZipped) + 'L'+x.range()[1]+',' + y.bandSize(d);
        });

      taskDefinitionLabels
        .style('font-size', function(taskDefinition){
          return dynamic.taskDefinitionFontSize(y.bandSize(taskDefinition));
        })
        .transition()
        .attr('dy', function(taskDefinition){return y.bandSize(taskDefinition) / 2;})
        .style('opacity', function(taskDefinition){
          return (isVisible(taskDefinition.package) && isFanned(taskDefinition.package)) + 0;
        });
    }

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
    
    view.nextFilter = function(){
      return nextFilter;
    }

    view.options = function(){
      return options;
    }

    view.type = function(){
      return 'PackageView';
    }

    view.x = function(){
      return x;
    }

    view.isReferenceLineVisible = function(value){
      if(!arguments.length) return options.isReferenceLineVisible;
      options.isReferenceLineVisible = value;
      return view;
    }

    view.isCurrentTimeVisible = function(value){
      if(!arguments.length) return options.isCurrentTimeVisible;
      options.isCurrentTimeVisible = value;
      updateCurrentTimeLine();
      return view;
    }
    
    view.class = function(){
      return PackageView;
    }

    view.packages = function(){
      return filter.getPackages();
    }

    view.setVisible = function(package){
      visiblePackages.push(package);
      if(!isFanned(package))
        fannedPackages.push(package);
    }

    view.setInvisible = function(package){
      Array.remove(visiblePackages, package);
      if(isFanned(package))
        Array.remove(fannedPackages, package);
    }

    view.select = function(package) {
      selectedPackages.push(package);
      packageEventReceivers.filter(function(t){return t.id === package.id;})
        .style('fill', 'black')
        .style('opacity', 0.15)
    }

    view.unselect = function(package) {
      Array.remove(selectedPackages, package);
      packageEventReceivers.filter(function(t){return t.id === package.id;})
        .style('fill', 'transparent');
    }

    view.unselectInvisible = function(){
      filteredPackages.forEach(function(package){
        if(!isVisible(package))
          view.unselect(package);
      });
    }

    view.editable = function(v){
      editable = v;
      /*if(editable) {
        if(brushG) brushG.style('display', 'inline');
      } else {
        if(brushG) brushG.style('display', 'none');
      }*/
    }

    view.composition = function(){
      return {
        panel: 200,
        svgs: [1]
      }
    }

    view.focusAt = function(time){
      if(time) {
        guideLine.set(time);
      }
    }
    
    view.finalize = function(){
      popover.hide();
    }

    view.project = function(){
      return project;
    }

    return view;
  }
  
  return PackageView;
});
