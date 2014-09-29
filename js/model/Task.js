define(function(){
  'use strict';

  function Task(id, taskDefinitionId, resourceId, startAt, endAt, setup, project){
    this.id = id;
    this.taskDefinitionId = taskDefinitionId;
    this.resourceId = resourceId;
    this.startAt = startAt;
    this.endAt = endAt;
    this.startAtTime = startAt.getTime();
    this.endAtTime = endAt.getTime();
    this.setup = setup;
    this.setupAt = new Date(startAt.getTime() + setup * 60 * 1000);
    this.setupAtTime = this.setupAt.getTime();
    this.resource = project.resourceById[resourceId];
    this.taskDefinition = project.taskDefinitionById[taskDefinitionId];
    this.package = this.taskDefinition.package;
    this.packageId = this.package.id;
  }

  Task.prototype = {
    clone: function(project) {
      return new Task(this.id, this.taskDefinitionId, this.resourceId, this.startAt, this.endAt, this.setup, project);
    },
    getName: function(){
      return this.taskDefinition.getName();
    }
  }
  
  return Task;
});

