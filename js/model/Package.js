define(function(){
  'use strict';

  function Package(id, name, isSetup){
    this.id = id;
    this.name = name;
    this.isSetup = isSetup;

    this.taskDefinitions = [];
    this.tasks = [];
  }

  Package.prototype = {
    addTaskDefinition: function(taskDefinition){
      this.taskDefinitions.push(taskDefinition);
    },
    getName: function(){
      return this.name;
    },
    addTask: function(task){
      this.tasks.push(task);
    },
    getStartAt: function(){
      return d3.min(this.tasks.map(function(task){return task.startAt;}));
    },
    getEndAt: function(){
      return d3.max(this.tasks.map(function(task){return task.endAt;}))
    },
    clone: function(){
      return new Package(this.id, this.name);
    }
  };

  return Package;
});
