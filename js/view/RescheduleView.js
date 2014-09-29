define([
'view/ScheduleView',
'd3', 'util', 'component/axis/TimeAxis', 'component/ReferenceLine', 'component/scale/ResourceScale'
], function(ScheduleView){
  'use strict';

  function RescheduleView(project, manager, filter, options, json) {
    var
        width,
        height,
        filteredTime = filter.getTime(),
        filteredPackages = filter.getPackages(),
        timeX = d3.time.scale().domain([
          new Date(filteredTime[0]),
          new Date(filteredTime[1])
        ]).clamp(true),
        x1 = d3.scale.linear().domain(filteredTime).clamp(true),
        y1 = d3.scale.resource(project).bandPadding(0),
        timeAxis = d3.svg.timeAxis().scale(timeX),
        g1,
        g2,
        svg1,
        svg2,
        project2 = project.rescheduled(json)
    ;
    window.project2 = project2; 
    console.log(project.tasks.length, project2.tasks.length);
    var d = ScheduleView(project2, manager, filter, options);
    var d2 = ScheduleView(project, manager, filter, options);
    

    function view(gs, focused, svgs){
      g1 = gs.filter(function(_, index){return index == 0;});
      g2 = gs.filter(function(_, index){return index == 1;});
      svg1 = svgs.filter(function(_, index){return index == 0;});
      svg2 = svgs.filter(function(_, index){return index == 1;});
      d.width(width / 2).height(height)(g1, focused, svg1);
      d2.width(width / 2).height(height)(g2, focused, svg2);
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

    view.options = function(){
      return options;
    }

    view.type = function(){
      return 'RescheduleView';
    }

    view.x = function(){
      return x1;
    }

    view.composition = function(){
      return {
        panel: 0,
        svgs: [1, 1]
      }
    }
    return view;
  }
  
  return RescheduleView;
});
