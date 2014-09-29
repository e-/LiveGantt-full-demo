define(['component/Popover', 'jquery', 'd3', 'util'
], function(Popover, $){

  var 
      r = 0.4,
      translate = d3.util.translate,
      dateTimeTag = d3.util.dateTimeTag,
      count = 0,
      popover = Popover($('#history-popover'), true)
      ;

  function c(a){
    return a.join(',');
  }

  function Flow(prevView, view){
    var 
        width,
        height,
        actions = {
          'PerformanceView' : {
            'PerformanceView' : timeIndicator,
            'PackageView' : timeIndicator,
            'ScheduleView' : timeIndicator,
            'ResourceView' : timeIndicator
          },
          'PackageView' : {
            'PerformanceView' : timeIndicator,
            'PackageView' : timeIndicator,
            'ScheduleView': timeIndicator,
            'ResourceView' : timeIndicator
          },
          'ResourceView' : {
            'PerformanceView' : timeIndicator,
            'PackageView' : timeIndicator,
            'ScheduleView': timeIndicator,
            'ResourceView' : timeIndicator
          },
          'ScheduleView' : {
            'RescheduleView' : rescheduleIndicator,
            'PerformanceView' : timeIndicator,
            'PackageView' : timeIndicator,
            'ScheduleView': timeIndicator,
            'ResourceView' : timeIndicator
          }
        },
        x1, 
        x2;

    function timeIndicator(g){
      var icon = g.append('g');

      icon
        .append('path')
        .attr('d', 'M384,192C384,85.969,298.031,0,192,0S0,85.969,0,192s85.969,192,192,192S384,298.031,384,192z M192,336 c-79.406,0-144-64.594-144-144S112.594,48,192,48s144,64.594,144,144S271.406,336,192,336z')

      icon
        .append('path')
        .attr('d', 'M497.938,430.063L380.469,312.594c-17.5,27.219-40.656,50.375-67.875,67.875l117.469,117.469c18.75,18.75,49.156,18.75,67.875,0C516.688,479.219,516.688,448.813,497.938,430.063z')

      icon  
        .attr('transform', 'translate('+((x1+x2)/2-5)+', 7) scale(0.03)');

    }

    function rescheduleIndicator(g){
    }

    function titleFormatter(view1, view2) {
      if(view2.rescheduled) { return 'Rescheduling'; }
      var count = 0;
      var f1, f2;
      f1 = view1.filter();
      f2 = view1.nextFilter();
      var t1, t2;
      t1 = f1.getTime(); t2 = f2.getTime();
      if(t1[0] != t2[0] || t1[1] != t2[1]) count ++;
     
      if(f1.getPackages().length != f2.getPackages().length) count ++;
      if(f1.getResources().length != f2.getResources().length) count ++;
    
      return count + ' filtering operation' + (count > 1 ? 's' : '');
    }

    function contentFormatter(view1, view2) {
      if(view2.rescheduled) {return 'Rescheduling'; }
      var li = [];
      var f1, f2;
      f1 = view1.filter();
      f2 = view1.nextFilter();
      var t1, t2, l1, l2;
      t1 = f1.getTime(); t2 = f2.getTime();
      if(t1[0] != t2[0] || t1[1] != t2[1]) {
        li.push('Time filtering is applied.');
      }
      l1 = f1.getPackages().length;
      l2 = f2.getPackages().length;

      if(l1!=l2) {
        li.push((l1-l2) + ' package' + (l1-l2>1?'s are ':' is ') + 'filtered out.');
      }

      l1 = f1.getResources().length;
      l2 = f2.getResources().length;

      if(l1!=l2) {
        li.push((l1-l2) + ' resource' + (l1-l2>1?'s are ':' is ') + 'filtered out.');
      }
      var d1 = new Date(t2[0]), d2 = new Date(t2[1]);
      li.push('visualizing ' + d3.util.intervalReader(t2[1] - t2[0]));
      li.push('from: ' + d3.util.dateTimeTag(d1));
      li.push('&nbsp; &nbsp;to&nbsp;&nbsp;: ' + d3.util.dateTimeTag(d2));
      l1  = f2.getPackages().length;
      li.push('<strong>' +l1+ '</strong> package' + (l1>1?'s are ':'is ') + 'remaining.');
      l1  = f2.getResources().length;
      li.push('<strong>' +l2+ '</strong> resource' + (l1>1?'s are ':'is ') + 'remaining.');
      return '<ul><li>'+li.join('</li><li>')+'</li></ul>';
    }

    function flow(g, svg){
      if(prevView.nextFilter) {
        x1 = prevView.x()(prevView.nextFilter().getTime()[0]);
        x2 = prevView.x()(prevView.nextFilter().getTime()[1]);
        
        if(prevView.type() == 'ResourceView'){
          x2 = width - 3;
        }
      } else {
        x1 = 0;
        x2 = width;
      }

      count++;
      var gradient = 
      svg 
        .append('defs')
          .append('linearGradient')
            .attr('id', 'gradient' + count)
            .attr('x1', '0%')
            .attr('x2', '0%')
            .attr('y1', '0%')
            .attr('y2', '100%')
      ;
      gradient  
        .append('stop')
          .attr('offset', '0%')
          .style('stop-color', '#bbb')
      ;
      gradient
        .append('stop')
          .attr('offset', '30%')
          .style('stop-color', '#ddd')

      gradient  
        .append('stop') 
          .attr('offset', '90%')
          .style('stop-color', '#eee')
      ;
      g
        .append('path')
        .attr('d', 
          'M'+c([x1, 0]) +
          'Q'+c([x1, height * r, x1 / 2, height / 2]) +
          'T'+c([0, height]) +
          'L'+c([width,height]) +
          'Q'+c([width, height * (1-r), (x2+width)/2, height / 2]) +
          'T'+c([x2, 0])+
          'Z')
        .style('fill', 'url(#gradient'+count+')')

      var 
          $svg = d3.util.$$(svg);
      svg
        .on('mouseover', function(){
          var pos = $svg.offset(),
              width = $svg.width(),
              height = $svg.height()
              ;

          popover
            .title(titleFormatter(prevView, view))
            .content(contentFormatter(prevView, view))
            .show().set(pos.left + (x1+x2) / 2 + 15 , pos.top + height / 2);
        })
        .on('mouseout', function(){
          popover.hide();
        })
      actions[prevView.type()][view.type()](svg.append('g'));
    }
    
    flow.width = function(value){
      if(!arguments.length) return width;
      width = value;
      return flow;
    }

    flow.height = function(value){
      if(!arguments.length) return height;
      height = value;
      return flow;
    }

    return flow;
  }

  d3.svg.flow = Flow;

  return Flow;
});
