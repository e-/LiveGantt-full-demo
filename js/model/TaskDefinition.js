define(['d3'], function(){
  'use strict';

  function TaskDefinition(id, packageId, resourceTypeId, degree, prevTaskDefinitionId, nextTaskDefinitionId, isSetup, project){
    this.id = id;
    this.packageId = packageId;
    this.resourceTypeId = resourceTypeId;
    this.degree = degree;
    this.prevTaskDefinitionId = prevTaskDefinitionId;
    this.nextTaskDefinitionId = nextTaskDefinitionId;
    this.isSetup = isSetup;

    this.package = project.packageById[packageId];

    this.resourceType = project.resourceTypeById[resourceTypeId];
    this.package = project.packageById[packageId];
    this.tasks = [];
  }

  TaskDefinition.prototype = {
    getName: function(){
      if(this.isSetup) 
        return 'Changeover';
      return this.resourceType.name + '_' + this.package.name + '_' + this.degree;
    },
    clone: function(project) {
      return new TaskDefinition(this.id, this.packageId, this.resourceTypeId, this.degree, this.prevTaskDefinitionId, this.nextTaskDefinitionId, project);
    },
    addTask: function(task){
      this.tasks.push(task);
    }
  };

  return TaskDefinition;
});
