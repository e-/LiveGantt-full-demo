define(['d3', 'util'], function(){
  'use strict';
  var translate = d3.util.translate;

  d3.scale.resource = function(resources){
    var 
        range,
        bandPadding,
        sortType = d3.scale.sortType.DEFAULT,
        scale,
        n = resources.length
    ;

    function refresh(sort){ 
      switch(sortType){
        case(d3.scale.sortType.DEFAULT):
          var cloned = resources.slice(0);
          cloned.sort(function(a, b){
            if(a.resourceTypeId === b.resourceTypeId){
              return a.number - b.number;
            }
            return a.resourceTypeId - b.resourceTypeId;
          });
          scale = function(resource){
            return cloned.indexOf(resource) * (range[1] - range[0] - resourceScale.bandPadding()) / n + range[0] + resourceScale.bandPadding();
          };
          break;
        case(d3.scale.sortType.TASK_START_AT):
          var cloned = resources.slice(0);
          cloned.sort(function(a, b){
            if(a.resourceTypeId === b.resourceTypeId) {
              if(a.tasks[0].startAt.getTime() === b.tasks[0].startAt.getTime()){
                return a.tasks[a.tasks.length - 1].endAt - b.tasks[b.tasks.length - 1].endAt;
              }
              return a.tasks[0].startAt - b.tasks[0].startAt;
            } else {
              return a.resourceTypeId - b.resourceTypeId;
            }
          });
          scale = function(resource){
            return cloned.indexOf(resource) * (range[1] - range[0] - resourceScale.bandPadding()) / n + range[0] + resourceScale.bandPadding();
          };
          break;
        case(d3.scale.sortType.TASK_END_AT):
          var cloned = resources.slice(0);
          cloned.sort(function(a, b){
            if(a.resourceTypeId === b.resourceTypeId) {
              if(a.tasks[a.tasks.length-1].endAt.getTime() === b.tasks[b.tasks.length-1].endAt.getTime()){
                return a.tasks[0].startAt - b.tasks[0].startAt;
              }
              return a.tasks[a.tasks.length-1].endAt - b.tasks[b.tasks.length-1].endAt;
            } else {
              return a.resourceTypeId - b.resourceTypeId;
            }
          });
          scale = function(resource){
            return cloned.indexOf(resource) * (range[1] - range[0] - resourceScale.bandPadding()) / n + range[0] + resourceScale.bandPadding();
          };
          break;
        default:
          var cloned = resources.slice(0);
          cloned.sort(sort);
          scale = function(resource) {
            return cloned.indexOf(resource) * (range[1] - range[0] - resourceScale.bandPadding()) / n + range[0] + resourceScale.bandPadding();
          }
      }
    }
    
    function resourceScale(resource){
      return scale(resource);
    }
  
    resourceScale.range = function(value){
      range = value;
      return resourceScale;
    }

    resourceScale.refresh = function(){
      refresh();
      return resourceScale;
    }

    resourceScale.options = function(newRange, newBandPadding){
      range = newRange;
      bandPadding = newBandPadding;
      return resourceScale;
    }
    
    resourceScale.bandWidth = function(){
      return (range[1] - range[0]) / n * (1 - bandPadding);
    };
    
    resourceScale.bandPadding = function(value){
      if(!arguments.length) return (range[1] - range[0]) / n * (bandPadding);
      bandPadding = value;
      return resourceScale;
    }

    resourceScale.sort = function(criterion, sort){
      sortType = criterion;
      refresh(sort);
      return resourceScale;
    }
    
    resourceScale.order = function(order){
      scale = function(resource){
        return (order[resource.id] - 1) * (range[1] - range[0] - resourceScale.bandPadding()) / n + range[0] + resourceScale.bandPadding();
      }
    };
    
    return resourceScale;
  };


});
