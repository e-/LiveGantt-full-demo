define(function(){
  'use strict';

  function Resource(id, resourceTypeId, number, project) {
    this.id = id;
    this.resourceTypeId = resourceTypeId;
    this.number = number;
    this.resourceType = project.resourceTypeById[resourceTypeId];

    this.tasks = [];
    this.nonSetupTasks = [];
    this.project = project;
  }

  function zeroPad(number){
    return ('000' + number).slice(-3);
  }
  
  Resource.prototype = {
    getName: function(){
      return this.resourceType.name + zeroPad(this.number);
    },
    addTask: function(task){
      this.tasks.push(task);
      if(!this.project.regardChangeoverAsTask || !task.setup)
        this.nonSetupTasks.push(task);
    },
    getPrevAggrTask: function(focusAtTime){
      var
          self = this,
          i, 
          length = self.aggrTasksByPackage.length,
          aggrTask

      for(i=length-1; i>=0; --i){
        aggrTask = self.aggrTasksByPackage[i];
        if(focusAtTime > aggrTask.endAtTime) {
          //사이에 아무것도 없다.
          return {
            focused: false,
            finished: false,
            task: aggrTask
          };
        } else if(aggrTask.startAtTime <= focusAtTime && focusAtTime < aggrTask.endAtTime) {
          return {
            focused: true,
            finished: false,
            task: aggrTask
          }
        }
      }
      return {
        focused: false,
        finished: true,
        task: null
      }
    },
 
    getAggrTask: function(focusAtTime){
      var
          self = this,
          i, 
          length = self.aggrTasksByPackage.length,
          aggrTask

      for(i=0;i<length;++i){
        aggrTask = self.aggrTasksByPackage[i];
        if(focusAtTime < aggrTask.startAtTime) {
          //사이에 아무것도 없다.
          return {
            focused: false,
            finished: false,
            task: aggrTask
          };
        } else if(aggrTask.startAtTime <= focusAtTime && focusAtTime < aggrTask.endAtTime) {
          return {
            focused: true,
            finished: false,
            task: aggrTask
          }
        }
      }
      return {
        focused: false,
        finished: true,
        task: null
      }
    },
    vectorize: function(unitTimespan){
      /*var vector = [], lastEndAt, lastTaskDefinitionId;
      this.tasks.sort(function(a,b){return a.startAt - b.startAt;}).forEach(function(task){
        if(lastEndAt != task.startAt.getTime()) {
          vector.push(0);
          lastTaskDefinitionId = 0;
        }
        if(lastTaskDefinitionId != task.taskDefinitionId) {
          vector.push(task.taskDefinitionId);
          lastTaskDefinitionId = task.taskDefinitionId;
        }
        lastEndAt = task.endAt.getTime();
      });
      return vector;*/
      var 
        startAt = this.project.getStartAt(),
        endAt = this.project.getEndAt(),
        dim = Math.floor((endAt - startAt) / unitTimespan) + 1,
        vector = new Array(dim),
        lastEndIndex = -1,
        lastMaxTask = null,
        lastMaxPortion = -1
      ;
      this.tasks.sort(function(a, b){return a.startAt - b.startAt;});
      
      for(var i=0;i<dim;++i)
        vector[i] = 0;
      this.tasks.forEach(function(task){
        var 
          startIndex = Math.floor((task.startAt - startAt) / unitTimespan),
          endIndex = Math.floor((task.endAt - startAt) / unitTimespan)
        ;

        for(var i=startIndex ;i<=endIndex;++i){
          vector[i] = task.taskDefinitionId;
        }

/*
        if(lastEndIndex >= startIndex) { //이전 것과 겹치면
          if(lastEndIndex >= endIndex) { //맨 마지막 bucket 안에 이번 task가 다 들어가면
            var portion = (task.endAt - task.startAt) / unitTimespan;
            if(lastMaxPortion < portion) {
              lastMaxTask = task;
              lastMaxPortion = portion;
            }
            vector[startIndex] = lastMaxTask.taskDefinitionId;
            lastMaxPortion = -1;
          } else { //아니면
            var portion = ((startIndex + 1) * unitTimespan - (task.startAt - startAt)) / unitTimespan;
            if(lastMaxPortion < portion) {
              lastMaxTask = task;
              lastMaxPortion = portion;
            }
            vector[startIndex] = lastMaxTask.taskDefinitionId;
            lastMaxPortion = -1;
            for(var i = startIndex + 1; i <= endIndex; ++i) {
              vector[i] = task.taskDefinitionId;
            }
          }
        } else { //안겹침
          for(var i = startIndex; i <= endIndex ; ++i) {
            vector[i] = task.taskDefinitionId;
          }
          lastEndIndex = endIndex;
        }*/
      });

      return vector;
    },
    getEndAtTime: function(){
      var len = this.tasks.length;

      return this.tasks[len - 1].endAtTime;
    },
    clone: function(project){
      return new Resource(this.id, this.resourceTypeId, this.resourceNumber, project);
    }
  };

  return Resource;
});
