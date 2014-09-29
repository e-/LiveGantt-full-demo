define(function(){
  'use strict';

  function ResourceType(id, name, homoSetup, heteroSetup) {
    this.id = id;
    this.name = name;
    this.homoSetup = homoSetup;
    this.heteroSetup = heteroSetup;
    this.resources = [];
  }

  ResourceType.prototype = {
    addResource: function(resource){
      this.resources.push(resource);
    },
    getName: function(){
      return this.name;
    },
    clone: function(){
      return new ResourceType(this.id, this.name, this.homoSetup, this.heteroSetup);
    }
  };
  
  return ResourceType;
});
