define(['d3', 'util'], function(){
  'use strict';
  
  d3.scale.hierarchical = function(project, schema){
   
    var   
        range, 
        scale = function(){return range[0]},
        bandSize = function(){return 10;},
        sortFunc
    ;

    function getSize(elements, schemaKey){
      var 
          size = 0, 
          sc = schema[schemaKey],
          childrenKey = sc.children,
          visibleElements = elements.filter(sc.isVisible)
      ;
      
      visibleElements.forEach(function(element){
        size += sc.size * (1 + sc.padding);
        if(childrenKey)
          size += getSize(element[schema[childrenKey].getter], childrenKey);
      });

      if(visibleElements.length)
        size += sc.padding * sc.size;

      return size;
    }
  
    function getPosition(elements, position, bandSizes, accum, ratio, schemaKey){
      var 
          sc = schema[schemaKey],
          childrenKey = sc.children,
          isVisible = false
      ;
      
      elements.forEach(function(element){
        if(sc.isVisible(element)) {
          isVisible = true;
          accum += sc.size * sc.padding;
          position[element.getName()] = accum * ratio;
          bandSizes[element.getName()] = sc.size * ratio;
          accum += sc.size;
        } else {
          position[element.getName()] = accum * ratio;
          bandSizes[element.getName()] = 0;
        }
        if(childrenKey)
          accum = getPosition(element[schema[childrenKey].getter], position, bandSizes, accum, ratio, childrenKey);
      });

      if(isVisible)
        accum += sc.padding * sc.size;

      return accum;
    }

    function hierarchical(element){
      return scale(element);
    }

    hierarchical.refresh = function(){
      var 
          cloned = project[schema['root'].getter].slice().sort(typeof sortFunc == 'function' ? sortFunc : undefined),
          size = getSize(cloned, 'root'),
          ratio = 1,
          position = {},
          bandSizes = {}
      ;
      if(size > range[1] - range[0] || schema.stretch) ratio = (range[1] - range[0]) / size;
      
      getPosition(cloned, position, bandSizes, 0, ratio, 'root');
      scale = function(element){
        return position[element.getName()] + range[0];
      };
      bandSize = function(element){
        return bandSizes[element.getName()];
      };
    }
    
    hierarchical.range = function(newRange){
      range = newRange;
      return hierarchical;
    };

    hierarchical.bandSize = function(element){
      return bandSize(element);
    }
    
    hierarchical.sort = function(newSortFunc){
      sortFunc = newSortFunc;
      return hierarchical;
    }

    return hierarchical;
  };
});
