define([
  'model/ResourceType',
  'model/Resource',
  'model/Package',
  'model/TaskDefinition',
  'model/Task',
  'model/Project'
], function(
  ResourceType,
  Resource,
  Package,
  TaskDefinition,
  Task,
  Project
) {
  'use strict';

  return {
    ResourceType: ResourceType,
    Resource: Resource,
    Package: Package,
    TaskDefinition: TaskDefinition,
    Task: Task,
    Project: Project
  }
});
